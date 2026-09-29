# Maison Karidja

Application Next.js en français. Supabase héberge la base, Auth, Storage et les Edge Functions. Le dépôt GitHub public `sewanoudesam-ship-it/diallokaridjavitrine` est une copie de source. **Vercel n’est pas utilisé**, à la demande de l’utilisateur; le Preview WebDev actuel est temporaire et ne constitue pas une URL de production durable.

Aucun contenu commercial, visuel, utilisateur administrateur, prix, commande ou avis de démonstration n’est inclus. Karidja renseigne ses livres, ses bijoux, ses prix et ses images authentiques dans l’administration.

## État du déploiement

- Projet Supabase : `wdvqdcluzlimyfuzpwgc` (`https://wdvqdcluzlimyfuzpwgc.supabase.co`).
- Les quatre migrations de `supabase/migrations/` ont été appliquées. Les tables sont vides, RLS est activé et les PDF restent dans des buckets privés.
- Les vues publiques utilisent `security_invoker`; le téléchargement est plafonné à deux accès par livraison.
- Les sept fonctions Edge sont actives avec validation JWT : commandes livre/bijoux, validation de paiement et personnalisation PDF, téléchargement sécurisé, préparation WhatsApp, consignation de l’envoi manuel et révocation.
- Les secrets Edge `CODE_HASH_SECRET`, `CODE_ENCRYPTION_KEY_B64` et `APP_BASE_URL` sont configurés côté Supabase. Les clés HMAC/AES ne figurent pas dans Git ou dans l’environnement frontend. `APP_BASE_URL` et le domaine du Preview sont temporaires jusqu’au choix d’un hébergeur durable.
- Le fichier local `.env.local` utilise uniquement l’URL et la clé publique/anon Supabase; il est ignoré par Git. N’y ajoutez jamais de clé service-role/secret.

## Variables frontend

Pour un déploiement ultérieur sur un hébergeur choisi par Karidja, définir ces variables dans son panneau d’environnement :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publique/anon seulement)
- `NEXT_PUBLIC_SITE_URL` (origine HTTPS réellement utilisée, sans chemin)

Ne jamais créer de variable `NEXT_PUBLIC_*` avec une clé privilégiée. Supabase fournit `SUPABASE_URL` et la clé service-role à l’environnement Edge; cette clé ne doit jamais être copiée dans le frontend ou le dépôt.

## Configuration Supabase et mise en service

1. Les migrations sont numérotées et s’appliquent dans l’ordre avec `supabase/migrations/*.sql`.
2. Le nouveau projet contient les buckets `public-assets` (public, images validées par Karidja), `book-originals` (privé) et `book-personalized` (privé).
3. Les fonctions Edge lisent le numéro WhatsApp du client enregistré et préparent le message `wa.me`; Karidja appuie elle-même sur Envoyer dans WhatsApp. Aucun envoi automatique n’est effectué.
4. Aucun compte admin n’a été inventé ou créé. Créer le compte réel de Karidja dans Supabase Auth, vérifier son UUID, puis lui attribuer explicitement `admin` dans `public.user_roles`; il n’y a ni inscription publique ni attribution automatique.
5. Dans l’administration, renseigner les coordonnées WhatsApp réelles, les consignes de paiement et les informations légales, puis téléverser les fiches et fichiers commerciaux authentiques. Le catalogue reste vide jusqu’à ces saisies.
6. Vercel est explicitement exclu. La copie GitHub est disponible comme source, mais une URL de production permanente nécessite de sélectionner/configurer un hébergeur non-Vercel; le Preview courant est destiné à la validation, pas à la livraison durable.

## Commandes locales

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Les paiements sont vérifiés manuellement; aucun paiement en ligne n’est simulé. Les images doivent être publiées par un compte administrateur de Maison Karidja, et aucune image externe ou fictive n’est prévue.
