"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/src/lib/money";
import { getSupabaseBrowserClient } from "@/src/lib/supabase/browser";

export type AdminOrderItem = { item_name_snapshot: string; quantity: number; unit_price_snapshot: number; currency_snapshot: string };
export type AdminWhatsappRecord = { id: string; prepared_at: string; prepared_by: string; sent_at: string | null; sent_by: string | null };
export type AdminOrderRecord = {
  id: string; order_number: string; order_type: "BOOK" | "JEWELRY"; customer_name: string; phone_e164: string; country_iso: string;
  email: string | null; total_amount: number; currency: string; payment_status: "PENDING" | "PAID" | "REJECTED" | "REFUNDED";
  status: "OPEN" | "COMPLETED" | "CANCELLED"; created_at: string; paid_at: string | null;
  items: AdminOrderItem[];
  delivery: { id: string; created_at: string; created_by: string; revoked_at: string | null; downloaded_count: number; max_downloads: number; expires_at: string | null } | null;
  messages: AdminWhatsappRecord[];
};

type ValidationResult = { order_number: string; delivery_id: string; payment_status: "PAID"; access_code: string; access_link: string; generated_by_user_id: string; generated_at: string };
type PreparedResult = { message_id: string; order_number: string; recipient_e164: string; recipient_name: string; access_code: string; access_link: string; message: string; whatsapp_url: string; prepared_by_user_id: string; code_generated_by_user_id: string; code_generated_at: string };
type CopyFeedback = { kind: "success" | "error"; message: string };
type ActionState = { busy?: boolean; error?: string; validation?: ValidationResult; prepared?: PreparedResult; sentBy?: string; sentAt?: string; revoked?: boolean; copyFeedback?: { code?: CopyFeedback; link?: CopyFeedback } };

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

