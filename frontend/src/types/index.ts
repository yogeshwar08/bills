export type ClassificationType = 'BILL' | 'NON_BILL' | 'UNCERTAIN';

export type BillCategory =
  | 'Food'
  | 'Groceries'
  | 'Utilities'
  | 'Shopping'
  | 'Transportation'
  | 'Healthcare'
  | 'Entertainment'
  | 'Education'
  | 'Other';

export interface ExtractedField<T> {
  value: T | null;
  confidence: number; // 0.0 - 1.0
  reason: string | null;
}

export interface BillFields {
  merchant_name: ExtractedField<string>;
  date: ExtractedField<string>;
  total_amount: ExtractedField<number>;
  currency: string;
  category: ExtractedField<BillCategory>;
}

export interface BillAnalysisResponse {
  scan_id?: string;
  classification: ClassificationType;
  classification_confidence: number;
  reason: string;
  non_bill_type: string | null;
  fields: BillFields | null;
}

export interface SavedBill {
  id: string;
  merchantName: string;
  date: string; // YYYY-MM-DD
  amount: number;
  currency: string;
  category: BillCategory;
  createdAt: string; // ISO string
  thumbnailBase64?: string;
  userCorrected: boolean;
  userCorrectedFields: string[];
  originalExtracted: {
    merchantName: string | null;
    merchantConfidence: number;
    merchantReason: string | null;
    date: string | null;
    dateConfidence: number;
    dateReason: string | null;
    amount: number | null;
    amountConfidence: number;
    amountReason: string | null;
    category: BillCategory | null;
    categoryConfidence: number;
    categoryReason: string | null;
    currency: string;
    classificationConfidence: number;
  };
  notes?: string;
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface HealthStatus {
  status: string;
  gemini_configured: boolean;
  model_name: string;
  version: string;
}

export interface SqliteScanRecord {
  id: number;
  scan_id: string;
  filename: string;
  classification: ClassificationType;
  classification_confidence: number;
  reason: string;
  non_bill_type: string | null;
  merchant_name: string | null;
  merchant_confidence: number | null;
  merchant_reason: string | null;
  bill_date: string | null;
  bill_date_confidence: number | null;
  bill_date_reason: string | null;
  total_amount: number | null;
  total_amount_confidence: number | null;
  total_amount_reason: string | null;
  currency: string | null;
  category: string | null;
  category_confidence: number | null;
  category_reason: string | null;
  raw_json: string;
  created_at: string;
}

export interface SqliteScanStats {
  total_scans: number;
  total_bills: number;
  total_non_bills: number;
  total_spending: number;
}


