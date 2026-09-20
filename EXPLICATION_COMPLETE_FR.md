# SaaS Starter Kit — explication complète de A à Z

## 1. Résumé en une phrase

Ce dépôt est un **squelette d’application SaaS B2B multi-équipes** construit avec Next.js, React, TypeScript, Prisma et PostgreSQL. Il fournit déjà la majorité des briques répétitives d’un produit SaaS : comptes utilisateurs, authentification, équipes, invitations, rôles, SSO d’entreprise, synchronisation d’annuaire SCIM, clés API, webhooks, audit logs, paiements Stripe, emails, métriques et tests end-to-end.

Il faut le voir comme une **base de départ personnalisable**, et non comme un produit métier final. Il fournit l’infrastructure d’un SaaS ; vous devez encore ajouter votre propre domaine fonctionnel, votre marque, vos pages produit et vos règles commerciales.

> Le README contient encore plusieurs références à BoxyHQ : nom, logo, URLs et préfixes. Le dépôt doit donc être rebrandé avant une mise en production.

## 2. Technologies utilisées

| Couche | Technologie | Fonction |
|---|---|---|
| Interface et serveur web | Next.js 15.5 | Pages web, rendu serveur et API routes |
| Interface utilisateur | React 18.3, Tailwind CSS, DaisyUI, `@boxyhq/react-ui` | Formulaires, tableaux, navigation et styles |
| Langage | TypeScript 5.9 | Typage du frontend et du backend |
| Authentification | NextAuth 4.24 | Sessions, OAuth, email magic link et credentials |
| Base de données | PostgreSQL | Utilisateurs, équipes, invitations, abonnements et sessions |
| ORM | Prisma 6.10 | Modèles, requêtes et migrations |
| SSO / SCIM | `@boxyhq/saml-jackson` | SAML, OIDC, OAuth et Directory Sync |
| Paiements | Stripe | Produits, checkout, abonnements et portail client |
| Webhooks sortants | Svix | Création et distribution d’événements aux clients |
| Audit logs | Retraced | Historique des actions dans une équipe |
| Emails | Nodemailer et React Email | Magic links, invitations, vérification et reset password |
| Tests | Jest et Playwright | Tests unitaires et tests navigateur |
| Observabilité | Sentry, OpenTelemetry, Mixpanel, Slack | Erreurs, métriques, analytics et notifications |

Le `package.json` indique la version applicative `1.6.0`. Le port local prévu est `4002`.

## 3. Architecture générale

Le fonctionnement est le suivant :

```text
Navigateur
   |
   v
Pages Next.js + composants React
   |
   v
API Routes /pages/api
   |
   +--> Authentification NextAuth
   +--> Vérification session, équipe et permissions
   +--> Modèles Prisma
   +--> PostgreSQL
   +--> Stripe / Svix / Retraced / Jackson / SMTP
```

### 3.1 Dossiers principaux

| Dossier | Contenu |
|---|---|
| `pages/` | Pages web et endpoints API Next.js |
| `pages/api/` | Backend HTTP : authentification, équipes, SSO, paiements, webhooks, utilisateurs |
| `components/` | Composants React regroupés par fonctionnalité |
| `models/` | Couche d’accès aux données Prisma : utilisateurs, équipes, invitations, abonnements, clés API |
| `lib/` | Services transversaux : auth, RBAC, emails, Stripe, Jackson, métriques, protections |
| `prisma/` | Schéma PostgreSQL, migrations et script de seed |
| `public/` | Images, logos et éléments statiques |
| `locales/` | Traductions et internationalisation |
| `tests/e2e/` | Tests Playwright des parcours importants |
| `scripts/` et fichiers racine | Automatisation, vérifications et tâches administratives |

## 4. Ce que l’application permet de faire

### 4.1 Compte utilisateur

Un utilisateur peut :

- créer un compte ;
- se connecter avec email et mot de passe ;
- se connecter par magic link envoyé par email ;
- se connecter avec GitHub ou Google ;
- se connecter via le fournisseur d’identité SAML/OIDC de son entreprise ;
- confirmer son adresse email ;
- demander une réinitialisation de mot de passe ;
- modifier son nom, son email, son mot de passe et son avatar ;
- voir et fermer ses sessions actives ;
- choisir son thème clair ou sombre ;
- être temporairement bloqué après trop d’échecs de connexion.

