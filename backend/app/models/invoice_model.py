# app/models/invoice_model.py

from sqlalchemy import Column, Integer, String, Numeric, \
                       Date, Text, Boolean, TIMESTAMP, SmallInteger
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database.connection import Base


class SupplierInvoice(Base):
    __tablename__ = "supplier_invoices"  

    id                 = Column(Integer, primary_key=True, index=True)
    document_id        = Column(Integer, nullable=False, unique=True)
    supplier_id        = Column(Integer, nullable=False)
    validated_by       = Column(Integer)
    invoice_number     = Column(String(150), nullable=False)
    invoice_date       = Column(Date,        nullable=False)
    due_date           = Column(Date)
    currency_code      = Column(String(10),  nullable=False, default='TND')
    exchange_rate      = Column(Numeric(12, 6), default=1.000000)
    total_ht           = Column(Numeric(14, 3), default=0)
    total_vat          = Column(Numeric(14, 3), default=0)
    total_ttc          = Column(Numeric(14, 3), default=0)
    total_ttc_tnd      = Column(Numeric(14, 3), default=0)
    status             = Column(String(30), nullable=False, default='pending')
    purchase_order_ref = Column(String(150))
    delivery_note_ref  = Column(String(150))
    extra_fields       = Column(JSONB)
    rejection_reason   = Column(Text)
    notes              = Column(Text)
    created_at         = Column(TIMESTAMP, server_default=func.now())
    updated_at         = Column(TIMESTAMP, server_default=func.now())


class InvoiceItem(Base):
    __tablename__ = "invoice_items"  

    id           = Column(Integer,      primary_key=True, index=True)
    invoice_id   = Column(Integer,      nullable=False)
    line_number  = Column(SmallInteger, nullable=False)
    item_code    = Column(String(100))
    description  = Column(Text,         nullable=False)
    unit         = Column(String(40))
    quantity     = Column(Numeric(10, 3), nullable=False, default=1)
    unit_price   = Column(Numeric(14, 3), nullable=False, default=0)
    discount_pct = Column(Numeric(5, 2),  default=0)
    line_total   = Column(Numeric(14, 3), nullable=False, default=0)
    vat_rate     = Column(Numeric(5, 2),  default=0)
    vat_amount   = Column(Numeric(14, 3), default=0)