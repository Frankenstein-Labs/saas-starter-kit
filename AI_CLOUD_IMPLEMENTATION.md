# AI Cloud Foundation — rapport d’implémentation

## 1. Informations de livraison

| Élément | Valeur |
|---|---|
| Dépôt | `Frankenstein-Labs/saas-starter-kit` |
| Branche | `feat/ai-cloud-foundation` |
| Commit fonctionnel | `11ecc02 feat: add ai cloud project foundation` |
| Commit de documentation | À créer après validation de ce fichier |
| Portée | Fondation AI Cloud et première tranche Projects |
| Date d’analyse | 20 septembre 2026 |

Cette livraison travaille directement dans le dépôt SaaS existant. Aucun deuxième projet n’a été créé et les fonctions SaaS existantes n’ont pas été supprimées.

## 2. Objectif de cette tranche

La première tranche transforme le starter kit en fondation de plateforme AI Cloud sans prétendre fournir déjà des GPU, des workers, des notebooks exécutables, un moteur d’entraînement ou un service d’inférence. Elle établit les ressources multi-tenant, leurs statuts et leurs permissions, puis livre un premier parcours réellement utilisable : créer et consulter des projets IA au sein d’une équipe.

La règle de vérité est appliquée dans l’interface : lorsque aucun worker n’est configuré, l’interface affiche `No compute available`. Aucun statut d’entraînement ou de déploiement fictif n’est généré.

## 3. Fonctionnalités ajoutées

### 3.1 Modèle de données AI Cloud

Le fichier `prisma/schema.prisma` conserve les modèles SaaS existants et ajoute les énumérations et modèles nécessaires aux futures fonctionnalités AI Cloud.

Les ressources ajoutées sont :

- `Project` pour organiser les ressources IA par équipe ;
- `Workspace` pour l’environnement de développement ;
- `Notebook` pour les documents `.ipynb` et leurs états ;
- `Dataset` et `DatasetVersion` pour les données et versions ;
- `Model` et `ModelVersion` pour les modèles, sources, formats et versions ;
- `Experiment` pour les paramètres, métriques et révisions de code ;
- `TrainingJob` et `TrainingMetric` pour les entraînements réels futurs ;
- `ComputeProvider` et `ComputeResource` pour distinguer `PLATFORM`, `USER` et `EXTERNAL` ;
- `Deployment` et `Endpoint` pour le futur flux modèle-vers-API ;
- `UsageRecord` pour les quotas et la consommation ;
- `Secret` pour les secrets de projet à stocker de manière chiffrée ;
- `Integration` pour GitHub, Hugging Face, Google, compute et storage ;
- `Artifact` pour les sorties produites par les jobs.

Toutes les ressources IA sont rattachées à une équipe. Les relations utilisent des suppressions en cascade ou `SetNull` selon le contexte afin d’éviter les références orphelines tout en respectant le multi-tenant.

### 3.2 Statuts et vérité opérationnelle

Le schéma contient notamment :

- `ProjectStatus`: `ACTIVE`, `ARCHIVED` ;
- `WorkspaceStatus`: `AVAILABLE`, `STOPPED`, `UNAVAILABLE` ;
- `NotebookStatus`: `DRAFT`, `READY`, `RUNNING`, `UNAVAILABLE` ;
- `TrainingJobStatus`: `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED` ;
- `DeploymentStatus`: `PENDING`, `RUNNING`, `STOPPED`, `FAILED`, `UNAVAILABLE` ;
- `ProviderStatus` et `IntegrationStatus`: `CONNECTED`, `DISCONNECTED`, `ERROR`, `UNAVAILABLE`, `NOT_CONFIGURED`.

Ces états sont conçus pour empêcher l’interface de présenter comme fonctionnelle une infrastructure qui n’existe pas encore.

### 3.3 Permissions RBAC

`lib/permissions.ts` conserve les rôles `OWNER`, `ADMIN` et `MEMBER`, et ajoute les ressources :

- `ai_project` ;
- `ai_workspace` ;
- `ai_notebook` ;
- `ai_model` ;
- `ai_dataset` ;
- `ai_training` ;
- `ai_deployment` ;
- `ai_integration`.

Les propriétaires et administrateurs disposent de toutes les actions sur les ressources IA. Les membres peuvent lire et créer certaines ressources de développement, mais ne disposent pas des opérations d’administration ou de suppression par défaut. Les vérifications sont réalisées côté serveur, et non uniquement dans l’interface.

### 3.4 Couche d’accès aux projets

Le fichier `models/project.ts` fournit des fonctions tenant-scoped :

- `getProjects(teamId)` ;
- `getProject(id, teamId)` ;
- `createProject(data)` ;
- `updateProject(id, teamId, data)` ;
- `archiveProject(id, teamId)`.

Les recherches incluent des compteurs pour workspaces, notebooks, datasets, models, training jobs et deployments. La suppression d’un projet est implémentée comme archivage logique dans cette première tranche afin d’éviter une suppression irréversible prématurée.

### 3.5 API Projects

Les routes ajoutées sont :

| Méthode | Route | Fonction |
|---|---|---|
| `GET` | `/api/teams/[slug]/projects` | Lister les projets de l’équipe |
| `POST` | `/api/teams/[slug]/projects` | Créer un projet |
| `GET` | `/api/teams/[slug]/projects/[projectId]` | Lire un projet |
| `PATCH` | `/api/teams/[slug]/projects/[projectId]` | Modifier un projet |
| `DELETE` | `/api/teams/[slug]/projects/[projectId]` | Archiver un projet |

Les endpoints vérifient la session, l’accès à l’équipe, le rôle RBAC, l’UUID du projet et les champs entrants. Les champs de création sont limités à un nom de 80 caractères, un slug optionnel et une description de 500 caractères.