### 4.2 Équipes et multi-tenancy

L’application est multi-tenant : une équipe représente généralement une organisation cliente. Un même utilisateur peut appartenir à plusieurs équipes.

Chaque équipe possède :

- un nom ;
- un slug utilisé dans les URLs ;
- éventuellement un domaine d’entreprise ;
- un rôle par défaut pour les nouveaux membres ;
- un identifiant de facturation Stripe ;
- ses membres, invitations, clés API et configurations d’intégration.

Les écrans principaux sont `/teams`, `/teams/[slug]/members`, `/teams/[slug]/settings`, `/teams/[slug]/billing`, `/teams/[slug]/sso`, `/teams/[slug]/directory-sync`, `/teams/[slug]/webhooks`, `/teams/[slug]/api-keys` et `/teams/[slug]/audit-logs`.

### 4.3 Membres, invitations et rôles

Un administrateur peut inviter une personne par email, choisir son rôle, gérer les membres, modifier leurs rôles et les retirer. Une invitation est représentée par un token avec une date d’expiration et peut aussi limiter les domaines autorisés.

Les rôles sont :

| Rôle | Pouvoirs |
|---|---|
| `OWNER` | Tous les pouvoirs sur l’équipe, les membres, SSO, SCIM, audit logs, webhooks, paiements et clés API |
| `ADMIN` | Tous les pouvoirs d’administration sauf les opérations réservées au propriétaire, notamment certains changements vers `OWNER` |
| `MEMBER` | Lecture de l’équipe et possibilité de quitter l’équipe ; pas d’administration |

La sécurité ne repose pas uniquement sur l’interface : les API vérifient également l’appartenance à l’équipe et les permissions RBAC.

### 4.4 SSO d’entreprise

Le module SSO permet à une équipe de configurer une connexion vers un Identity Provider d’entreprise, par exemple Okta, Azure AD, Google Workspace ou un autre fournisseur SAML/OIDC.

Le dépôt contient :

- la gestion des connexions SSO ;
- les flux SAML et OIDC ;
- une page de sélection d’Identity Provider ;
- des endpoints OAuth `authorize`, `token` et `userinfo` ;
- une route de callback SAML ;
- la possibilité de rattacher l’utilisateur connecté à l’équipe correspondante ;
- les routes `.well-known` nécessaires à certaines configurations SAML.

La bibliothèque Jackson peut être embarquée dans l’application avec PostgreSQL ou remplacée par une instance Jackson externe/self-hosted.

### 4.5 Directory Sync et SCIM

Le Directory Sync sert à synchroniser automatiquement les utilisateurs et groupes depuis l’annuaire de l’entreprise cliente.

Le endpoint SCIM est de la forme :

```text
/api/scim/v2.0/[directoryId]/Users
/api/scim/v2.0/[directoryId]/Groups
```

Les opérations reçues peuvent créer, modifier ou supprimer des utilisateurs et groupes. Les événements sont traités par `lib/jackson/dsyncEvents.ts`, puis répercutés dans les membres de l’équipe.

### 4.6 Clés API

Chaque équipe peut créer des clés API nommées, éventuellement expirables. Le dépôt stocke le hash de la clé, et non la clé en clair. Il conserve également la date de dernière utilisation.

Les clés API servent à authentifier des intégrations automatisées. La valeur complète doit normalement être affichée une seule fois à la création.

### 4.7 Webhooks sortants

Une équipe peut enregistrer des endpoints HTTP et sélectionner les types d’événements à recevoir. Svix gère l’application de webhooks, les endpoints, la distribution et les événements.

Les routes couvrent la création, la lecture, la modification et la suppression d’endpoints. Les événements suivis comprennent notamment les invitations, les membres, les équipes, les connexions SSO/SCIM et les webhooks.

### 4.8 Paiements Stripe

Le module Stripe prend en charge :

- la lecture des produits et prix ;
- la création d’une session Checkout ;
- la redirection vers le portail client Stripe ;
- la réception des événements Stripe ;
- la création, mise à jour et suppression d’abonnements locaux.

Le webhook Stripe est `/api/webhooks/stripe`. Les événements importants sont `customer.subscription.created`, `customer.subscription.updated` et `customer.subscription.deleted`.

### 4.9 Audit logs

Retraced peut enregistrer les opérations importantes avec :

