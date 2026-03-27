-- ============================================================
-- PFE — Financial Document Processing System
-- Database: pfe_financial_docs
-- Author: Wiem
-- Description: Supplier Invoices + Expense Receipts Module
-- Version: FINAL — All relations corrected
-- ============================================================

-- ============================================================
-- STEP 1: DROP TABLES (safe re-run)
-- ============================================================

DROP TABLE IF EXISTS invoice_items          CASCADE;
DROP TABLE IF EXISTS supplier_invoices      CASCADE;
DROP TABLE IF EXISTS expense_receipts       CASCADE;
DROP TABLE IF EXISTS expense_reports        CASCADE;
DROP TABLE IF EXISTS ocr_results            CASCADE;
DROP TABLE IF EXISTS documents              CASCADE;
DROP TABLE IF EXISTS expense_thresholds     CASCADE;
DROP TABLE IF EXISTS expense_categories     CASCADE;
DROP TABLE IF EXISTS suppliers              CASCADE;
DROP TABLE IF EXISTS currencies             CASCADE;
DROP TABLE IF EXISTS languages              CASCADE;
DROP TABLE IF EXISTS users                  CASCADE;

-- ============================================================
-- STEP 2: REFERENCE TABLES
-- ============================================================


-- ------------------------------------------------------------
-- Table 1: users
-- ------------------------------------------------------------
CREATE TABLE users (
    id       SERIAL        PRIMARY KEY,
    username VARCHAR(100),
    email    VARCHAR(150)  UNIQUE,
    password VARCHAR(255),
    role     VARCHAR(50)
);

INSERT INTO users (username, email, password, role) VALUES
('François-Xavier Lemasson', 'dga@vernicolor.tn',               'DGA456',    'Directeur Générale'),
('Houssem_Jebali',           'Houssem@vernicolor.tn',            'Houssem123','Responsable IT'),
('Utilisateur_Comptable',    'Comptable@vernicolor.tn',          'comp000',   'Comptable'),
('Amine',                    'ResponsableFinan@vernicolor.tn',   'Resp963',   'Responsable Financière'),
('Yasmine_Mamlouk',          'Yasmine@vernicolor.tn',            'Jasmine88', 'stagiaire 1'),
('Wiem_BenSassi',            'Wiem@vernicolor.tn',               'Wiem55',    'stagiaire 2');

-- ------------------------------------------------------------
-- Table 2: languages
-- ------------------------------------------------------------
CREATE TABLE languages (
    id          SERIAL       PRIMARY KEY,
    code        VARCHAR(10)  NOT NULL UNIQUE,  -- 'fr','en','ar','es','it','de'
    name_en     VARCHAR(100) NOT NULL,
    name_native VARCHAR(100),
    is_rtl      BOOLEAN      DEFAULT FALSE,    -- TRUE for Arabic
    is_active   BOOLEAN      DEFAULT TRUE
);

INSERT INTO languages (code, name_en, name_native, is_rtl) VALUES
('fr', 'French',  'Français', FALSE),
('en', 'English', 'English',  FALSE),
('ar', 'Arabic',  'العربية',   TRUE),
('es', 'Spanish', 'Español',  FALSE),
('it', 'Italian', 'Italiano', FALSE),
('de', 'German',  'Deutsch',  FALSE);

-- ------------------------------------------------------------
-- Table 3: currencies
-- ------------------------------------------------------------
CREATE TABLE currencies (
    id             SERIAL       PRIMARY KEY,
    code           VARCHAR(10)  NOT NULL UNIQUE,  -- ISO 4217: 'TND','EUR','USD'
    name_en        VARCHAR(100) NOT NULL,
    symbol         VARCHAR(15)  NOT NULL,          -- '€','$','£','TND'
    decimal_places SMALLINT     DEFAULT 2,         -- TND=3, most=2
    is_active      BOOLEAN      DEFAULT TRUE
);

INSERT INTO currencies (code, name_en, symbol, decimal_places) VALUES
('TND', 'Tunisian Dinar', 'TND', 3),
('EUR', 'Euro',           '€',   2),
('USD', 'US Dollar',      '$',   2),
('GBP', 'British Pound',  '£',   2),
('CHF', 'Swiss Franc',    'CHF', 2);

