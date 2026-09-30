# Maison Karidja V1 — Rapport de livraison

**Date :** 30 septembre 2026
**Hébergement choisi :** Vercel Hobby, conformément à la demande de Karidja.
**État :** frontend et backend Supabase déployés; projet Vercel créé et relié au dépôt GitHub; premier déploiement de production en attente de déclenchement et de vérification.

## Liens

- **Preview direct du site :** <https://3000-ifbt84l98rks2kf81bt66-7ef9e15f.us4.manus.computer>
- **Preview WebDev intégré :** <https://8328-ifbt84l98rks2kf81bt66-7ef9e15f.us4.manus.computer>
- **Dépôt GitHub public :** <https://github.com/sewanoudesam-ship-it/diallokaridjavitrine>
- **Projet Supabase :** <https://supabase.com/dashboard/project/wdvqdcluzlimyfuzpwgc>
- **Tableau de bord Vercel :** <https://vercel.com/sewanoudesam-ship-its-projects/maison-karidja>
- **Domaine Vercel attribué :** <https://maison-karidja.vercel.app> (aucun déploiement de production pour l’instant)

Les deux URL du site sont des previews temporaires de Sandbox/WebDev; elles peuvent cesser de fonctionner lorsque l’environnement s’arrête. Le domaine Vercel a été attribué, mais ne sert pas encore de trafic tant que le premier déploiement de production n’a pas réussi. L’ancien alias `maison-karidja-v1.vercel.app` redirige en HTTP 307 vers le nouveau domaine.

## Livré

### Frontend

- Application Next.js 16.3.6 en français, identité jaune/blanc, routes publiques boutique/livre/panier/téléchargement/informations légales et espace admin protégé.
- Sélecteur de pays obligatoire pour le numéro WhatsApp, limité aux 12 membres actuels de la CEDEAO et accompagné des drapeaux/indicatifs.
- Aucune image de livre ou bijou fictive : le dossier `public/` ne contient pas de média commercial; le catalogue reste vide en attendant les fichiers publiés par Karidja.
- Le panier et les vues boutique gèrent les états vides; aucun prix, témoignage, client ou commande de démonstration n’a été ajouté.

### Supabase

Projet `wdvqdcluzlimyfuzpwgc` — `https://wdvqdcluzlimyfuzpwgc.supabase.co`.

Quatre migrations sont enregistrées et appliquées dans l’ordre :

1. `20260928234300_initial_schema`
2. `20260928235200_order_creation`
3. `20260929065200_catalog_dashboard`
4. `20260929074500_security_hardening`

Les buckets `public-assets`, `book-originals` et `book-personalized` sont en place; les PDF source/personnalisés demeurent privés. Les vues publiques utilisent `security_invoker` afin que les règles RLS des tables sous-jacentes soient respectées.

Sept fonctions Edge sont actives avec `verify_jwt=true` :

- `create-book-order`
- `create-jewelry-order`
- `validate-payment`
- `download-book`
- `prepare-whatsapp`
- `mark-whatsapp-sent`
- `revoke-delivery`

Les secrets suivants sont configurés côté Supabase; leurs **valeurs ne sont ni dans Git ni dans le frontend** : `CODE_HASH_SECRET`, `CODE_ENCRYPTION_KEY_B64`, `APP_BASE_URL`. Le 30 septembre, `APP_BASE_URL` a été remplacée par `https://maison-karidja.vercel.app`; les autres secrets cryptographiques sont inchangés. Supabase injecte ses variables natives de projet/service aux Edge Functions.

### GitHub

La copie indépendante demandée est publiée sur la branche `main` du dépôt public [diallokaridjavitrine](https://github.com/sewanoudesam-ship-it/diallokaridjavitrine). Le fichier `.env.local`, les valeurs de secrets, `node_modules` et `.next` n’ont pas été copiés. Ce dépôt est une copie publique de source et n’est pas l’origine canonique WebDev.

### Vercel

- Projet `maison-karidja`, créé dans l’espace Hobby et relié à `sewanoudesam-ship-it/diallokaridjavitrine`.
- Domaine attribué : `https://maison-karidja.vercel.app`; Vercel confirme « No Deployment » tant qu’aucun build de production n’a été lancé. L’ancien domaine `maison-karidja-v1.vercel.app` redirige en 307 vers ce domaine.
- Variables Vercel présentes : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publique uniquement) et `NEXT_PUBLIC_SITE_URL` pour Production.
- `NEXT_PUBLIC_SITE_URL` a été mis à jour pour Production vers le nouveau domaine. `APP_BASE_URL` côté Supabase a aussi été remplacée; il reste à déclencher le premier build sur `main`, vérifier ses journaux et sa réponse HTTP, puis confirmer que les liens de livraison et WhatsApp utilisent cette origine.

## Dépendances et alertes GitHub

Après le message d’alerte du dépôt, Vitest a été mis à niveau vers `4.1.11` et PostCSS vers `8.5.28`; l’override pnpm force aussi cette version corrigée pour Vite et le reste de l’arbre. L’audit local final `pnpm audit` rapporte **zéro vulnérabilité connue**.