- l’acteur ;
- l’équipe ;
- l’action ;
- le type CRUD ;
- la date.

Exemples d’actions : `team.create`, `member.update`, `member.remove`, `sso.connection.create`, `dsync.connection.delete`, `webhook.update`.

### 4.10 Emails, analytics et observabilité

Les emails React Email couvrent les magic links, la vérification de compte, les invitations, la récupération de mot de passe, les emails de bienvenue et le déblocage de compte.

Les intégrations optionnelles sont :

- Mixpanel pour le suivi produit côté navigateur ;
- OpenTelemetry pour des compteurs d’utilisation ;
- Sentry pour les erreurs et performances ;
- Slack pour recevoir une alerte lors d’une nouvelle inscription ;
- Retraced pour l’audit trail.

## 5. Explication de chaque paramètre `.env.example`

Les variables ci-dessous sont l’interface de configuration de l’application. Une variable vide désactive généralement une intégration, tandis que certaines options ont une valeur par défaut.

### 5.1 Adresse de l’application et sessions

| Variable | Fonction |
|---|---|
| `NEXTAUTH_URL` | URL utilisée par NextAuth pour construire les callbacks et URLs d’authentification. En local : `http://localhost:4002`. En production : URL publique HTTPS. |
| `NEXTAUTH_SECRET` | Secret de signature/chiffrement de NextAuth. Il doit être aléatoire, long et différent de la valeur d’exemple. Générez-le avec `openssl rand -base64 32`. |
| `APP_URL` | URL publique principale utilisée par les emails, liens d’invitation, callbacks Jackson et liens applicatifs. |
| `NEXTAUTH_SESSION_STRATEGY` | `jwt` conserve les informations de session dans un JWT ; `database` conserve les sessions dans la table Prisma `Session`. La valeur par défaut est `jwt`. |

**Important :** la valeur `NEXTAUTH_SECRET` présente dans le fichier d’exemple ne doit pas être réutilisée telle quelle en production.

### 5.2 SMTP et emails

| Variable | Fonction |
|---|---|
| `SMTP_HOST` | Nom d’hôte du serveur SMTP. |
| `SMTP_PORT` | Port SMTP, souvent `587` pour STARTTLS ou `465` pour TLS direct. |
| `SMTP_USER` | Utilisateur ou identifiant SMTP. |
| `SMTP_PASSWORD` | Mot de passe, token ou clé SMTP. |
| `SMTP_FROM` | Adresse expéditrice des emails. |

Ces paramètres sont nécessaires pour magic links, invitations, confirmation d’email, réinitialisation du mot de passe et déblocage de compte.

### 5.3 Base de données

| Variable | Fonction |
|---|---|
| `DATABASE_URL` | URL PostgreSQL consommée par Prisma. Exemple : `postgresql://admin:admin@localhost:5432/saas-starter-kit`. |
|

Le `docker-compose.yml` fournit PostgreSQL 16.4 avec l’utilisateur `admin`, le mot de passe `admin`, la base `saas-starter-kit` et le port local `5432`. Ces valeurs conviennent au développement uniquement.

### 5.4 Svix et webhooks

| Variable | Fonction |
|---|---|
| `SVIX_URL` | URL de l’API Svix ; l’exemple pointe vers la région européenne. |
| `SVIX_API_KEY` | Clé d’accès Svix. Sans elle, la fonctionnalité de webhooks ne peut pas fonctionner correctement. |

### 5.5 OAuth GitHub et Google

| Variable | Fonction |
|---|---|
| `GITHUB_CLIENT_ID` | Identifiant public de l’application OAuth GitHub. |
| `GITHUB_CLIENT_SECRET` | Secret privé de l’application OAuth GitHub. |
| `GOOGLE_CLIENT_ID` | Identifiant public OAuth Google. |
| `GOOGLE_CLIENT_SECRET` | Secret privé OAuth Google. |

Les URLs de callback doivent être déclarées dans les consoles GitHub et Google, généralement sous `/api/auth/callback/github` et `/api/auth/callback/google`.

### 5.6 Retraced / audit logs

| Variable | Fonction |
|---|---|
| `RETRACED_URL` | URL du serveur Retraced. Le code ajoute automatiquement `/auditlog`. |
| `RETRACED_API_KEY` | Clé d’accès à Retraced. |
| `RETRACED_PROJECT_ID` | Projet Retraced dans lequel les événements sont enregistrés. |

