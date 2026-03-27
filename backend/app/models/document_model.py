# app/models/document_model.py

from sqlalchemy import Column, Integer, String, Boolean, \
                       Numeric, TIMESTAMP, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database.connection import Base


class Document(Base):
    __tablename__ = "documents"

    id                        = Column(Integer, primary_key=True, index=True)
    uploaded_by               = Column(Integer, nullable=False)
    file_name                 = Column(String(300), nullable=False)
    file_path                 = Column(String(600), nullable=False)
    file_type                 = Column(String(15),  nullable=False)
    file_size_kb              = Column(Integer)
    file_hash                 = Column(String(64),  unique=True)
    document_type             = Column(String(30))
    classification_confidence = Column(Numeric(5, 2))

    # ✅ Simple String — pas de ForeignKey
    # Les FK existent dans PostgreSQL mais pas besoin dans SQLAlchemy
    detected_language         = Column(String(10))
    detected_currency         = Column(String(10))

    status                    = Column(String(30),
                                       nullable=False,
                                       default="uploaded")
    is_duplicate              = Column(Boolean, default=False)
    duplicate_of_id           = Column(Integer)
    created_at                = Column(TIMESTAMP,
                                       server_default=func.now())
    updated_at                = Column(TIMESTAMP,
                                       server_default=func.now())


class OcrResult(Base):
    __tablename__ = "ocr_results"

    id                    = Column(Integer, primary_key=True, index=True)
    document_id           = Column(Integer, nullable=False, unique=True)
    ocr_engine            = Column(String(60), default="PaddleOCR")
    ocr_version           = Column(String(20), default="PP-OCRv4")
    processing_time_ms    = Column(Integer)
    ocr_confidence        = Column(Numeric(5, 2))
    extraction_confidence = Column(Numeric(5, 2))
    ocr_status            = Column(String(20), default="success")
    raw_text              = Column(Text)
    extracted_json        = Column(JSONB)
    low_confidence_fields = Column(JSONB)
    error_message         = Column(Text)
    processed_at          = Column(TIMESTAMP,
                                   server_default=func.now())

