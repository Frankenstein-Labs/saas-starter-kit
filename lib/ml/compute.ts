export type TrainingStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';
export type ComputeProviderType = 'PLATFORM' | 'USER' | 'EXTERNAL';

export type TrainingJob = {
  id: string;
  teamId: string;
  projectId: string;
  status: TrainingStatus;
  providerType?: ComputeProviderType;
  configuration: Record<string, unknown>;
};

export type ExecutionResult = {
  metrics?: Record<string, number>;
  artifacts?: string[];
  logs?: string[];
};

export interface ComputeProvider {
  readonly type: ComputeProviderType;
  isConfigured(): boolean;
  isAvailable(): Promise<boolean>;
}

export interface JobExecutor {
  execute(
    job: TrainingJob,
    provider: ComputeProvider
  ): Promise<ExecutionResult>;
}

export interface TrainingQueue {
  enqueue(jobId: string): Promise<void>;
  dequeue(): Promise<string | null>;
  cancel(jobId: string): Promise<boolean>;
}

export class NoComputeProvider implements ComputeProvider {
  readonly type: ComputeProviderType = 'PLATFORM';
  isConfigured() {
    return false;
  }
  async isAvailable() {
    return false;
  }
}

export class InMemoryTrainingQueue implements TrainingQueue {
  private readonly pending: string[] = [];
  private readonly queued = new Set<string>();

  async enqueue(jobId: string) {
    if (!this.queued.has(jobId)) {
      this.pending.push(jobId);
      this.queued.add(jobId);
    }
  }

  async dequeue() {
    const jobId = this.pending.shift() ?? null;
    if (jobId) this.queued.delete(jobId);
    return jobId;
  }

  async cancel(jobId: string) {
    const index = this.pending.indexOf(jobId);
    if (index < 0) return false;
    this.pending.splice(index, 1);
    this.queued.delete(jobId);
    return true;
  }
}

export const VALID_TRANSITIONS: Record<TrainingStatus, TrainingStatus[]> = {
  QUEUED: ['RUNNING', 'CANCELLED'],
  RUNNING: ['COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export function assertTrainingTransition(
  from: TrainingStatus,
  to: TrainingStatus
) {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new Error(`Invalid training job transition: ${from} -> ${to}`);
  }
}

export class ComputeUnavailableError extends Error {
  constructor(message = 'No compute available') {
    super(message);
    this.name = 'ComputeUnavailableError';
  }
}
