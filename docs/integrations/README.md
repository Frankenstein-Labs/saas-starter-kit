# Platform Integrations Documentation

## Overview

This repository supports integration with external AI and platform providers:
- **GitHub**: Repository linking, installation access tokens, and webhook handling.
- **Hugging Face**: OAuth authentication, model browsing, and inference API router execution.
- **Google Colab**: Google Drive notebook (.ipynb) discovery and direct "Open in Colab" link generation. Server-side Colab runtime control returns `UNAVAILABLE` due to Google API restricted access requirements.

## Architecture

1. **Secret Vault (`PrismaSecretVault`)**:
   - Stores encrypted tokens/secrets in database using AES-256-GCM encryption.
   - Configured via `SECRET_VAULT_KEY` env variable.

2. **Team-Scoped Integrations**:
   - Integrations are scoped per team in `Integration` model (`@@unique([teamId, provider])`).
   - Repository links to individual projects are stored in `ProjectRepository`.

3. **Webhooks**:
   - GitHub webhook endpoint: `/api/webhooks/github` using constant-time HMAC-SHA256 signature verification.