export function AdminOrdersManager({ orders }: { orders: AdminOrderRecord[] }) {
  const router = useRouter();
  const [actions, setActions] = useState<Record<string, ActionState>>({});
  function update(orderId: string, patch: ActionState) { setActions((current) => ({ ...current, [orderId]: { ...current[orderId], ...patch } })); }

  function updateCopyFeedback(orderId: string, field: "code" | "link", feedback: CopyFeedback) {
    setActions((current) => ({
      ...current,
      [orderId]: {
        ...current[orderId],
        copyFeedback: { ...current[orderId]?.copyFeedback, [field]: feedback },
      },
    }));
  }

  async function copyAccessValue(orderId: string, field: "code" | "link", value: string) {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      updateCopyFeedback(orderId, field, { kind: "success", message: field === "code" ? "Code d’accès copié dans le presse-papiers." : "Lien personnel copié dans le presse-papiers." });
    } catch {
      updateCopyFeedback(orderId, field, { kind: "error", message: field === "code" ? "Impossible de copier le code d’accès. Autorisez l’accès au presse-papiers puis réessayez." : "Impossible de copier le lien personnel. Autorisez l’accès au presse-papiers puis réessayez." });
    }
  }

  async function prepareMessage(orderId: string) {
    const client = getSupabaseBrowserClient();
    if (!client) { update(orderId, { error: "Supabase n’est pas configuré." }); return; }
    update(orderId, { busy: true, error: "" });
    const { data, error } = await client.functions.invoke("prepare-whatsapp", { body: { order_id: orderId } });
    if (error || !data?.message_id || !data?.whatsapp_url) {
      update(orderId, { busy: false, error: "L’accès existe, mais le message WhatsApp n’a pas pu être préparé. Réessayez." });
      return;
    }
    update(orderId, { busy: false, prepared: data as PreparedResult, error: "" });
    router.refresh();
  }

  async function validatePayment(orderId: string) {
    const client = getSupabaseBrowserClient();
    if (!client) { update(orderId, { error: "Supabase n’est pas configuré." }); return; }
    update(orderId, { busy: true, error: "", validation: undefined, prepared: undefined });
    const { data, error } = await client.functions.invoke("validate-payment", { body: { order_id: orderId } });
    if (error || !data?.delivery_id || !data?.access_code || !data?.access_link) {
      update(orderId, { busy: false, error: "Le paiement n’a pas été validé. Vérifiez le fichier maître, les secrets et le statut réel du paiement." });
      return;
    }
    const validation = data as ValidationResult;
    update(orderId, { busy: true, validation, error: "" });
    const { data: prepared, error: prepareError } = await client.functions.invoke("prepare-whatsapp", { body: { order_id: orderId } });
    update(orderId, {
      busy: false,
      validation,
      prepared: !prepareError && prepared?.message_id ? prepared as PreparedResult : undefined,
      error: prepareError ? "Paiement validé et accès créé. Le message WhatsApp n’a pas encore été préparé; réessayez avec le bouton ci-dessous." : "",
    });
    router.refresh();
  }

  function confirmAndValidatePayment(orderId: string) {
    if (!window.confirm("Karidja doit avoir vérifié le paiement réel avant de continuer. Confirmer crée l’accès au téléchargement numérique pour cette commande. Continuer ?")) return;
    void validatePayment(orderId);
  }

  async function markSent(orderId: string, messageId: string) {
    const client = getSupabaseBrowserClient();
    if (!client) { update(orderId, { error: "Supabase n’est pas configuré." }); return; }
    update(orderId, { busy: true, error: "" });
    const { data, error } = await client.functions.invoke("mark-whatsapp-sent", { body: { message_id: messageId } });
    if (error || !data?.sent) { update(orderId, { busy: false, error: "L’envoi manuel n’a pas pu être consigné." }); return; }
    update(orderId, { busy: false, sentBy: data.sent_by_user_id as string, sentAt: data.sent_at as string, error: "" });
    router.refresh();
  }

  async function revoke(orderId: string, deliveryId: string) {
    if (!window.confirm("Révoquer immédiatement le lien et le code de cette commande ? Le client ne pourra plus télécharger le livre.")) return;
    const client = getSupabaseBrowserClient();
    if (!client) { update(orderId, { error: "Supabase n’est pas configuré." }); return; }
    update(orderId, { busy: true, error: "" });
    const { data, error } = await client.functions.invoke("revoke-delivery", { body: { delivery_id: deliveryId } });
    if (error || !data?.revoked) { update(orderId, { busy: false, error: "L’accès n’a pas pu être révoqué." }); return; }
    update(orderId, { busy: false, revoked: true, prepared: undefined, error: "" });
    router.refresh();
  }

  return (
    <section className="admin-list" aria-labelledby="orders-list-title">
      <h2 id="orders-list-title" className="display">Commandes enregistrées</h2>
      {orders.length === 0 ? <p className="notice">Aucune commande réelle n’a encore été reçue.</p> : orders.map((order) => {
        const state = actions[order.id] ?? {};
        const deliveryRevoked = state.revoked || Boolean(order.delivery?.revoked_at);
        const visibleCode = state.prepared?.access_code ?? state.validation?.access_code;
        const visibleLink = state.prepared?.access_link ?? state.validation?.access_link;
        return (
          <article className="admin-order-card" key={order.id}>
            <div className="admin-order-heading">
              <div><span className="eyebrow">{order.order_type === "BOOK" ? "Livre numérique" : "Bijoux"} · {order.payment_status}</span><h3>{order.order_number}</h3></div>
              <span className="muted">Reçue le {formatDate(order.created_at)}</span>
            </div>
            <div className="admin-order-details">
              <div><strong>Client</strong><span>{order.customer_name}</span><a href={`https://wa.me/${order.phone_e164.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{order.phone_e164} ({order.country_iso})</a>{order.email && <span>{order.email}</span>}</div>
              <div><strong>Total enregistré</strong><span>{formatPrice(order.total_amount, order.currency)}</span><span>État : {order.status}</span>{order.paid_at && <span>Paiement vérifié : {formatDate(order.paid_at)}</span>}</div>
              <div className="order-lines"><strong>Articles</strong>{order.items.length ? order.items.map((item, index) => <span key={`${item.item_name_snapshot}-${index}`}>{item.item_name_snapshot} × {item.quantity} · {formatPrice(item.unit_price_snapshot, item.currency_snapshot)}</span>) : <span className="muted">Aucun détail d’article retourné.</span>}</div>
            </div>

            {order.order_type === "BOOK" && order.payment_status === "PENDING" && order.status !== "CANCELLED" && (
              <div className="admin-actions-block"><p className="notice">Vérifiez le paiement réellement reçu avant de continuer. La confirmation crée l’accès et le PDF personnalisé; elle ne prélève aucun paiement.</p><button className="button" type="button" disabled={state.busy} onClick={() => confirmAndValidatePayment(order.id)}>{state.busy ? "Vérification…" : "Confirmer le paiement et générer code/lien"}</button></div>
            )}

            {order.order_type === "BOOK" && order.payment_status === "PAID" && order.delivery && (
              <div className="admin-access-panel">
                <h4>Accès du livre</h4>
                <p>Code créé le {formatDate(order.delivery.created_at)} par le compte administrateur <code>{order.delivery.created_by}</code>.</p>
                <p>Téléchargements réalisés : {order.delivery.downloaded_count} / {order.delivery.max_downloads}{order.delivery.expires_at ? ` · Expire le ${formatDate(order.delivery.expires_at)}` : " · aucune date d’expiration définie"}</p>
                {deliveryRevoked ? <p className="form-error">Accès révoqué. Le lien et le code ne sont plus utilisables.</p> : (
                  <div className="admin-actions">
                    <button className="button button-whatsapp" type="button" disabled={state.busy} onClick={() => void prepareMessage(order.id)}>{state.busy ? "Préparation…" : "Préparer / réafficher le message WhatsApp"}</button>
                    <button className="button button-danger" type="button" disabled={state.busy} onClick={() => void revoke(order.id, order.delivery!.id)}>Révoquer l’accès</button>
                  </div>
                )}
              </div>
            )}

            {visibleCode && visibleLink && !deliveryRevoked && (
              <div className="access-generated" aria-live="polite">
                <strong>Accès client — visible uniquement dans cette session admin</strong>
                {state.validation && <p>Code généré le {formatDate(state.validation.generated_at)} par le compte administrateur <code>{state.validation.generated_by_user_id}</code>.</p>}
                {state.prepared && <p>Ce code a été créé le {formatDate(state.prepared.code_generated_at)} par le compte administrateur <code>{state.prepared.code_generated_by_user_id}</code>.</p>}
                <p>Code : <code className="access-code">{visibleCode}</code></p>
                <p>Lien personnel : <a className="text-link" href={visibleLink} target="_blank" rel="noopener noreferrer">Ouvrir le lien de téléchargement</a></p>
                <div className="admin-actions">
                  <button className="button button-secondary" type="button" onClick={() => void copyAccessValue(order.id, "code", visibleCode)}>Copier le code</button>
                  <button className="button button-secondary" type="button" onClick={() => void copyAccessValue(order.id, "link", visibleLink)}>Copier le lien personnel</button>
                </div>
                <div aria-live="polite">
                  {state.copyFeedback?.code && <p className={state.copyFeedback.code.kind === "success" ? "form-success" : "form-error"} role={state.copyFeedback.code.kind === "success" ? "status" : "alert"}>{state.copyFeedback.code.message}</p>}
                  {state.copyFeedback?.link && <p className={state.copyFeedback.link.kind === "success" ? "form-success" : "form-error"} role={state.copyFeedback.link.kind === "success" ? "status" : "alert"}>{state.copyFeedback.link.message}</p>}
                </div>
                {state.prepared ? <>
                  <p>Message préparé par le compte <code>{state.prepared.prepared_by_user_id}</code> pour {state.prepared.recipient_name} ({state.prepared.recipient_e164}).</p>
                  <label className="field message-preview-label" htmlFor={`message-${order.id}`}>Message prêt à vérifier</label>
                  <textarea id={`message-${order.id}`} className="message-preview" readOnly value={state.prepared.message} />
                  <a className="button button-whatsapp" href={state.prepared.whatsapp_url} target="_blank" rel="noopener noreferrer">Ouvrir WhatsApp avec ce message</a>
                  {!state.sentAt && <button className="button button-secondary" type="button" disabled={state.busy} onClick={() => void markSent(order.id, state.prepared!.message_id)}>J’ai envoyé le message manuellement</button>}
                  {state.sentAt && <p className="form-success">Envoi déclaré manuellement le {formatDate(state.sentAt)} par le compte <code>{state.sentBy}</code>. Cette déclaration n’est pas une vérification fournie par WhatsApp.</p>}
                </> : <button className="button button-whatsapp" type="button" disabled={state.busy} onClick={() => void prepareMessage(order.id)}>{state.busy ? "Préparation…" : "Réessayer la préparation du message"}</button>}
              </div>
            )}

            {order.messages.length > 0 && <details className="audit-details"><summary>Historique WhatsApp ({order.messages.length})</summary><ul>{order.messages.map((message) => <li key={message.id}>Message préparé le {formatDate(message.prepared_at)} par <code>{message.prepared_by}</code>{message.sent_at ? ` · envoyé manuellement déclaré le ${formatDate(message.sent_at)} par ${message.sent_by}` : " · envoi non déclaré"}</li>)}</ul></details>}
            {state.error && <p className="form-error" role="alert">{state.error}</p>}
          </article>
        );
      })}
    </section>
  );
}
