# Platform Integrations Documentation

This document covers the architecture, configuration, and security models for Platform Integrations in the AI Cloud SaaS platform.

## Architecture & Data Models

Integrations in the platform are organized at two scopes:
1. **Team Integration (`Integration`)**: Scope per team via `@@unique([teamId, provider])`. Tracks connection status (`CONNECTED`, `DISCONNECTED`, `ERROR`, `UNAVAILABLE`, `NOT_CONFIGURED`) and provider metadata.
2. **Project Repository (`ProjectRepository`)**: Scope per project via `@@unique([projectId, provider, repo])`. Connects specific external repositories (e.g. `organization/repository`) to individual platform projects.

### Secret Vault (`PrismaSecretVault`)

Platform integration secrets and access tokens are encrypted using **AES-256-GCM** before being persisted in the `Secret` database table.

- **Environment Variable**: `SECRET_VAULT_KEY` must be a base64-encoded 32-byte key.
- **Operations**: `put`, `get`, `revoke`, `list` scoped per team and project.

---

## Supported Providers

### 1. GitHub App Integration

- **Authentication**: Supports GitHub App JWT authentication using RS256 (`App ID` + `Private Key .pem`). Generates short-lived installation tokens via `POST /app/installations/{id}/access_tokens`.
- **Personal Access Tokens (PAT)**: Can also accept fine-grained or classic GitHub access tokens for testing/development.
- **Webhooks**: `pages/api/webhooks/github.ts` verifies incoming webhook payloads using constant-time HMAC SHA-256 (`X-Hub-Signature-256` header) against `GITHUB_WEBHOOK_SECRET`.

### 2. Hugging Face Integration

- **Authentication**: Validates access tokens (`hf_...`) via `https://huggingface.co/api/whoami-v2`.
- **Inference API**: Built-in support for Hugging Face Inference Router (`https://router.huggingface.co/v1`).
- **Model & Dataset Access**: Search and list public/private models and datasets.

### 3. Google Drive / Colab Integration

- **Notebook Management**: Uses Google Drive API (`mimeType='application/vnd.google.colaboratory'`) to list and sync `.ipynb` notebook files.
- **Open in Colab**: Generates direct interactive links (`https://colab.research.google.com/github/{repo}/blob/{branch}/{path}`).
- **Runtime Control**: Server-side Colab runtime control is explicitly marked as `UNAVAILABLE` because Google Colaboratory runtime control API (`colaboratory.googleapis.com`) is restricted to allowlist access only.

---

## API Endpoints

- `GET /api/teams/[slug]/integrations`: List status of team integrations.
- `POST /api/teams/[slug]/integrations/[provider]`: Connect a provider with credentials (validates token/credentials via live API call).
- `PUT /api/teams/[slug]/integrations/[provider]`: Test connection for stored integration credentials.
- `DELETE /api/teams/[slug]/integrations/[provider]`: Disconnect integration and revoke stored vault secrets.
- `POST /api/webhooks/github`: Process GitHub App events with HMAC SHA-256 verification.
