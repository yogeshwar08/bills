import { BillAnalysisResponse, HealthStatus } from '../types';

const rawApiUrl = (import.meta.env.VITE_API_URL as string) || '';
const API_BASE = rawApiUrl ? `${rawApiUrl.replace(/\/$/, '')}/api` : '/api';

export class ApiError extends Error {
  errorCode: string;
  statusCode: number;

  constructor(message: string, statusCode: number = 500, errorCode: string = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export async function fetchHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`Health check returned status ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    throw new ApiError(
      'Unable to connect to Bill Snap backend. Please ensure the server is running.',
      503,
      'SERVER_OFFLINE'
    );
  }
}

export async function analyzeBill(file: File): Promise<BillAnalysisResponse> {
  const formData = new FormData();
  formData.append('file', file);

  // Abort if analysis takes longer than 60 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await res.json();

    if (!res.ok) {
      const detail = data?.detail || {};
      const errorCode = detail?.error_code || 'ANALYSIS_FAILED';
      const message = detail?.message || (typeof detail === 'string' ? detail : 'Bill analysis failed.');
      throw new ApiError(message, res.status, errorCode);
    }

    return data as BillAnalysisResponse;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) {
      throw err;
    }
    if (err.name === 'AbortError') {
      throw new ApiError(
        'Analysis timed out after 60 seconds. The AI model may be under heavy load. Please try again.',
        408,
        'ANALYSIS_TIMEOUT'
      );
    }
    // Network or connection failure
    throw new ApiError(
      navigator.onLine 
        ? 'Could not connect to analysis service. Please check your network and ensure the backend is running.'
        : 'You are currently offline. AI analysis requires an active internet connection.',
      0,
      'NETWORK_FAILURE'
    );
  }
}

export async function fetchScans(limit: number = 50, offset: number = 0) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/scans?limit=${limit}&offset=${offset}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new ApiError('Failed to fetch scans from database.', res.status);
    }
    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') {
      throw new ApiError('Database request timed out. Please click Refresh to try again.', 408, 'TIMEOUT');
    }
    throw new ApiError('Could not reach backend database. Please ensure backend is running.', 503, 'NETWORK_ERROR');
  }
}

export async function fetchScanStats() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API_BASE}/scans-stats`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      throw new ApiError('Failed to fetch scan statistics.', res.status);
    }
    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') {
      throw new ApiError('Stats request timed out.', 408, 'TIMEOUT');
    }
    throw new ApiError('Could not reach backend database.', 503, 'NETWORK_ERROR');
  }
}

export async function deleteScanRecord(scanId: string) {
  const res = await fetch(`${API_BASE}/scans/${scanId}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    throw new ApiError('Failed to delete scan record.', res.status);
  }
  return await res.json();
}