### 3.6 Interface utilisateur

La page `/teams/[slug]/projects` fournit :

- une section AI Cloud ;
- un état réel `No compute available` ;
- un formulaire de création de projet ;
- la liste des projets de l’équipe ;
- l’affichage du slug, du statut et des compteurs de ressources ;
- les états de chargement, erreur et liste vide ;
- les traductions anglaises ajoutées dans `locales/en/common.json`.

La navigation existante conserve `All Products` et `Settings`, avec l’ajout du lien `AI Projects`.

## 4. Fichiers modifiés et ajoutés

| Fichier | Type de changement |
|---|---|
| `prisma/schema.prisma` | Ajout du schéma AI Cloud et des relations multi-tenant |
| `lib/permissions.ts` | Extension RBAC aux ressources IA |
| `models/project.ts` | Nouvelle couche d’accès aux projets |
| `pages/api/teams/[slug]/projects/index.ts` | API de liste et création |
| `pages/api/teams/[slug]/projects/[projectId].ts` | API de lecture, modification et archivage |
| `pages/teams/[slug]/projects.tsx` | Page UI Projects |
| `components/shared/shell/TeamNavigation.tsx` | Lien AI Projects |
| `locales/en/common.json` | Libellés AI Cloud |
| `PLAN_MIGRATION_AI_CLOUD.md` | Plan de migration global |
| `EXPLICATION_COMPLETE_FR.md` | Documentation du starter kit en français |
| `AI_CLOUD_IMPLEMENTATION.md` | Présent rapport |

## 5. Vérifications effectuées

Les commandes suivantes ont été exécutées avec succès :

```bash
npm ci
DATABASE_URL='postgresql://admin:admin@localhost:5432/saas-starter-kit' npx prisma validate
DATABASE_URL='postgresql://admin:admin@localhost:5432/saas-starter-kit' npx prisma generate
npm run check-types
npm run check-lint
npx prisma format
npx prettier --write <fichiers modifiés>
git diff --check
```

ESLint signale uniquement un avertissement préexistant dans `lib/prisma.ts` concernant une directive `eslint-disable` devenue inutile. Il n’y a aucune erreur TypeScript, Prisma ou ESLint introduite par cette tranche.

## 6. Ce qui n’est pas encore implémenté

Cette livraison ne prétend pas fournir les capacités suivantes :

- aucun worker de training réel ;
- aucun GPU plateforme ;
- aucune exécution de notebook ;
- aucune exécution de code utilisateur ;
- aucun provider GitHub réellement connecté ;
- aucun provider Hugging Face réellement connecté ;
- aucun provider Google Colab ;
- aucun deployment réel ;
- aucune inférence réelle ;
- aucun endpoint `/v1/deployments/{deployment}/predict` ;
- aucun calcul de quota facturable ;
- aucun stockage chiffré opérationnel pour les secrets ;
- aucun AI Security Scanner intégré ;
- aucune migration SQL appliquée à une base de production.

Ces fonctions sont représentées par des modèles et des statuts afin de préparer l’architecture, mais elles devront être branchées à des services réels avant d’être marquées disponibles.

## 7. Dépendances et audit de sécurité

`npm ci` a installé les versions verrouillées du dépôt. L’audit npm a signalé 87 vulnérabilités dans l’arbre de dépendances : 3 faibles, 45 modérées, 34 élevées et 5 critiques. Cette situation existait avant la tranche AI Cloud et nécessite une campagne séparée de mise à jour et de tests de régression.

Aucune commande `npm audit fix --force` n’a été lancée, car elle pourrait introduire des changements majeurs non validés.

## 8. Procédure de revue avant fusion

Pour vérifier le commit fonctionnel :

```bash
git fetch origin
git show --stat --oneline 11ecc02
git show --check 11ecc02
```

Pour vérifier la branche complète par rapport à `main` :

```bash
git diff main...feat/ai-cloud-foundation --stat
git diff main...feat/ai-cloud-foundation --check
```

Pour valider le code localement :

```bash
npm ci
DATABASE_URL='postgresql://admin:admin@localhost:5432/saas-starter-kit' npx prisma validate
npm run check-types
npm run check-lint
```

Une base PostgreSQL de développement peut être lancée avec :

```bash
docker compose up -d
DATABASE_URL='postgresql://admin:admin@localhost:5432/saas-starter-kit' npx prisma db push
npm run dev
```

La page à vérifier est :

```text
/teams/<team-slug>/projects
```

## 9. Suite recommandée après revue

Après validation de cette tranche, l’ordre de développement recommandé est :

1. compléter Projects avec Workspaces et ressources de fichiers ;
2. ajouter Models, ModelVersion, Datasets et DatasetVersion ;
3. ajouter les adaptateurs GitHub et Hugging Face avec stockage sécurisé des tokens ;
4. créer l’abstraction `ComputeProvider` ;
5. ajouter la file et les interfaces de workers sans simuler leur disponibilité ;
6. ajouter Training Jobs et métriques ;
7. ajouter Deployments, Endpoints et `InferenceProvider` ;
8. ajouter API keys scoped aux projets et deployments ;
9. ajouter quotas, usage et billing configurable ;
10. intégrer le Security Scanner défensif dans un service séparé ;
11. ajouter les tests d’isolation multi-tenant et de transitions d’état.

## 10. Résumé pour le reviewer

Le commit `11ecc02` livre une fondation AI Cloud réelle et vérifiable dans le SaaS existant. La valeur principale est l’ajout d’un modèle de domaine extensible, tenant-scoped et compatible avec les futures abstractions de compute et d’inférence, accompagné d’un premier parcours complet de création et consultation de projets. La livraison ne masque pas les dépendances absentes : aucun compute ou backend IA inexistant n’est présenté comme disponible.