-- ------------------------------------------------------------
-- Table 4: suppliers
-- ------------------------------------------------------------
CREATE TABLE suppliers (
    id         SERIAL       PRIMARY KEY,
    name       VARCHAR(300) NOT NULL,
    tax_id     VARCHAR(100),
    email      VARCHAR(200),
    phone      VARCHAR(60),
    address    TEXT,
    city       VARCHAR(150),
    country    VARCHAR(100) DEFAULT 'Tunisie',
    is_active  BOOLEAN      DEFAULT TRUE,
    created_by INTEGER      NOT NULL
                            REFERENCES users(id)
                            ON DELETE RESTRICT,
    -- FK activée vers users
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suppliers_name   ON suppliers(name);
CREATE INDEX idx_suppliers_tax_id ON suppliers(tax_id);

-- ------------------------------------------------------------
-- Table 5: expense_categories
-- ------------------------------------------------------------
CREATE TABLE expense_categories (
    id        SERIAL       PRIMARY KEY,
    code      VARCHAR(60)  NOT NULL UNIQUE,
    label_en  VARCHAR(150) NOT NULL,
    label_fr  VARCHAR(150),
    label_ar  VARCHAR(150),
    icon      VARCHAR(50),                      -- for React frontend icons
    is_active BOOLEAN      DEFAULT TRUE
);

INSERT INTO expense_categories (code, label_en, label_fr, icon) VALUES
('restaurant', 'Restaurant',        'Restauration',     'utensils'),
('cafe',       'Café / Coffee',     'Café',             'coffee'),
('taxi',       'Taxi / Ride-share', 'Taxi / VTC',       'car'),
('fuel',       'Fuel / Petrol',     'Carburant',        'fuel-pump'),
('parking',    'Parking',           'Parking',          'parking'),
('toll',       'Toll / Highway',    'Péage',            'road'),
('hotel',      'Hotel / Lodging',   'Hébergement',      'bed'),
('supermarket','Supermarket',       'Supermarché',      'cart'),
('transport',  'Public Transport',  'Transport commun', 'train'),
('office',     'Office Supplies',   'Fournitures',      'clipboard'),
('other',      'Other',             'Autre',            'dots');

-- NOTE: expense_receipts.category_code references this table
-- via a SOFT reference (plain VARCHAR, no FK constraint).
-- This allows NULL and unknown categories without errors.

-- ------------------------------------------------------------
-- Table 6: expense_thresholds
-- ------------------------------------------------------------
CREATE TABLE expense_thresholds (
    id                     SERIAL        PRIMARY KEY,
    role_name              VARCHAR(100)  NOT NULL UNIQUE,
    max_amount_tnd         NUMERIC(12,3) NOT NULL,
    auto_approve_below_tnd NUMERIC(12,3),
    is_active              BOOLEAN       DEFAULT TRUE,
    updated_at             TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO expense_thresholds
    (role_name, max_amount_tnd, auto_approve_below_tnd) VALUES
('Directeur Générale',    5000.000, 1000.000),
('Responsable IT',         500.000,  100.000),
('Comptable',             1000.000,  200.000),
('Responsable Financière',1000.000,  200.000),
('stagiaire 1',            100.000,   30.000),
('stagiaire 2',            100.000,   30.000);

-- HOW IT WORKS IN FASTAPI:
-- 1. Receipt submitted: total_amount_tnd = 45 TND, role = 'employee'
-- 2. SELECT * FROM expense_thresholds WHERE role_name = 'employee'
--    → max = 100, auto_approve = 30
-- 3. 45 > 30  → cannot auto-approve
-- 4. 45 ≤ 100 → not auto-rejected → status = 'pending_approval'
--
-- If total = 150 TND, role = 'employee':
-- 5. 150 > 100 → AUTO-REJECTED → status = 'auto_rejected'

-- ============================================================
-- STEP 3: CORE DOCUMENT TABLE
-- ============================================================

-- ------------------------------------------------------------
-- Table 7: documents  ← SINGLE ENTRY POINT FOR ALL UPLOADS
-- ------------------------------------------------------------
CREATE TABLE documents (
    id                        SERIAL       PRIMARY KEY,

    uploaded_by               INTEGER      NOT NULL
                                           REFERENCES users(id)
                                           ON DELETE RESTRICT,
    -- FK activée vers users

    file_name                 VARCHAR(300) NOT NULL,
    file_path                 VARCHAR(600) NOT NULL,
    file_type                 VARCHAR(15)  NOT NULL,
    file_size_kb              INTEGER,
    file_hash                 VARCHAR(64)  UNIQUE,

    document_type             VARCHAR(30),
    classification_confidence NUMERIC(5,2),

    detected_language         VARCHAR(10)
                              REFERENCES languages(code)
                              ON UPDATE CASCADE
                              ON DELETE SET NULL,

    detected_currency         VARCHAR(10)
                              REFERENCES currencies(code)
                              ON UPDATE CASCADE
                              ON DELETE SET NULL,

    status                    VARCHAR(30)  NOT NULL DEFAULT 'uploaded',

    is_duplicate              BOOLEAN      DEFAULT FALSE,
    duplicate_of_id           INTEGER
                              REFERENCES documents(id)
                              ON DELETE SET NULL,

    created_at                TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_type        ON documents(document_type);
CREATE INDEX idx_documents_status      ON documents(status);
CREATE INDEX idx_documents_hash        ON documents(file_hash);
CREATE INDEX idx_documents_language    ON documents(detected_language);
CREATE INDEX idx_documents_currency    ON documents(detected_currency);

-- ============================================================
-- STEP 4: OCR RESULTS
-- ============================================================

-- ------------------------------------------------------------
-- Table 8: ocr_results
-- ------------------------------------------------------------
CREATE TABLE ocr_results (
    id                    SERIAL      PRIMARY KEY,
    document_id           INTEGER     NOT NULL UNIQUE
                                      REFERENCES documents(id)
                                      ON DELETE CASCADE,
    -- 1-to-1 with documents
    -- CASCADE: if document deleted → ocr_result deleted too

    ocr_engine            VARCHAR(60) DEFAULT 'PaddleOCR',
    ocr_version           VARCHAR(20),                   -- '2.7.0'
    processed_at          TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    processing_time_ms    INTEGER,                       -- duration in ms

    -- Quality scores (0–100)
    ocr_confidence        NUMERIC(5,2),                  -- OCR text quality
    extraction_confidence NUMERIC(5,2),                  -- AI field extraction
    ocr_status            VARCHAR(20) DEFAULT 'success',
    -- 'success' | 'partial' | 'failed' | 'low_quality'

    -- OCR output
    raw_text              TEXT,
    -- Full unmodified text extracted by PaddleOCR

    extracted_json        JSONB,
    -- Structured fields extracted by AI
    -- Pre-fills supplier_invoices or expense_receipts forms
    /*
      Supplier invoice example:
      {
        "invoice_number": "FC 2025-03327",
        "invoice_date":   "2025-05-27",
        "supplier_name":  "ATVYL Tunisie",
        "total_ht":        320.00,
        "total_vat":         0.00,
        "total_ttc":       320.00,
        "currency":        "EUR"
      }

      Expense receipt example (Uber):
      {
        "merchant_name":  "Uber",
        "receipt_date":   "2025-05-23",
        "total_amount":    14.65,
        "currency":       "USD",
        "payment_method": "card",
        "category":       "taxi"
      }
    */

    low_confidence_fields JSONB,
    -- Fields the AI was uncertain about → highlighted in React UI
    /*
      [
        {
          "field":      "total_amount",
          "raw_value":  "23,000",
          "normalized":  23.000,
          "confidence": 65.0,
          "issue":      "ambiguous — interpreted as TND with 3 decimals"
        }
      ]
    */

    error_message         TEXT
    -- Filled only if ocr_status = 'failed'
);

CREATE INDEX idx_ocr_document ON ocr_results(document_id);

-- ============================================================
-- STEP 5: SUPPLIER INVOICES
-- ============================================================

-- ------------------------------------------------------------
-- Table 9: supplier_invoices
-- ------------------------------------------------------------
CREATE TABLE supplier_invoices (
    id                 SERIAL        PRIMARY KEY,

    document_id        INTEGER       NOT NULL UNIQUE
                                     REFERENCES documents(id)
                                     ON DELETE RESTRICT,

    supplier_id        INTEGER       NOT NULL
                                     REFERENCES suppliers(id)
                                     ON DELETE RESTRICT,

    validated_by       INTEGER
                                     REFERENCES users(id)
                                     ON DELETE SET NULL,
    -- FK activée vers users

    invoice_number     VARCHAR(150)  NOT NULL,
    invoice_date       DATE          NOT NULL,
    due_date           DATE,

    currency_code      VARCHAR(10)   NOT NULL
                                     REFERENCES currencies(code)
                                     ON UPDATE CASCADE
                                     ON DELETE RESTRICT,
    exchange_rate      NUMERIC(12,6) DEFAULT 1.000000,

    total_ht           NUMERIC(14,3) DEFAULT 0,
    total_vat          NUMERIC(14,3) DEFAULT 0,
    total_ttc          NUMERIC(14,3) DEFAULT 0,
    total_ttc_tnd      NUMERIC(14,3) DEFAULT 0,

    status             VARCHAR(30)   NOT NULL DEFAULT 'pending',

    purchase_order_ref VARCHAR(150),
    delivery_note_ref  VARCHAR(150),
    extra_fields       JSONB,
    rejection_reason   TEXT,
    notes              TEXT,
    created_at         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_invoice_supplier
        UNIQUE (invoice_number, supplier_id)
);

CREATE INDEX idx_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX idx_invoices_status   ON supplier_invoices(status);
CREATE INDEX idx_invoices_date     ON supplier_invoices(invoice_date);
CREATE INDEX idx_invoices_document ON supplier_invoices(document_id);

-- ------------------------------------------------------------
-- Table 10: invoice_items
-- ------------------------------------------------------------
CREATE TABLE invoice_items (
    id           SERIAL        PRIMARY KEY,
    invoice_id   INTEGER       NOT NULL
                               REFERENCES supplier_invoices(id)
                               ON DELETE CASCADE,
    -- CASCADE: if invoice deleted → items deleted too

    line_number  SMALLINT      NOT NULL,
    item_code    VARCHAR(100),                   -- supplier article code
    description  TEXT          NOT NULL,
    unit         VARCHAR(40),                    -- 'Pièce','kg','forfait'
    quantity     NUMERIC(10,3) NOT NULL DEFAULT 1,
    unit_price   NUMERIC(14,3) NOT NULL DEFAULT 0,
    discount_pct NUMERIC(5,2)  DEFAULT 0,        -- discount % on this line
    line_total   NUMERIC(14,3) NOT NULL DEFAULT 0,
    vat_rate     NUMERIC(5,2)  DEFAULT 0,        -- 0 | 7 | 12 | 19
    vat_amount   NUMERIC(14,3) DEFAULT 0,

    CONSTRAINT chk_qty CHECK (quantity > 0)
);

CREATE INDEX idx_invoice_items ON invoice_items(invoice_id);

-- ============================================================
-- STEP 6: EXPENSE RECEIPTS
-- ============================================================

-- ------------------------------------------------------------
-- Table 11: expense_reports
-- ------------------------------------------------------------
CREATE TABLE expense_reports (
    id               SERIAL        PRIMARY KEY,

    submitted_by     INTEGER       NOT NULL
                                   REFERENCES users(id)
                                   ON DELETE RESTRICT,
    -- FK activée vers users

    approved_by      INTEGER
                                   REFERENCES users(id)
                                   ON DELETE SET NULL,
    -- FK activée vers users

    title            VARCHAR(300)  NOT NULL,
    period_start     DATE,
    period_end       DATE,
    total_amount_tnd NUMERIC(14,3) DEFAULT 0,
    receipt_count    INTEGER       DEFAULT 0,

    status           VARCHAR(30)   NOT NULL DEFAULT 'draft',

    submitted_at     TIMESTAMP,
    approved_at      TIMESTAMP,
    rejection_reason TEXT,
    notes            TEXT,
    created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_user   ON expense_reports(submitted_by);
CREATE INDEX idx_reports_status ON expense_reports(status);

-- ------------------------------------------------------------
-- Table 12: expense_receipts  ← CORE TABLE
-- ------------------------------------------------------------
CREATE TABLE expense_receipts (
    id                   SERIAL        PRIMARY KEY,

    document_id          INTEGER       NOT NULL UNIQUE
                                       REFERENCES documents(id)
                                       ON DELETE RESTRICT,

    report_id            INTEGER
                                       REFERENCES expense_reports(id)
                                       ON DELETE SET NULL,

    threshold_id         INTEGER
                                       REFERENCES expense_thresholds(id)
                                       ON DELETE SET NULL,

    submitted_by         INTEGER       NOT NULL
                                       REFERENCES users(id)
                                       ON DELETE RESTRICT,
    -- FK activée vers users

    approved_by          INTEGER
                                       REFERENCES users(id)
                                       ON DELETE SET NULL,
    -- FK activée vers users

    receipt_number       VARCHAR(200),
    receipt_date         DATE,
    receipt_time         TIME,

    merchant_name        VARCHAR(300),
    merchant_country     VARCHAR(100),
    merchant_city        VARCHAR(150),

    currency_code        VARCHAR(10)
                                       REFERENCES currencies(code)
                                       ON UPDATE CASCADE
                                       ON DELETE SET NULL,
    exchange_rate_to_tnd NUMERIC(12,6) DEFAULT 1.000000,

    total_amount         NUMERIC(14,3) NOT NULL,
    total_amount_tnd     NUMERIC(14,3),
    tax_amount           NUMERIC(14,3) DEFAULT 0,
    tip_amount           NUMERIC(14,3) DEFAULT 0,

    payment_method       VARCHAR(50),
    category_code        VARCHAR(60),
    category_source      VARCHAR(20)   DEFAULT 'ai',

    threshold_result     VARCHAR(30),
    threshold_amount_tnd NUMERIC(14,3),

    status               VARCHAR(30)   NOT NULL DEFAULT 'pending',

    extracted_data       JSONB,
    is_duplicate         BOOLEAN       DEFAULT FALSE,
    rejection_reason     TEXT,
    notes                TEXT,
    created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receipts_document  ON expense_receipts(document_id);
CREATE INDEX idx_receipts_report    ON expense_receipts(report_id);
CREATE INDEX idx_receipts_threshold ON expense_receipts(threshold_id);
CREATE INDEX idx_receipts_user      ON expense_receipts(submitted_by);
CREATE INDEX idx_receipts_status    ON expense_receipts(status);
CREATE INDEX idx_receipts_category  ON expense_receipts(category_code);
CREATE INDEX idx_receipts_currency  ON expense_receipts(currency_code);
CREATE INDEX idx_receipts_json
    ON expense_receipts USING GIN(extracted_data);

-- ============================================================
-- STEP 7: VERIFY ALL TABLES AND RELATIONS
-- ============================================================

-- Check all tables were created with column counts
SELECT
    t.table_name                                        AS "Table",
    COUNT(c.column_name)                                AS "Columns"
FROM information_schema.tables      t
JOIN information_schema.columns     c
    ON t.table_name = c.table_name
   AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
  AND t.table_type   = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;

-- Check all foreign key relations
SELECT
    tc.table_name        AS "Table",
    kcu.column_name      AS "FK Column",
    ccu.table_name       AS "References Table",
    ccu.column_name      AS "References Column"
FROM information_schema.table_constraints           tc
JOIN information_schema.key_column_usage            kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema    = kcu.table_schema
JOIN information_schema.constraint_column_usage     ccu
    ON tc.constraint_name = ccu.constraint_name
   AND tc.table_schema    = ccu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema    = 'public'
ORDER BY tc.table_name, kcu.column_name;