Si les trois valeurs ne sont pas fournies, l’application n’envoie pas d’audit logs externes.

### 5.7 Affichage, inscription et groupes SSO

| Variable | Fonction |
|---|---|
| `HIDE_LANDING_PAGE` | Si `true`, la landing page est masquée et le visiteur est redirigé vers la connexion. Par défaut : `false`. |
| `GROUP_PREFIX` | Préfixe appliqué aux groupes SSO afin d’éviter les collisions. Avec `boxyhq-admin`, le groupe logique peut être résolu en `admin`. |
| `CONFIRM_EMAIL` | Si `true`, l’utilisateur doit confirmer son email avant d’accéder aux fonctions de l’application. |
| `DISABLE_NON_BUSINESS_EMAIL_SIGNUP` | Si `true`, les domaines d’emails personnels sont refusés à l’inscription selon la liste interne des fournisseurs gratuits. |
| `AUTH_PROVIDERS` | Liste séparée par des virgules des fournisseurs actifs : `github`, `google`, `saml`, `email`, `credentials`, `idp-initiated`. Par défaut : `github,credentials`. |

### 5.8 Jackson : SSO et Directory Sync

Ces variables sont optionnelles si l’instance Jackson est embarquée :

| Variable | Fonction |
|---|---|
| `JACKSON_URL` | URL d’une instance Jackson self-hosted ou SaaS externe. Sa présence active le mode externe. |
| `JACKSON_EXTERNAL_URL` | URL externe visible par les utilisateurs et Identity Providers. Si elle est absente, `JACKSON_URL` est utilisée. |
| `JACKSON_API_KEY` | Clé d’accès à Jackson externe. |
| `JACKSON_PRODUCT_ID` | Identifiant du produit Jackson. Par défaut : `boxyhq`. |
| `JACKSON_WEBHOOK_SECRET` | Secret servant à authentifier les webhooks Directory Sync. |

Le code configure notamment :

- l’issuer SAML `https://saml.boxyhq.com` ;
- le callback SAML `/api/oauth/saml` ;
- le callback OIDC `/api/oauth/oidc` ;
- la sélection d’IdP `/auth/sso/idp-select` ;
- le webhook SCIM `/api/webhooks/dsync`.

### 5.9 Mixpanel et métriques OpenTelemetry

| Variable | Fonction |
|---|---|
| `NEXT_PUBLIC_MIXPANEL_TOKEN` | Token public Mixpanel. S’il est présent, Mixpanel est initialisé dans le navigateur et suit les pages visitées. |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | Endpoint OTLP qui reçoit les métriques. |
| `OTEL_EXPORTER_OTLP_METRICS_HEADERS` | En-têtes d’authentification ou de transport OTLP. |
| `OTEL_EXPORTER_OTLP_METRICS_PROTOCOL` | Protocole OTLP, par exemple `grpc`. |
| `OTEL_EXPORTER_DEBUG` | Option de debug documentée pour diagnostiquer l’exporteur. |
| `OTEL_PREFIX` | Préfixe ajouté aux noms de métriques. Par défaut : `boxyhq.saas`. |

Les compteurs sont envoyés seulement si endpoint, headers et protocole sont tous présents.

### 5.10 Liens légaux et thème

| Variable | Fonction |
|---|---|
| `NEXT_PUBLIC_TERMS_URL` | URL publique des conditions d’utilisation. |
| `NEXT_PUBLIC_PRIVACY_URL` | URL publique de la politique de confidentialité. |
| `NEXT_PUBLIC_DARK_MODE` | Contrôle le thème sombre. Dans le code, toute valeur différente de la chaîne exacte `false` active le mode sombre. |
| `NEXT_PUBLIC_SUPPORT_URL` | URL de support affichée à l’utilisateur. |

### 5.11 Activation des modules d’équipe

| Variable | Fonction |
|---|---|
| `FEATURE_TEAM_SSO` | Active ou désactive le SSO d’équipe. Tout sauf `false` signifie activé. |
| `FEATURE_TEAM_DSYNC` | Active ou désactive Directory Sync/SCIM. |
| `FEATURE_TEAM_AUDIT_LOG` | Active ou désactive l’interface et les fonctions d’audit log. |
| `FEATURE_TEAM_WEBHOOK` | Active ou désactive les webhooks sortants. |
| `FEATURE_TEAM_API_KEY` | Active ou désactive les clés API. |
| `FEATURE_TEAM_DELETION` | Active ou désactive la suppression d’équipe. |
| `FEATURE_TEAM_PAYMENTS` | Active ou désactive les paiements. Le paiement est également désactivé si `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET` manque. |

