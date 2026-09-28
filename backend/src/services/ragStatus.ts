export type RagJobStatus = 'idle' | 'processing' | 'complete' | 'error';

export interface RagJobState {
  status: RagJobStatus;
  message: string;
  startedAt?: string;
  completedAt?: string;
  indexedCount?: number;
  skippedCount?: number;
  errorsCount?: number;
  totalCount?: number;
  error?: string;
}

function createIdleState(): RagJobState {
  return {
    status: 'idle',
    message: 'No vector backfill in progress.',
  };
}

let ragState: RagJobState = createIdleState();

export function getRagJobState(): RagJobState {
  return { ...ragState };
}

export function isRagJobRunning(): boolean {
  return ragState.status === 'processing';
}

export function markRagJobStarted(totalCount = 0): void {
  ragState = {
    status: 'processing',
    message: 'Vector backfill is running.',
    startedAt: new Date().toISOString(),
    totalCount,
    indexedCount: 0,
    skippedCount: 0,
    errorsCount: 0,
  };
}

export function markRagJobProgress(update: Partial<Pick<RagJobState, 'indexedCount' | 'skippedCount' | 'errorsCount' | 'totalCount' | 'message'>>): void {
  ragState = {
    ...ragState,
    ...update,
  };
}

export function markRagJobComplete(result: {
  indexedCount: number;
  skippedCount: number;
  errorsCount: number;
  totalCount: number;
}): void {
  ragState = {
    status: 'complete',
    message: 'Vector backfill finished.',
    startedAt: ragState.startedAt,
    completedAt: new Date().toISOString(),
    ...result,
  };
}

export function markRagJobError(error: string): void {
  ragState = {
    status: 'error',
    message: 'Vector backfill failed.',
    startedAt: ragState.startedAt,
    completedAt: new Date().toISOString(),
    indexedCount: ragState.indexedCount,
    skippedCount: ragState.skippedCount,
    errorsCount: (ragState.errorsCount || 0) + 1,
    totalCount: ragState.totalCount,
    error,
  };
}

export function resetRagJobState(): void {
  ragState = createIdleState();
}
