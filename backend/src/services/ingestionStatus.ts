export type IngestionScope = 'general' | 'search';
export type IngestionJobStatus = 'idle' | 'processing' | 'scraping' | 'complete' | 'error';

export interface IngestionStatus {
  scope: IngestionScope;
  status: IngestionJobStatus;
  message: string;
  query?: string;
  startedAt?: string;
  completedAt?: string;
  ingestedCount?: number;
  skippedCount?: number;
  errorsCount?: number;
  error?: string;
}

function createIdleStatus(scope: IngestionScope): IngestionStatus {
  return {
    scope,
    status: 'idle',
    message: scope === 'search' ? 'No search ingestion in progress.' : 'No ingestion in progress.',
  };
}

let generalStatus: IngestionStatus = createIdleStatus('general');
let searchStatus: IngestionStatus = createIdleStatus('search');

function getStatusRef(scope: IngestionScope): IngestionStatus {
  return scope === 'search' ? searchStatus : generalStatus;
}

function setStatusRef(scope: IngestionScope, status: IngestionStatus): void {
  if (scope === 'search') {
    searchStatus = status;
    return;
  }

  generalStatus = status;
}

export function getIngestionStatus(scope: IngestionScope): IngestionStatus {
  return { ...getStatusRef(scope) };
}

export function isIngestionRunning(scope: IngestionScope): boolean {
  const currentStatus = getStatusRef(scope);
  return currentStatus.status === 'processing' || currentStatus.status === 'scraping';
}

export function markIngestionStarted(scope: IngestionScope, query?: string): void {
  setStatusRef(scope, {
    scope,
    query,
    status: 'processing',
    message: scope === 'search'
      ? `Search ingestion is running for "${query || 'current query'}".`
      : 'Ingestion pipeline is running.',
    startedAt: new Date().toISOString(),
  });
}

export function markIngestionScraping(scope: IngestionScope): void {
  const currentStatus = getStatusRef(scope);
  setStatusRef(scope, {
    ...currentStatus,
    status: 'scraping',
    message: scope === 'search'
      ? `Search ingestion: scraping article details for "${currentStatus.query || 'current query'}".`
      : 'Ingestion pipeline: scraping article details in background.',
  });
}

export function markIngestionComplete(
  scope: IngestionScope,
  result: {
    ingestedCount: number;
    skippedCount: number;
    errorsCount: number;
  }
): void {
  const currentStatus = getStatusRef(scope);
  setStatusRef(scope, {
    scope,
    query: currentStatus.query,
    status: 'complete',
    message: scope === 'search'
      ? `Search ingestion finished for "${currentStatus.query || 'current query'}".`
      : 'Ingestion pipeline finished.',
    startedAt: currentStatus.startedAt,
    completedAt: new Date().toISOString(),
    ...result,
  });
}

export function markIngestionError(scope: IngestionScope, error: string): void {
  const currentStatus = getStatusRef(scope);
  setStatusRef(scope, {
    scope,
    query: currentStatus.query,
    status: 'error',
    message: scope === 'search'
      ? `Search ingestion failed for "${currentStatus.query || 'current query'}".`
      : 'Ingestion pipeline failed.',
    startedAt: currentStatus.startedAt,
    completedAt: new Date().toISOString(),
    error,
  });
}

export function resetIngestionStatus(scope: IngestionScope): void {
  setStatusRef(scope, createIdleStatus(scope));
}
