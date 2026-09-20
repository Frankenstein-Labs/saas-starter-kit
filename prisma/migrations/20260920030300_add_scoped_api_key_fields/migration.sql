-- Add scoped API-key metadata without exposing or replacing existing hashed secrets.
ALTER TABLE "ApiKey"
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "projectId" TEXT,
  ADD COLUMN "deploymentId" TEXT;

CREATE INDEX "ApiKey_projectId_idx" ON "ApiKey"("projectId");
CREATE INDEX "ApiKey_deploymentId_idx" ON "ApiKey"("deploymentId");

ALTER TABLE "ApiKey"
  ADD CONSTRAINT "ApiKey_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ApiKey"
  ADD CONSTRAINT "ApiKey_deploymentId_fkey"
  FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