Attention au comportement : ces flags sont **activés par défaut**. Pour désactiver une fonction, il faut explicitement écrire `false` en minuscules.

### 5.12 reCAPTCHA

| Variable | Fonction |
|---|---|
| `RECAPTCHA_SITE_KEY` | Clé publique envoyée au composant reCAPTCHA du navigateur. |
| `RECAPTCHA_SECRET_KEY` | Clé privée utilisée par le serveur pour vérifier le token auprès de Google. |

Si l’une des deux clés manque, la validation reCAPTCHA est ignorée. Si les deux sont configurées, les requêtes protégées sans token valide sont refusées.

### 5.13 Sentry

| Variable | Fonction |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | DSN public du projet Sentry côté navigateur. |
| `NEXT_PUBLIC_SENTRY_TRACE_SAMPLE_RATE` | Pourcentage d’échantillonnage des traces de performance. `0.0` désactive leur collecte. |
| `SENTRY_RELEASE` | Version publiée associée aux erreurs. |
| `SENTRY_ENVIRONMENT` | Environnement, par exemple `development`, `staging` ou `production`. |
| `SENTRY_URL` | URL Sentry utilisée par le CLI. |
| `SENTRY_ORG` | Organisation Sentry. |
| `SENTRY_PROJECT` | Projet Sentry. |
| `SENTRY_AUTH_TOKEN` | Token CLI permettant notamment d’envoyer les source maps. |

### 5.14 Sécurité et notifications

| Variable | Fonction |
|---|---|
| `MAX_LOGIN_ATTEMPTS` | Nombre maximal d’échecs avant verrouillage du compte. Par défaut : `5`. Le lien de déblocage expire après 7 jours. |
| `SLACK_WEBHOOK_URL` | Webhook Slack recevant notamment une notification de nouvelle inscription. |

### 5.15 Stripe

| Variable | Fonction |
|---|---|
| `STRIPE_SECRET_KEY` | Clé secrète Stripe utilisée côté serveur. |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature du endpoint `/api/webhooks/stripe`. Il empêche de faire confiance à de faux événements Stripe. |

## 6. Schéma de données PostgreSQL

Le fichier `prisma/schema.prisma` définit les tables suivantes.

| Modèle | Rôle |
|---|---|
| `Account` | Compte OAuth lié à un utilisateur : provider, tokens, scopes et identifiant externe. |
| `Session` | Session persistée lorsque la stratégie `database` est utilisée. |
| `VerificationToken` | Tokens de magic link, vérification et déblocage. |
| `User` | Identité, email, mot de passe hashé, avatar et état de verrouillage. |
| `Team` | Organisation cliente, slug, domaine et informations de facturation. |
| `TeamMember` | Relation utilisateur-équipe avec rôle `OWNER`, `ADMIN` ou `MEMBER`. |
| `Invitation` | Invitation avec email, rôle, token, expiration et domaines autorisés. |
| `PasswordReset` | Token temporaire de récupération du mot de passe. |
| `ApiKey` | Clé API d’équipe stockée sous forme de hash. |
| `Subscription` | Abonnement Stripe synchronisé localement. |
| `Service` | Produit ou service vendu dans le catalogue. |
| `Price` | Prix lié à un service : devise, montant, type et metadata. |
| `jackson_store`, `jackson_index`, `jackson_ttl` | Tables techniques utilisées par Jackson ; elles sont marquées `@@ignore` dans Prisma car gérées par l’intégration. |

Les relations importantes sont :

```text
User 1--N TeamMember N--1 Team
User 1--N Account
User 1--N Session
Team 1--N Invitation
Team 1--N ApiKey
Service 1--N Price
```

Les suppressions d’équipe ou d’utilisateur utilisent principalement `onDelete: Cascade`, ce qui supprime automatiquement les relations dépendantes. Cette propriété doit être prise en compte avant toute suppression en production.

## 7. Routes web principales

