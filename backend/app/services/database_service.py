import os
import json
import sqlite3
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.schemas.bill_schema import BillAnalysisResponse
from app.utils.logger import logger

# Default database file path: backend/bills.db or configured via SQLITE_DB_PATH
DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "bills.db"
)

class DatabaseService:
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.getenv("SQLITE_DB_PATH", DEFAULT_DB_PATH)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        return conn

    def _init_db(self):
        """Initializes SQLite database and tables with proper indexes."""
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        try:
            with self._get_connection() as conn:
                conn.execute("""
                CREATE TABLE IF NOT EXISTS bill_scans (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scan_id TEXT UNIQUE NOT NULL,
                    filename TEXT,
                    classification TEXT NOT NULL,
                    classification_confidence REAL NOT NULL,
                    reason TEXT NOT NULL,
                    non_bill_type TEXT,
                    merchant_name TEXT,
                    merchant_confidence REAL,
                    merchant_reason TEXT,
                    bill_date TEXT,
                    bill_date_confidence REAL,
                    bill_date_reason TEXT,
                    total_amount REAL,
                    total_amount_confidence REAL,
                    total_amount_reason TEXT,
                    currency TEXT,
                    category TEXT,
                    category_confidence REAL,
                    category_reason TEXT,
                    raw_json TEXT NOT NULL,
                    is_duplicate INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                """)
                # Safe migration for existing databases:
                try:
                    conn.execute("ALTER TABLE bill_scans ADD COLUMN is_duplicate INTEGER DEFAULT 0;")
                except sqlite3.OperationalError:
                    pass

                conn.execute("CREATE INDEX IF NOT EXISTS idx_bill_scans_created ON bill_scans(created_at DESC);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_bill_scans_classification ON bill_scans(classification);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_bill_scans_merchant ON bill_scans(merchant_name);")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_bill_scans_dup ON bill_scans(merchant_name, total_amount);")
                conn.commit()
                logger.info("SQLite database initialized at: %s", self.db_path)
        except Exception as e:
            logger.error("Failed to initialize SQLite database: %s", str(e))
            raise

    def check_duplicate(self, merchant_name: Optional[str], total_amount: Optional[float]) -> Optional[Dict[str, Any]]:
        """
        Checks if an identical bill (same merchant name AND same amount) already exists in SQLite.
        Note: If the merchant name is the same but the amount is different, it is NOT considered duplicate.
        """
        if not merchant_name or total_amount is None:
            return None
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT * FROM bill_scans
                WHERE LOWER(TRIM(merchant_name)) = LOWER(TRIM(?))
                  AND ABS(total_amount - ?) < 0.01
                  AND classification = 'BILL'
                ORDER BY id DESC LIMIT 1;
                """,
                (merchant_name, float(total_amount))
            )
            row = cursor.fetchone()
            if row:
                return dict(row)
        return None

    def save_scan(self, result: BillAnalysisResponse, filename: Optional[str] = None) -> str:
        """
        Stores structured output of a bill scan in SQLite database.
        Returns the unique scan_id.
        """
        scan_id = f"scan_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
        fields = result.fields

        # Extract structured fields safely
        merchant_name = fields.merchant_name.value if fields and fields.merchant_name else None
        merchant_confidence = fields.merchant_name.confidence if fields and fields.merchant_name else None
        merchant_reason = fields.merchant_name.reason if fields and fields.merchant_name else None

        bill_date = fields.date.value if fields and fields.date else None
        bill_date_confidence = fields.date.confidence if fields and fields.date else None
        bill_date_reason = fields.date.reason if fields and fields.date else None

        total_amount = fields.total_amount.value if fields and fields.total_amount else None
        total_amount_confidence = fields.total_amount.confidence if fields and fields.total_amount else None
        total_amount_reason = fields.total_amount.reason if fields and fields.total_amount else None

        currency = fields.currency if fields else None

        category_raw = fields.category.value if fields and fields.category else None
        if hasattr(category_raw, "value"):
            category = category_raw.value
        elif category_raw is not None:
            category = str(category_raw)
        else:
            category = None

        category_confidence = fields.category.confidence if fields and fields.category else None
        category_reason = fields.category.reason if fields and fields.category else None

        raw_json = json.dumps(result.model_dump())

        query = """
        INSERT INTO bill_scans (
            scan_id, filename, classification, classification_confidence, reason,
            non_bill_type, merchant_name, merchant_confidence, merchant_reason,
            bill_date, bill_date_confidence, bill_date_reason,
            total_amount, total_amount_confidence, total_amount_reason,
            currency, category, category_confidence, category_reason,
            raw_json, is_duplicate, created_at
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, CURRENT_TIMESTAMP
        );
        """

        is_dup_int = 1 if getattr(result, "is_duplicate", False) else 0

        params = (
            scan_id,
            filename or "bill_upload",
            result.classification.value if hasattr(result.classification, "value") else str(result.classification),
            float(result.classification_confidence),
            result.reason,
            result.non_bill_type,
            merchant_name,
            float(merchant_confidence) if merchant_confidence is not None else None,
            merchant_reason,
            bill_date,
            float(bill_date_confidence) if bill_date_confidence is not None else None,
            bill_date_reason,
            float(total_amount) if total_amount is not None else None,
            float(total_amount_confidence) if total_amount_confidence is not None else None,
            total_amount_reason,
            currency,
            str(category) if category else None,
            float(category_confidence) if category_confidence is not None else None,
            category_reason,
            raw_json,
            is_dup_int
        )

        with self._get_connection() as conn:
            conn.execute(query, params)
            conn.commit()

        logger.info("Saved scan to SQLite: scan_id=%s, merchant=%s, amount=%s", scan_id, merchant_name, total_amount)
        return scan_id

    def get_scan(self, scan_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a single scan record by scan_id."""
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM bill_scans WHERE scan_id = ?;", (scan_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
        return None

    def list_scans(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Lists saved scans ordered by most recent first."""
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM bill_scans ORDER BY id DESC LIMIT ? OFFSET ?;",
                (limit, offset)
            )
            return [dict(row) for row in cursor.fetchall()]

    def delete_scan(self, scan_id: str) -> bool:
        """Deletes a scan record by scan_id."""
        with self._get_connection() as conn:
            cursor = conn.execute("DELETE FROM bill_scans WHERE scan_id = ?;", (scan_id,))
            conn.commit()
            return cursor.rowcount > 0

    def get_stats(self) -> Dict[str, Any]:
        """Returns aggregate metrics across all scans saved in SQLite."""
        with self._get_connection() as conn:
            total_scans = conn.execute("SELECT COUNT(*) FROM bill_scans;").fetchone()[0]
            total_bills = conn.execute("SELECT COUNT(*) FROM bill_scans WHERE classification = 'BILL';").fetchone()[0]
            total_non_bills = conn.execute("SELECT COUNT(*) FROM bill_scans WHERE classification != 'BILL';").fetchone()[0]
            total_spending = conn.execute("SELECT COALESCE(SUM(total_amount), 0) FROM bill_scans WHERE classification = 'BILL';").fetchone()[0]

            return {
                "total_scans": total_scans,
                "total_bills": total_bills,
                "total_non_bills": total_non_bills,
                "total_spending": float(total_spending)
            }

# Singleton instance
db_service = DatabaseService()
