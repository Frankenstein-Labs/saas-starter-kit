# Plan de migration — AI Cloud Platform

## Décision d’architecture

Le dépôt existant reste la fondation unique. L’application conserve Next.js, React, TypeScript, Prisma, PostgreSQL, NextAuth, le multi-tenant, RBAC, SSO SAML/OIDC, SCIM, clés API, webhooks, audit logs, Stripe, emails, observabilité et tests.

Les nouvelles fonctions IA sont ajoutées par couches, sans déplacer l’exécution de code utilisateur dans le processus Next.js.

```text
Next.js / React
  - navigation, dashboard, CRUD, états et permissions

Next.js API
  - endpoints métier, validation, quotas, orchestration

PostgreSQL / Prisma
  - ressources multi-tenant et historique

Services séparés
  - workers d’entraînement
  - exécution notebooks
  - compute CPU/GPU
  - déploiement de modèles
  - scanner Python
```

## Règles non négociables

1. Ne pas créer un deuxième projet.
2. Ne pas supprimer les fonctions SaaS déjà fonctionnelles.
3. Ne pas présenter comme disponible un GPU, un notebook exécuté, un entraînement ou un déploiement sans backend réel.
4. Utiliser les statuts `Coming soon`, `Not configured`, `Unavailable` ou `No compute available` lorsque la capacité n’est pas configurée.
5. Toute ressource IA doit appartenir à un utilisateur ou à une équipe, et chaque route doit vérifier l’accès côté serveur.
6. Ne jamais exécuter du code utilisateur dans le processus Next.js.
7. Les tokens GitHub, Hugging Face et autres secrets doivent être chiffrés ou stockés dans un coffre adapté, jamais exposés en clair dans les réponses API.
8. Les intégrations externes restent explicitement distinguées du compute appartenant à la plateforme.
9. Les bibliothèques, modèles, datasets et composants ajoutés doivent être vérifiés pour leur licence et leur usage commercial.
10. Les tests de training et de compute utilisent des faux workers et des mocks ; aucune vraie GPU ne doit être nécessaire.

## Phases de livraison

### Phase 1 — Conservation et préparation

- Créer une branche de travail.
- Vérifier les routes, modèles Prisma, composants, variables d’environnement et tests existants.
- Ajouter les conventions communes : identifiant d’équipe, statuts, pagination, validation Zod et événements d’audit.
- Remplacer progressivement les dépendances implicites au branding BoxyHQ par une configuration d’application.

### Phase 2 — Rebranding

- Nom provisoire : `AI Cloud Platform`.
- Remplacer les textes, logos, favicon, URL de support et emails configurables.
- Conserver les notices de licence obligatoires.
- Ne pas modifier les informations nécessaires au fonctionnement des bibliothèques intégrées sans vérifier leur documentation.

### Phase 3 — Dashboard AI

Ajouter un centre de contrôle affichant uniquement des données réelles : projets, modèles, datasets, notebooks, expériences, jobs, deployments, usage, quota, alertes et état des services.

Le dashboard doit afficher explicitement l’absence de compute lorsque aucun worker n’est configuré.

### Phase 4 — Projects et ressources de base

Introduire progressivement les entités multi-tenant :

- `Project`
- `Workspace`
- `Notebook`
- `Dataset`
- `Model`
- `ModelVersion`
- `Artifact`

Chaque entité possède un propriétaire, une équipe, des timestamps, un statut et les relations nécessaires. Les routes CRUD reprennent les contrôles RBAC existants.

### Phase 5 — Workspaces et notebooks

Commencer par l’explorateur, les métadonnées, l’import/export `.ipynb` et la sauvegarde. L’exécution reste indisponible tant qu’un backend isolé n’est pas branché.

Prévoir une interface d’adapter pour un futur kernel/notebook runner, avec une réponse `No compute available` si aucun runner n’est actif.

### Phase 6 — Models, Datasets et intégrations

Ajouter les métadonnées, versions, sources, frameworks, licences, fichiers et évaluations. Isoler GitHub et Hugging Face dans des modules d’intégration distincts avec permissions minimales et stockage sécurisé des tokens.

### Phase 7 — Experiments, Training et Compute

Introduire :

- `Experiment`
- `TrainingJob`
- `TrainingMetric`
- `ComputeResource`
- `UsageRecord`
- `Secret`

Le job possède les statuts `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`. Le frontend ne pourra utiliser `RUNNING` ou `COMPLETED` que si un worker réel a accepté et terminé le travail.

Le moteur de compute sera une abstraction permettant des workers Docker, Kubernetes, VM, GPU cloud ou fournisseurs externes sans coupler l’application à un seul fournisseur.

### Phase 8 — Deployments et API IA

Introduire :

- `Deployment`
- `Endpoint`
- permissions de projet ;
- API keys scoped à un projet ou deployment ;
- statut, logs, configuration, variables et scaling.

Un deployment sans provider réel reste `Unavailable` ou `Not configured`.

### Phase 9 — AI Security Scanner

Le scanner Python reste défensif et séparé : ports TCP, services, mises à jour, analyse C/C++, CodeBERT Devign, Qwen2.5-Coder-1.5B-Instruct, explications françaises et voix lorsque disponible.

Il ne cible que les systèmes explicitement autorisés par l’utilisateur. Les capacités offensives ou l’exécution arbitraire de code ne font pas partie du périmètre.

### Phase 10 — Billing, quotas et usage

Conserver Stripe mais rendre les plans, prix et limites configurables. Les compteurs peuvent suivre CPU, GPU, RAM, stockage, durée, jobs, requêtes API et bande passante.