| Route | Fonction |
|---|---|
| `/` | Landing page ou redirection vers la connexion selon la configuration |
| `/auth/login` | Connexion |
| `/auth/join` | Inscription |
| `/auth/magic-link` | Connexion par lien email |
| `/auth/forgot-password` | Demande de reset password |
| `/auth/reset-password/[token]` | Nouveau mot de passe |
| `/auth/verify-email` | Vérification email |
| `/auth/unlock-account` | Déblocage d’un compte verrouillé |
| `/auth/sso` | Démarrage du SSO |
| `/auth/sso/idp-select` | Sélection de l’Identity Provider |
| `/dashboard` | Tableau de bord après connexion |
| `/settings/account` | Profil, email, nom et avatar |
| `/settings/security` | Mot de passe et sessions |
| `/teams` | Liste et création des équipes |
| `/teams/[slug]/members` | Membres et invitations |
| `/teams/[slug]/settings` | Paramètres de l’équipe |
| `/teams/[slug]/sso` | Configuration SSO |
| `/teams/[slug]/directory-sync` | Configuration Directory Sync |
| `/teams/[slug]/api-keys` | Gestion des clés API |
| `/teams/[slug]/webhooks` | Gestion des webhooks |
| `/teams/[slug]/billing` | Produits, abonnement et portail Stripe |
| `/teams/[slug]/audit-logs` | Journal d’activité |

## 8. Routes API principales

### Authentification

- `/api/auth/[...nextauth]` : endpoints NextAuth.
- `/api/auth/join` : inscription.
- `/api/auth/forgot-password` : création d’un token de récupération.
- `/api/auth/reset-password` : changement du mot de passe.
- `/api/auth/resend-email-token` : renvoi d’un email de vérification.
- `/api/auth/unlock-account` : déblocage.
- `/api/auth/custom-signout` : déconnexion personnalisée.
- `/api/sessions` et `/api/sessions/[id]` : consultation et suppression de sessions.

### Utilisateurs et équipes

- `/api/users` : mise à jour du profil.
- `/api/teams` : lister et créer des équipes.
- `/api/teams/[slug]` : lire, modifier ou supprimer une équipe.
- `/api/teams/[slug]/members` : lister, modifier ou supprimer des membres.
- `/api/teams/[slug]/invitations` : créer, lire, accepter et supprimer des invitations.
- `/api/teams/[slug]/permissions` : exposer les permissions disponibles.

### Intégrations

- `/api/teams/[slug]/sso` : CRUD des connexions SSO.
- `/api/teams/[slug]/dsync` : CRUD des connexions Directory Sync.
- `/api/teams/[slug]/api-keys` : CRUD des clés API.
- `/api/teams/[slug]/webhooks` : CRUD des endpoints Svix.
- `/api/teams/[slug]/payments/products` : produits/prix.
- `/api/teams/[slug]/payments/create-checkout-session` : checkout Stripe.
- `/api/teams/[slug]/payments/create-portal-link` : portail client Stripe.

### Protocoles et callbacks

- `/api/oauth/authorize` : demande OAuth/SAML.
- `/api/oauth/token` : échange d’un code contre un token.
- `/api/oauth/userinfo` : informations de l’utilisateur authentifié.
- `/api/oauth/saml` : traitement SAML.
- `/api/oauth/oidc` : traitement OIDC.
- `/api/scim/v2.0/[...directory]` : API SCIM.
- `/api/webhooks/dsync` : réception des événements Directory Sync.
- `/api/webhooks/stripe` : réception des événements Stripe.
- `/api/well-known/saml.cer` et `/well-known/saml-configuration` : métadonnées SAML.
- `/api/health` : contrôle de disponibilité.

## 9. Sécurité intégrée

Le dépôt comporte plusieurs protections :

1. **Hash des mots de passe** avec `bcryptjs`.
2. **Sessions NextAuth** avec stratégie JWT ou base de données.
3. **Contrôle d’appartenance à l’équipe** sur les routes d’équipe.
4. **RBAC** avec ressources et actions explicites.
5. **Protection des changements de rôle**, par exemple un admin ne peut pas transformer un membre en owner.
6. **Verrouillage de compte** après trop d’échecs.
7. **reCAPTCHA** optionnel sur les flux concernés.
8. **Vérification des signatures de webhooks** Stripe et Directory Sync.
9. **Clés API hashées** et associées à une équipe.
10. **Headers HTTP de sécurité** : HSTS, `X-Frame-Options` et `X-Content-Type-Options`.
11. **CSP optionnelle** via middleware lorsque les headers de sécurité sont activés.
12. **Validation des entrées** avec les schémas Zod présents dans `lib/zod`.
13. **Isolation des connexions SSO/SCIM** : une équipe ne peut pas accéder à la connexion d’une autre équipe.

