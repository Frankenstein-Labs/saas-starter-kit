import {
  ComputeUnavailableError,
  assertTrainingTransition,
  ComputeProvider,
  ExecutionResult,
  JobExecutor,
  TrainingJob,
  TrainingQueue,
} from './compute';

export interface JobStore {
  get(id: string): Promise<TrainingJob | null>;
  transition(
    id: string,
    from: TrainingJob['status'],
    to: TrainingJob['status'],
    details?: Partial<TrainingJob>
  ): Promise<void>;
}

export class ComputeWorker {
  constructor(
    private readonly queue: TrainingQueue,
    private readonly store: JobStore,
    private readonly provider: ComputeProvider,
    private readonly executor: JobExecutor
  ) {}

  async processOne() {
    const jobId = await this.queue.dequeue();
    if (!jobId) return null;
    const job = await this.store.get(jobId);
    if (!job || job.status !== 'QUEUED') return null;
    if (!this.provider.isConfigured() || !(await this.provider.isAvailable())) {
      throw new ComputeUnavailableError();
    }

    assertTrainingTransition(job.status, 'RUNNING');
    await this.store.transition(job.id, 'QUEUED', 'RUNNING');
    try {
      const result: ExecutionResult = await this.executor.execute(
        { ...job, status: 'RUNNING' },
        this.provider
      );
      assertTrainingTransition('RUNNING', 'COMPLETED');
      await this.store.transition(job.id, 'RUNNING', 'COMPLETED', {
        configuration: { ...job.configuration, result },
      });
      return result;
    } catch (error) {
      await this.store.transition(job.id, 'RUNNING', 'FAILED', {
        configuration: {
          ...job.configuration,
          error: error instanceof Error ? error.message : 'Execution failed',
        },
      });
      throw error;
    }
  }
}
