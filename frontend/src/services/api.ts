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

  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      const detail = data?.detail || {};
      const errorCode = detail?.error_code || 'ANALYSIS_FAILED';
      const message = detail?.message || (typeof detail === 'string' ? detail : 'Bill analysis failed.');
      throw new ApiError(message, res.status, errorCode);
    }

    return data as BillAnalysisResponse;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
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
  const res = await fetch(`${API_BASE}/scans?limit=${limit}&offset=${offset}`);
  if (!res.ok) {
    throw new ApiError('Failed to fetch scans from database.', res.status);
  }
  return await res.json();
}

export async function fetchScanStats() {
  const res = await fetch(`${API_BASE}/scans-stats`);
  if (!res.ok) {
    throw new ApiError('Failed to fetch scan statistics.', res.status);
  }
  return await res.json();
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


