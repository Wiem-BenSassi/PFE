# app/models/receipt_model.py
# ============================================================
# Modèle SQLAlchemy pour expense_receipts
# ============================================================

from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    Date, Text, ForeignKey, TIMESTAMP, Numeric
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database.connection import Base


class ExpenseReceipt(Base):
    __tablename__ = "expense_receipts"

    id           = Column(Integer,      primary_key=True, index=True)
    document_id  = Column(Integer,      ForeignKey("documents.id"),          nullable=False)
    submitted_by = Column(Integer,      ForeignKey("users.id"),              nullable=False)
    approved_by  = Column(Integer,      ForeignKey("users.id"),              nullable=True)
    threshold_id = Column(Integer,      ForeignKey("expense_thresholds.id"), nullable=True)

    receipt_number = Column(String(100), nullable=True)
    receipt_date   = Column(Date,        nullable=True)
    receipt_time   = Column(String(20),  nullable=True)

    merchant_name    = Column(String(300), nullable=True)
    merchant_city    = Column(String(150), nullable=True)
    merchant_country = Column(String(100), nullable=True)

    currency_code        = Column(String(10),    nullable=True, default="TND")
    exchange_rate_to_tnd = Column(Numeric(14, 6), nullable=True, default=1.0)
    total_amount         = Column(Numeric(14, 3), nullable=True)
    total_amount_tnd     = Column(Numeric(14, 3), nullable=True)
    tax_amount           = Column(Numeric(14, 3), nullable=True, default=0)
    tip_amount           = Column(Numeric(14, 3), nullable=True, default=0)

    payment_method = Column(String(50),  nullable=True)
    category_code  = Column(String(50),  nullable=True, default="other")
    category_source= Column(String(20),  nullable=True, default="ai")

    threshold_result     = Column(String(30),    nullable=True)
    threshold_amount_tnd = Column(Numeric(14, 3), nullable=True)

    status           = Column(String(30), nullable=True, default="pending")
    rejection_reason = Column(Text,       nullable=True)
    notes            = Column(Text,       nullable=True)

    extracted_data = Column(JSONB,   nullable=True)
    is_duplicate   = Column(Boolean, nullable=False, default=False)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<ExpenseReceipt id={self.id} merchant={self.merchant_name} amount={self.total_amount}>"
