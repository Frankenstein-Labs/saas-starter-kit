# Platform Integrations & Secret Vault Documentation

## Architecture Overview

The platform integrations system provides team-scoped connections to external AI/ML services:
- **GitHub App Integration**: Organization/Team-level GitHub App authentication via RS256 JWTs, installation access tokens, repository tracking with `ProjectRepository`, and HMAC-SHA256 webhook verification.
- **Hugging Face Connector**: OAuth / User access token interface for listing models, datasets, and running model inference.
- **Google Colab / Drive Connector**: Google Drive API integration for listing and managing `.ipynb` Jupyter Notebooks and generating "Open in Colab" links. Server-side runtime control returns `UNAVAILABLE` status explicitly due to Google API constraints.
- **Prisma Secret Vault**: Encrypted secret persistence using AES-256-GCM backed by Prisma and isolated by `teamId` and `userId`.

---

## Configuration & Environment Variables

Ensure the following environment variables are configured in `.env`:

```env
# Secret Vault Encryption Key (64 hex characters / 32 bytes or raw passphrase)
SECRET_VAULT_KEY=your_32_byte_secret_vault_encryption_key_here

# GitHub App Configuration (Optional for Webhooks)
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
```

---

## API Routes

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/teams/[slug]/integrations` | List integration statuses for the team |
| `POST` | `/api/teams/[slug]/integrations` | Store credentials and connect an integration |
| `DELETE` | `/api/teams/[slug]/integrations` | Revoke secrets and disconnect an integration |
| `GET` | `/api/teams/[slug]/projects` | List team projects and linked repositories |
| `POST` | `/api/teams/[slug]/projects` | Create a new project and link a repository |
| `POST` | `/api/webhooks/github` | Receive GitHub App webhooks with HMAC signature validation |

---

## Secret Vault Usage

```typescript
import { PrismaSecretVault } from '@/lib/secret-vault';

const vault = new PrismaSecretVault();

// Store a secret
await vault.put({
  teamId: 'team_123',
  name: 'HF_ACCESS_TOKEN',
  value: 'hf_xxxxxxxxxxxx',
});

// Retrieve a secret
const token = await vault.get({
  teamId: 'team_123',
  name: 'HF_ACCESS_TOKEN',
});

// Revoke a secret
await vault.revoke({
  teamId: 'team_123',
  name: 'HF_ACCESS_TOKEN',
});
```