Le quota doit être vérifié côté serveur avant la mise en file d’un job et lors de la consommation réelle.

### Phase 11 — Audit, sécurité et tests

Ajouter les événements :

- `project.create`, `project.delete`
- `notebook.create`, `notebook.execute`
- `model.import`, `model.create`, `model.delete`
- `training.create`, `training.start`, `training.complete`, `training.failed`
- `deployment.create`, `deployment.delete`
- `api_key.create`, `api_key.revoke`
- `github.connect`, `huggingface.connect`

Ajouter des tests pour projets, notebooks, permissions, modèles, datasets, jobs, quotas, deployments, intégrations, facturation et isolation entre équipes.

## Critères de validation

- Le projet existant démarre et ses tests restent fonctionnels.
- Une équipe ne peut jamais lire ou modifier les ressources d’une autre équipe.
- Les nouveaux endpoints valident toutes les entrées avec Zod ou une validation équivalente.
- Les secrets ne sont jamais renvoyés après création.
- Aucun écran ne promet un compute non configuré.
- Les jobs et deployments ont des transitions de statut vérifiables.
- Les fonctions Stripe restent compatibles avec les abonnements existants.
- Les tests ne dépendent d’aucune GPU réelle.


## Compléments issus de la deuxième spécification

### ComputeProvider

Le compute est une abstraction de premier niveau et non une promesse d’infrastructure. Les providers sont séparés en trois modes :

- `PLATFORM` : machines réellement contrôlées par la plateforme ;
- `USER` : environnement appartenant à l’utilisateur, connecté par une intégration autorisée ;
- `EXTERNAL` : fournisseur externe avec API/SDK/OAuth officiellement supporté.

L’interface doit afficher la source réelle : `Compute source: Platform`, `Compute source: User` ou `Compute source: External`. En l’absence de worker plateforme, l’état est `No compute available` ou `Not configured`.

La chaîne cible est :

```text
AI Cloud -> Job Queue -> Worker -> Docker/Kubernetes/VM -> CPU/GPU
```

Aucun quota gratuit ne doit être contourné, aucun compte externe ne doit être créé automatiquement et aucun GPU gratuit ne doit être promis. Google Colab, Hugging Face, Google services et les futurs fournisseurs ne sont intégrés que par leurs mécanismes officiellement disponibles.

### InferenceProvider et déploiements

L’inférence sera également découplée :

- `PlatformInferenceProvider` ;
- `UserInferenceProvider` ;
- `ExternalInferenceProvider`.

Le flux métier est :

```text
Model -> ModelVersion -> Deployment -> Endpoint -> Inference API
```

L’API externe prévue est de la forme :

```text
POST /v1/deployments/{deployment}/predict
```

Une API key doit être limitée au projet et/ou au deployment autorisé. Elle ne doit jamais donner un accès global par défaut. Les paramètres de déploiement pourront inclure replicas, CPU, RAM, GPU, timeout, max requests et autoscaling, mais l’interface doit afficher `Scaling unavailable` lorsque le provider ne supporte pas réellement une option.

### Ressources à ajouter au schéma

En complément des modèles SaaS existants, le modèle cible comprend :

- `Project` ;
- `Workspace` ;
- `Notebook` ;
- `Dataset` et `DatasetVersion` ;
- `Model` et `ModelVersion` ;
- `Experiment` ;
- `TrainingJob` et `TrainingMetric` ;
- `ComputeProvider` et `ComputeResource` ;
- `Deployment` et `Endpoint` ;
- `UsageRecord` ;
- `Secret` ;
- `Integration` ;
- `Artifact`.

Chaque ressource doit porter son rattachement multi-tenant et ses relations doivent être contrôlées côté serveur.

### API keys et consommation

Le système de clés existant est étendu avec :

- portée projet ;
- portée deployment ;
- permissions ;
- expiration ;
- dernière utilisation ;
- révocation.

Les compteurs de `UsageRecord` pourront suivre CPU, GPU, RAM, stockage, durée, jobs d’entraînement, requêtes d’inférence et bande passante. Le quota est contrôlé **avant** de mettre un job en file et la facturation ne porte jamais sur une ressource que la plateforme ne fournit pas.

### Règle de vérité en production

Les mocks sont autorisés uniquement dans les tests. Ils sont interdits dans l’application en production pour simuler :

- GPU ;
- training ;
- deployment ;
- endpoint ;
- modèle exécuté ;
- résultat d’inférence.

Un job est `RUNNING` uniquement après acceptation par un worker réel et `COMPLETED` uniquement après résultat réel d’un worker. Sans backend, l’application affiche `Not configured`, `Unavailable` ou `No compute available`.

### Statuts des intégrations

Une page `Integrations` doit pouvoir représenter au minimum :

- `Connected` ;
- `Disconnected` ;
- `Error` ;
- `Unavailable` ;
- `Not configured`.

Les intégrations prioritaires sont GitHub, Hugging Face, Google services, compute providers et storage providers. Chaque intégration doit avoir son adaptateur isolé.

### Audit events supplémentaires

Ajouter notamment :

- `dataset.create` ;
- `notebook.execute` ;
- `compute.connect` ;
- `compute.disconnect` ;
- `endpoint.create` ;
- `api_key.revoke` ;
- `github.connect` ;
- `huggingface.connect`.

### Ordre d’implémentation confirmé

L’ordre prioritaire devient : audit et conservation, rebranding, Projects, Models, Datasets, Workspaces, Notebooks, GitHub, Hugging Face, abstraction ComputeProvider, TrainingJob, Deployment, Endpoint, API keys scoped, usage/quotas, Billing, AI Security Scanner, tests, puis sécurité et isolation approfondies.
