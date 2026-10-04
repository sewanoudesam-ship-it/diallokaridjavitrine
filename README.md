# Maison Karidja

Application Next.js en français. Supabase héberge la base, Auth, Storage et les Edge Functions. Le dépôt GitHub public `sewanoudesam-ship-it/diallokaridjavitrine` est la source reliée au projet Vercel Hobby `maison-karidja`. Le domaine de production est `https://maison-karidja.vercel.app`; le premier déploiement est réussi et l’ancien alias avec suffixe V1 redirige vers celui-ci.

Aucun contenu commercial, visuel, utilisateur administrateur, prix, commande ou avis de démonstration n’est inclus. Karidja renseigne ses livres, ses bijoux, ses prix et ses images authentiques dans l’administration.

## État du déploiement

- Projet Supabase : `wdvqdcluzlimyfuzpwgc` (`https://wdvqdcluzlimyfuzpwgc.supabase.co`).
- Les quatre migrations de `supabase/migrations/` ont été appliquées. Les tables sont vides, RLS est activé et les PDF restent dans des buckets privés.
- Les vues publiques utilisent `security_invoker`; le téléchargement est plafonné à deux accès par livraison.
- Les sept fonctions Edge sont actives avec validation JWT : commandes livre/bijoux, validation de paiement et personnalisation PDF, téléchargement sécurisé, préparation WhatsApp, consignation de l’envoi manuel et révocation.
- Les secrets Edge `CODE_HASH_SECRET`, `CODE_ENCRYPTION_KEY_B64` et `APP_BASE_URL` sont configurés côté Supabase. Les clés HMAC/AES ne figurent pas dans Git ou dans l’environnement frontend. `APP_BASE_URL` pointe maintenant vers `https://maison-karidja.vercel.app`.
- Le fichier local `.env.local` utilise uniquement l’URL et la clé publique/anon Supabase; il est ignoré par Git. N’y ajoutez jamais de clé service-role/secret.

## Variables frontend

Dans le projet Vercel `maison-karidja`, ces variables sont enregistrées pour Production :

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
6. Le projet Vercel Hobby est créé et relié au dépôt GitHub. Le site répond sur `https://maison-karidja.vercel.app`; l’accueil et `/admin/connexion` ont été testés en HTTP 200, et l’ancien alias redirige vers le domaine professionnel.
7. Pour rendre les liens de récupération admin fiables, configurer un SMTP personnalisé et le modèle Recovery selon [la procédure de récupération admin](docs/admin-password-recovery.md). L’URL Auth `/auth/confirm` est déjà autorisée en production; sans SMTP personnalisé, Supabase utilise ses modèles par défaut et limite les e-mails Auth à 2 par heure au total, avec 60 secondes entre demandes de récupération.

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