Une revue de sécurité spécifique reste nécessaire avant production : secrets, cookies, politique CSP, rate limiting, rotation des clés, configuration OAuth, backups PostgreSQL et règles métier propres au produit.

## 10. Commandes du projet

| Commande | Fonction |
|---|---|
| `npm run dev` | Lance Next.js en développement sur le port `4002`. |
| `npm run build` | Génère Prisma, pousse le schéma avec `prisma db push` puis construit Next.js. |
| `npm run start` | Lance le build de production sur le port `4002`. |
| `npm run check-types` | Vérifie TypeScript sans générer de fichiers. |
| `npm run check-format` | Vérifie Prettier. |
| `npm run check-lint` | Vérifie ESLint. |
| `npm run check-unused` | Recherche le code inutilisé avec Knip. |
| `npm run format` | Reformate le code. |
| `npm run test` | Lance Jest. |
| `npm run test:cov` | Lance Jest avec couverture. |
| `npm run test:e2e` | Lance les tests Playwright. |
| `npm run playwright:update` | Installe les navigateurs et dépendances Playwright. |
| `npm run test-all` | Format, lint, types et build. |
| `npm run sync-stripe` | Synchronise les données Stripe via `sync-stripe.js`. |
| `npm run delete-team` | Tâche administrative de suppression d’équipe. |
| `npx prisma studio` | Ouvre l’éditeur visuel de base de données. |
| `npx prisma db push` | Applique le schéma directement à la base. |
| `docker compose up -d` | Démarre PostgreSQL local. |

Pour un environnement de développement :

```bash
cp .env.example .env
# Modifier .env, surtout DATABASE_URL et NEXTAUTH_SECRET
docker compose up -d
npm install
npx prisma db push
npm run dev
```

## 11. Tests présents

Les tests Playwright couvrent notamment :

- connexion SSO initiée par l’IdP ;
- login SSO ;
- sessions ;
- clés API ;
- Directory Sync ;
- membres ;
- paramètres d’équipe.

Les tests ne signifient pas que votre future logique métier sera testée automatiquement. Après personnalisation, ajoutez des tests pour vos abonnements, permissions, limites de plan, facturation, suppression et intégrations.

## 12. Points à personnaliser avant production

1. Remplacer `BoxyHQ`, le logo, le favicon, les URLs et les préfixes par votre marque.
2. Générer un nouveau `NEXTAUTH_SECRET`.
3. Utiliser PostgreSQL managé et des secrets stockés dans un gestionnaire sécurisé.
4. Configurer correctement les domaines OAuth, SMTP, Stripe, Sentry et Jackson.
5. Vérifier les callbacks HTTPS et les signatures de webhooks.
6. Définir vos plans et limites commerciales.
7. Ajouter votre véritable fonctionnalité métier dans `pages/`, `components/`, `models/` et `lib/`.
8. Revoir les rôles et permissions selon votre produit.
9. Configurer les sauvegardes et la restauration PostgreSQL.
10. Tester les migrations et les suppressions en staging.
11. Ajouter du rate limiting et une stratégie de rotation des secrets.
12. Vérifier les messages légaux, la confidentialité, les emails et les URLs de support.

## 13. Conclusion

Le dépôt fournit une **fondation SaaS B2B très riche** : identité, équipes, administration, SSO, SCIM, webhooks, paiements et observabilité sont déjà structurés. Son architecture sépare correctement l’interface (`components`/`pages`), l’API (`pages/api`), les données (`models`/`prisma`) et les services (`lib`).

La prochaine étape logique est de choisir votre produit métier — par exemple CRM, plateforme de formation, outil de gestion, marketplace ou application interne — puis de conserver cette fondation et d’ajouter vos entités, vos écrans et vos règles métier au-dessus.

*Analyse basée sur l’état du dépôt inspecté le 20 septembre 2026, notamment `README.md`, `package.json`, `.env.example`, `prisma/schema.prisma`, `pages/`, `components/`, `models/` et `lib/`.*
