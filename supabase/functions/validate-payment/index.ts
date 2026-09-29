import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { jsonResponse, optionsResponse, originAllowed, readJson, appBaseUrl, serveEdge } from "../_shared/http.ts";
import { encryptSecret, generateAccessCode, generateAccessToken, hashSecret, pdfSafeText } from "../_shared/crypto.ts";
import { requireAdmin } from "../_shared/supabase.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serveEdge(async (request: Request) => {
  if (request.method === "OPTIONS") return optionsResponse(request);
  if (!originAllowed(request)) return jsonResponse(request, { error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (request.method !== "POST") return jsonResponse(request, { error: "METHOD_NOT_ALLOWED" }, 405);

  let uploadedPath: string | null = null;
  let storageClient: Awaited<ReturnType<typeof requireAdmin>>["client"] | null = null;
  try {
    const body = await readJson(request);
    const orderId = typeof body.order_id === "string" ? body.order_id : "";
    if (!UUID_RE.test(orderId)) return jsonResponse(request, { error: "Identifiant de commande invalide." }, 400);
    const appUrl = appBaseUrl();
    const { client, userId } = await requireAdmin(request);
    storageClient = client;

    const { data: order, error: orderError } = await client
      .from("orders")
      .select("id,order_number,order_type,book_id,customer_name,payment_status,status")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) throw new Error("ORDER_LOOKUP_FAILED");
    if (!order || order.order_type !== "BOOK") return jsonResponse(request, { error: "Commande de livre introuvable." }, 404);
    if (order.payment_status !== "PENDING" || order.status === "CANCELLED") {
      return jsonResponse(request, { error: "Cette commande n’est plus en attente de vérification." }, 409);
    }
    const { data: book, error: bookError } = await client
      .from("books")
      .select("id,title,original_pdf_path")
      .eq("id", order.book_id)
      .maybeSingle();
    if (bookError || !book?.original_pdf_path) throw new Error("MASTER_PDF_UNAVAILABLE");

    const code = generateAccessCode();
    const token = generateAccessToken();
    const [codeHash, codeCiphertext, tokenHash, tokenCiphertext] = await Promise.all([
      hashSecret(`code:${code}`), encryptSecret(code), hashSecret(`token:${token}`), encryptSecret(token),
    ]);

    const { data: master, error: downloadError } = await client.storage.from("book-originals").download(book.original_pdf_path);
    if (downloadError || !master) throw new Error("MASTER_PDF_UNAVAILABLE");
    if (master.size > 50 * 1024 * 1024) throw new Error("MASTER_PDF_TOO_LARGE");
    const pdf = await PDFDocument.load(await master.arrayBuffer());
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const accent = rgb(0.78, 0.48, 0.05);
    page.drawText("MAISON KARIDJA", { x: 54, y: 766, size: 18, font, color: accent });
    page.drawText("ACCES NUMERIQUE PERSONNEL", { x: 54, y: 722, size: 14, font });
    page.drawText("Document remis individuellement a :", { x: 54, y: 648, size: 12, font });
    page.drawText(pdfSafeText(order.customer_name), { x: 54, y: 615, size: 18, font });
    page.drawText(`Commande : ${pdfSafeText(order.order_number)}`, { x: 54, y: 574, size: 11, font });
    page.drawText(`Date : ${new Date().toISOString().slice(0, 10)}`, { x: 54, y: 552, size: 11, font });
    page.drawText("Ce document est destine au client identifie ci-dessus.", { x: 54, y: 90, size: 10, font });
    const personalizedPdf = await pdf.save();
    if (personalizedPdf.byteLength > 50 * 1024 * 1024) throw new Error("PERSONALIZED_PDF_TOO_LARGE");

    uploadedPath = `${order.id}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await client.storage.from("book-personalized").upload(uploadedPath, personalizedPdf, {
      contentType: "application/pdf", upsert: false,
    });
    if (uploadError) throw new Error("PERSONALIZED_PDF_UPLOAD_FAILED");

    const { data: result, error: confirmError } = await client.rpc("confirm_book_payment_and_create_access", {
      p_order_id: order.id,
      p_actor_id: userId,
      p_code_hash: codeHash,
      p_code_ciphertext: codeCiphertext,
      p_token_hash: tokenHash,
      p_token_ciphertext: tokenCiphertext,
      p_pdf_storage_path: uploadedPath,
      p_expires_at: null,
    });
    if (confirmError) throw new Error(confirmError.code === "23505" ? "ORDER_ALREADY_PROCESSED" : "PAYMENT_CONFIRMATION_FAILED");
    const row = Array.isArray(result) ? result[0] : result;
    if (!row?.delivery_id || row.order_number !== order.order_number) throw new Error("PAYMENT_CONFIRMATION_FAILED");

    uploadedPath = null;
    return jsonResponse(request, {
      order_number: order.order_number,
      delivery_id: row.delivery_id,
      payment_status: "PAID",
      access_code: code,
      access_link: `${appUrl}/telechargement?token=${encodeURIComponent(token)}`,
      generated_by_user_id: userId,
      generated_at: new Date().toISOString(),
    }, 200);
  } catch (error) {
    if (uploadedPath && storageClient) {
      await storageClient.storage.from("book-personalized").remove([uploadedPath]).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "";
    const status = message === "AUTH_REQUIRED" || message === "AUTH_INVALID" ? 401
      : message === "ADMIN_REQUIRED" ? 403
      : message === "ORDER_ALREADY_PROCESSED" || message === "PAYMENT_CONFIRMATION_FAILED" ? 409
      : message === "REQUEST_TOO_LARGE" ? 413
      : message.startsWith("JSON_") || message.startsWith("INVALID_") ? 400
      : message === "APP_BASE_URL_REQUIRED" || message === "APP_BASE_URL_INVALID" || message.startsWith("CODE_") ? 503
      : 503;
    const publicMessage = status === 401 ? "Reconnectez-vous à l’administration."
      : status === 403 ? "Accès administrateur requis."
      : status === 400 ? "La demande n’est pas valide."
      : status === 413 ? "La demande est trop volumineuse."
      : status === 409 ? "La commande a déjà été traitée ou ne peut plus être validée."
      : "Le paiement n’a pas pu être validé. Vérifiez le fichier maître et la configuration, puis réessayez.";
    return jsonResponse(request, { error: publicMessage }, status);
  }
});
