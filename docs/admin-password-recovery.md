# Récupération du mot de passe admin

## Parcours de l’application

1. Depuis la page admin privée, l’utilisateur choisit **Mot de passe oublié ?**.
2. Il saisit l’adresse de son compte. La réponse reste volontairement générique pour ne pas révéler si cette adresse possède un compte.
3. La page callback retire immédiatement les paramètres sensibles de l’adresse. Elle attend ensuite un clic explicite sur **Confirmer et choisir un nouveau mot de passe** avant de consommer le lien.
4. Après validation par Supabase, le serveur vérifie que la session correspond bien à un compte portant le rôle `admin`, puis ouvre la page de nouveau mot de passe.
5. Si un lien est expiré, invalide, bloqué ou si Auth ne répond pas, l’écran callback propose directement un formulaire pour demander un nouvel e-mail. La page de succès propose également **Demander un autre lien**.
6. Les opérations Auth sont bornées dans le temps; un délai dépassé rend l’action réessayable au lieu de laisser le bouton en chargement indéfini.

## Réglages de production vérifiés le 4 octobre 2026

- Site URL : `https://maison-karidja.vercel.app`.
- URL de redirection autorisée : `https://maison-karidja.vercel.app/auth/confirm`.
- `NEXT_PUBLIC_SITE_URL` de production correspond à l’origine ci-dessus.
- Le tableau Supabase affiche que le SMTP personnalisé n’est pas configuré et que les modèles par défaut sont utilisés.

Le domaine et l’URL de retour sont donc alignés. En revanche, Supabase documente que les liens à usage unique peuvent être ouverts par des scanners de sécurité de messagerie avant l’utilisateur. Le modèle par défaut ne peut pas être personnalisé depuis l’écran actuel; Supabase indique qu’un SMTP personnalisé est requis pour éditer les modèles.

## Action opérationnelle requise pour une livraison fiable

Après avoir choisi et configuré un fournisseur SMTP dans **Supabase → Authentication → Emails → SMTP Settings**, personnaliser le modèle **Reset password** afin qu’il pointe directement vers l’application avec le hash OTP, au lieu de faire consommer le lien sur l’URL de vérification Supabase. Exemple de lien à intégrer au modèle :

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery">
  Confirmer la récupération et choisir un nouveau mot de passe
</a>
```

Pour le modèle **Invite user**, le même callback peut être utilisé avec `type=invite` :

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite">
  Accepter l’invitation et définir mon mot de passe
</a>
```

La page d’application demande ensuite un clic explicite avant d’appeler `verifyOtp`. Garder l’URL `/auth/confirm` autorisée dans **Authentication → URL Configuration**. Ne pas placer le segment admin privé ni une clé Supabase privilégiée dans un modèle e-mail.

> Le code de l’application ne configure pas de compte SMTP et aucun e-mail de test n’a été envoyé pendant ce correctif. La sélection du fournisseur et l’enregistrement de ses identifiants restent à faire avec l’administrateur du projet.

## Limites et reprise

Le diagnostic donne une cause concrète aux demandes répétées bloquées : la documentation Supabase indique qu’avec le SMTP intégré, tous les endpoints d’e-mail Auth partagent un plafond de **2 e-mails par heure**, et qu’un endpoint de récupération impose par défaut **60 secondes entre deux demandes**. Le projet Karidja n’a pas de SMTP personnalisé configuré. Une demande peut donc être acceptée puis une autre bloquée, même si l’utilisateur essaie de récupérer son mot de passe légitimement. L’interface signale maintenant ces limites quand Supabase renvoie un 429; seul un SMTP personnalisé permet de changer le quota d’envoi et d’améliorer la délivrabilité. Après un délai réseau, un e-mail peut tout de même finir par arriver; vérifier aussi les courriers indésirables avant de répéter plusieurs demandes.

## Sources et vérifications

- [Configuration Auth du projet Karidja](https://supabase.com/dashboard/project/wdvqdcluzlimyfuzpwgc/auth/url-configuration) — Site URL et liste de redirection consultés en lecture seule.
- [Modèles d’e-mail Auth du projet Karidja](https://supabase.com/dashboard/project/wdvqdcluzlimyfuzpwgc/auth/templates) — l’interface indiquait l’utilisation des modèles par défaut et demandait un SMTP personnalisé pour les éditer.
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod) — avertissement sur les scanners e-mail qui peuvent consommer les liens Auth à usage unique et sur les limites d’envoi.
- [Personnalisation des modèles e-mail Supabase](https://supabase.com/docs/guides/local-development/customizing-email-templates) — variables `TokenHash`, `SiteURL` et exemples de liens directs.
- [Référence `resetPasswordForEmail`](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) — flux de récupération et `redirectTo`.