Le hook de push GitHub a encore affiché « 13 vulnerabilities ». La lecture de la liste Dependabot via l’intégration GitHub a été refusée (`403 Resource not accessible by integration`), donc je ne peux pas confirmer si ce compteur distant est en cours de rafraîchissement ou s’il concerne d’autres alertes. Karidja peut vérifier le statut courant dans [Security → Dependabot alerts](https://github.com/sewanoudesam-ship-it/diallokaridjavitrine/security/dependabot); le lockfile publié est celui ayant passé `pnpm audit` à zéro.

## Vérifications effectuées

- `pnpm typecheck` : réussi.
- `pnpm lint` : réussi.
- `pnpm test` : 6 tests réussis (téléphone CEDEAO et monnaies).
- `pnpm build` : réussi; routes Next.js compilées.
- `pnpm audit` : zéro vulnérabilité connue après la mise à niveau Vitest/PostCSS.
- `.env.local` : ignoré par Git; contient seulement l’URL Supabase et la clé publique/anon frontend, jamais une clé service-role.
- Requêtes locales, directes et via le Preview WebDev : HTTP 200; le manifeste de routes répond en 200.
- Vérification de `download-book` avec un code de format valide mais inexistant : réponse attendue `404` (code/lien introuvable) et CORS autorisé pour le Preview. Aucun téléchargement ou enregistrement client n’a été créé par ce test.
- Les sept fonctions et les quatre migrations ont été relues après déploiement.

## Audit Supabase — points à connaître

- L’audit sécurité ne signale plus les vues `SECURITY DEFINER`; la migration de durcissement les a corrigées.
- Deux avertissements `WARN` restent pour `public.is_admin()` et `public.admin_dashboard_metrics()`, car elles sont des fonctions `SECURITY DEFINER` exécutables par le rôle `authenticated`. Elles ne sont pas exécutables par `anon`/`public`. `is_admin()` ne vérifie que le rôle de l’utilisateur Auth courant et est utilisée par les policies RLS; `admin_dashboard_metrics()` appelle `is_admin()` et lève `ADMIN_REQUIRED` si le rôle manque. Elles sont nécessaires au fonctionnement protégé de l’administration.
  - [Documentation du linter Supabase, règle 0029](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- L’audit performance rapporte 18 index « unused » au niveau INFO. Les tables étant encore vides et sans trafic, ces indexes ne doivent pas être supprimés sur cette seule base; ils servent aux recherches et relations futures.
  - [Documentation du linter Supabase, règle 0005](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)

## État des données — aucun contenu fictif

Vérification des volumes effectuée sans lire de données personnelles :

| Table | Lignes |
| --- | ---: |
| `books` | 0 |
| `products` | 0 |
| `orders` | 0 |
| `digital_deliveries` | 0 |
| `user_roles` | 0 |
| `site_settings` | 0 |

Aucun compte admin n’a été créé, car aucune adresse de compte de Karidja n’a été fournie ou confirmée. Aucun numéro WhatsApp admin, prix, consigne de paiement, adresse professionnelle, donnée légale, livre, PDF ou bijou n’a été inventé.

## Mise en service par Karidja

1. Dans Supabase **Authentication → Users**, créer/inviter le compte réel de Karidja et terminer la vérification de son adresse selon le réglage Auth du projet.
2. Copier son UUID Auth et exécuter dans le SQL Editor Supabase (en remplaçant le marqueur par ce vrai UUID) :

   ```sql
   insert into public.user_roles (user_id, role)
   values ('<UUID_AUTH_DE_KARIDJA>'::uuid, 'admin')
   on conflict (user_id) do update set role = 'admin';
   ```

   Cette instruction n’accorde aucun droit à une autre personne; ne jamais publier l’UUID ou le mot de passe dans Git.
3. Se connecter à `/admin/connexion`, puis renseigner les informations réelles : WhatsApp admin au format E.164, instructions de paiement, e-mail d’assistance et mentions légales.
4. Publier les fiches et prix réels, téléverser uniquement les images de livres/bijoux publiées par Karidja et ajouter le PDF maître du livre dans l’espace privé.
5. À chaque paiement du livre vérifié manuellement, l’administration génère un code individuel et un lien, personnalise le PDF au nom du client et limite le téléchargement à deux fois. Le système prépare le texte WhatsApp vers le client; Karidja l’envoie manuellement et peut enregistrer l’envoi.

## Ce qui reste pour la mise en service complète

- Déclencher le premier déploiement de production depuis `main`, corriger toute erreur de build éventuelle, puis vérifier `https://maison-karidja.vercel.app` en HTTP/HTTPS.
- Confirmer que les liens de livraison sont générés sur `https://maison-karidja.vercel.app`; le secret Supabase `APP_BASE_URL` est déjà réglé sur cette origine. Les appels Edge acceptent déjà les origines `*.manus.computer` pour Preview.
- Les tableaux de bord, commandes, liens de téléchargement et parcours WhatsApp ne peuvent être réellement mis en service pour les clients qu’après création de l’admin et saisie des données commerciales/authentiques par Karidja.

Le fichier `.env.local` local est volontairement exclu des livrables Git. Ne jamais partager une clé `service_role`, un secret de chiffrement ou un mot de passe dans le chat.
