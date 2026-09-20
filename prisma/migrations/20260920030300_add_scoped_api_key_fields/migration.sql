-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('AVAILABLE', 'STOPPED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "NotebookStatus" AS ENUM ('DRAFT', 'READY', 'RUNNING', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "ModelSource" AS ENUM ('LOCAL', 'GITHUB', 'HUGGINGFACE', 'TRAINED', 'IMPORTED');

-- CreateEnum
CREATE TYPE "DatasetSource" AS ENUM ('LOCAL', 'GITHUB', 'HUGGINGFACE', 'IMPORTED');

-- CreateEnum
CREATE TYPE "TrainingJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ComputeProviderType" AS ENUM ('PLATFORM', 'USER', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR', 'UNAVAILABLE', 'NOT_CONFIGURED');

-- CreateEnum
CREATE TYPE "DeploymentMode" AS ENUM ('PLATFORM', 'USER', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'RUNNING', 'STOPPED', 'FAILED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GITHUB', 'HUGGINGFACE', 'GOOGLE', 'COMPUTE', 'STORAGE');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR', 'UNAVAILABLE', 'NOT_CONFIGURED');

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "deploymentId" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notebook" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "name" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" "NotebookStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notebook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dataset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" "DatasetSource" NOT NULL DEFAULT 'LOCAL',
    "license" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetVersion" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "format" TEXT,
    "sizeBytes" BIGINT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatasetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "framework" TEXT,
    "format" TEXT,
    "source" "ModelSource" NOT NULL DEFAULT 'LOCAL',
    "license" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelVersion" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "sizeBytes" BIGINT,
    "metrics" JSONB,
    "metadata" JSONB,
    "artifactUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "modelId" TEXT,
    "datasetId" TEXT,
    "parameters" JSONB,
    "metrics" JSONB,
    "codeRevision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComputeProvider" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ComputeProviderType" NOT NULL,
    "status" "ProviderStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "providerKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComputeProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComputeResource" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpu" INTEGER,
    "ramMb" INTEGER,
    "gpu" TEXT,
    "storageGb" INTEGER,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComputeResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "experimentId" TEXT,
    "modelVersionId" TEXT,
    "datasetVersionId" TEXT,
    "computeProviderId" TEXT,
    "name" TEXT NOT NULL,
    "status" "TrainingJobStatus" NOT NULL DEFAULT 'QUEUED',
    "parameters" JSONB,
    "logsUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingMetric" (
    "id" TEXT NOT NULL,
    "trainingJobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "step" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelVersionId" TEXT,
    "computeProviderId" TEXT,
    "name" TEXT NOT NULL,
    "mode" "DeploymentMode" NOT NULL,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "replicas" INTEGER,
    "cpu" INTEGER,
    "ramMb" INTEGER,
    "gpu" TEXT,
    "timeoutSeconds" INTEGER,
    "maxRequests" INTEGER,
    "autoscaling" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endpoint" (
    "id" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "deploymentId" TEXT,
    "metric" TEXT NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secret" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "encryptedValue" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Secret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "projectId" TEXT,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "trainingJobId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "sizeBytes" BIGINT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_teamId_idx" ON "Project"("teamId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_teamId_slug_key" ON "Project"("teamId", "slug");

-- CreateIndex
CREATE INDEX "Workspace_projectId_idx" ON "Workspace"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_projectId_name_key" ON "Workspace"("projectId", "name");

-- CreateIndex
CREATE INDEX "Notebook_projectId_idx" ON "Notebook"("projectId");

-- CreateIndex
CREATE INDEX "Notebook_workspaceId_idx" ON "Notebook"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Notebook_projectId_name_key" ON "Notebook"("projectId", "name");

-- CreateIndex
CREATE INDEX "Dataset_projectId_idx" ON "Dataset"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Dataset_projectId_name_key" ON "Dataset"("projectId", "name");

-- CreateIndex
CREATE INDEX "DatasetVersion_datasetId_idx" ON "DatasetVersion"("datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "DatasetVersion_datasetId_version_key" ON "DatasetVersion"("datasetId", "version");

-- CreateIndex
CREATE INDEX "Model_projectId_idx" ON "Model"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Model_projectId_name_key" ON "Model"("projectId", "name");

-- CreateIndex
CREATE INDEX "ModelVersion_modelId_idx" ON "ModelVersion"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelVersion_modelId_version_key" ON "ModelVersion"("modelId", "version");

-- CreateIndex
CREATE INDEX "Experiment_projectId_idx" ON "Experiment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_projectId_name_key" ON "Experiment"("projectId", "name");

-- CreateIndex
CREATE INDEX "ComputeProvider_teamId_idx" ON "ComputeProvider"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "ComputeProvider_teamId_name_key" ON "ComputeProvider"("teamId", "name");

-- CreateIndex
CREATE INDEX "ComputeResource_providerId_idx" ON "ComputeResource"("providerId");

-- CreateIndex
CREATE INDEX "TrainingJob_projectId_idx" ON "TrainingJob"("projectId");

-- CreateIndex
CREATE INDEX "TrainingJob_status_idx" ON "TrainingJob"("status");

-- CreateIndex
CREATE INDEX "TrainingMetric_trainingJobId_idx" ON "TrainingMetric"("trainingJobId");

-- CreateIndex
CREATE INDEX "Deployment_projectId_idx" ON "Deployment"("projectId");

-- CreateIndex
CREATE INDEX "Deployment_modelId_idx" ON "Deployment"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "Deployment_projectId_name_key" ON "Deployment"("projectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Endpoint_deploymentId_key" ON "Endpoint"("deploymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Endpoint_path_key" ON "Endpoint"("path");

-- CreateIndex
CREATE INDEX "UsageRecord_teamId_recordedAt_idx" ON "UsageRecord"("teamId", "recordedAt");

-- CreateIndex
CREATE INDEX "UsageRecord_projectId_idx" ON "UsageRecord"("projectId");

-- CreateIndex
CREATE INDEX "Secret_projectId_idx" ON "Secret"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Secret_teamId_name_key" ON "Secret"("teamId", "name");

-- CreateIndex
CREATE INDEX "Integration_projectId_idx" ON "Integration"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_teamId_provider_key" ON "Integration"("teamId", "provider");

-- CreateIndex
CREATE INDEX "Artifact_projectId_idx" ON "Artifact"("projectId");

-- CreateIndex
CREATE INDEX "Artifact_trainingJobId_idx" ON "Artifact"("trainingJobId");

-- CreateIndex
CREATE INDEX "ApiKey_projectId_idx" ON "ApiKey"("projectId");

-- CreateIndex
CREATE INDEX "ApiKey_deploymentId_idx" ON "ApiKey"("deploymentId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notebook" ADD CONSTRAINT "Notebook_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notebook" ADD CONSTRAINT "Notebook_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetVersion" ADD CONSTRAINT "DatasetVersion_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelVersion" ADD CONSTRAINT "ModelVersion_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComputeProvider" ADD CONSTRAINT "ComputeProvider_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComputeResource" ADD CONSTRAINT "ComputeResource_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ComputeProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingJob" ADD CONSTRAINT "TrainingJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingJob" ADD CONSTRAINT "TrainingJob_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingJob" ADD CONSTRAINT "TrainingJob_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingJob" ADD CONSTRAINT "TrainingJob_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "DatasetVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingJob" ADD CONSTRAINT "TrainingJob_computeProviderId_fkey" FOREIGN KEY ("computeProviderId") REFERENCES "ComputeProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingMetric" ADD CONSTRAINT "TrainingMetric_trainingJobId_fkey" FOREIGN KEY ("trainingJobId") REFERENCES "TrainingJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_modelVersionId_fkey" FOREIGN KEY ("modelVersionId") REFERENCES "ModelVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_computeProviderId_fkey" FOREIGN KEY ("computeProviderId") REFERENCES "ComputeProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endpoint" ADD CONSTRAINT "Endpoint_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "Deployment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Secret" ADD CONSTRAINT "Secret_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Secret" ADD CONSTRAINT "Secret_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_trainingJobId_fkey" FOREIGN KEY ("trainingJobId") REFERENCES "TrainingJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
