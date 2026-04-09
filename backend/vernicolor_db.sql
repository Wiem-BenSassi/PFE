--
-- PostgreSQL database dump
--

\restrict vfQWyfX69CNpYfKQT80bzns2aE6SLJ9iXXCo3YfzNhrW5zgnQ27j0dZtzudq9Gn

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-07 16:23:48

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 16431)
-- Name: currencies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.currencies (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name_en character varying(100) NOT NULL,
    symbol character varying(15) NOT NULL,
    decimal_places smallint DEFAULT 2,
    is_active boolean DEFAULT true
);


ALTER TABLE public.currencies OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16430)
-- Name: currencies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.currencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.currencies_id_seq OWNER TO postgres;

--
-- TOC entry 5232 (class 0 OID 0)
-- Dependencies: 221
-- Name: currencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.currencies_id_seq OWNED BY public.currencies.id;


--
-- TOC entry 230 (class 1259 OID 16497)
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    uploaded_by integer NOT NULL,
    file_name character varying(300) NOT NULL,
    file_path character varying(600) NOT NULL,
    file_type character varying(15) NOT NULL,
    file_size_kb integer,
    file_hash character varying(64),
    document_type character varying(30),
    classification_confidence numeric(5,2),
    detected_language character varying(10),
    detected_currency character varying(10),
    status character varying(30) DEFAULT 'uploaded'::character varying NOT NULL,
    is_duplicate boolean DEFAULT false,
    duplicate_of_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16496)
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO postgres;

--
-- TOC entry 5233 (class 0 OID 0)
-- Dependencies: 229
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- TOC entry 226 (class 1259 OID 16468)
-- Name: expense_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_categories (
    id integer NOT NULL,
    code character varying(60) NOT NULL,
    label_en character varying(150) NOT NULL,
    label_fr character varying(150),
    label_ar character varying(150),
    icon character varying(50),
    is_active boolean DEFAULT true
);


ALTER TABLE public.expense_categories OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16467)
-- Name: expense_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expense_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_categories_id_seq OWNER TO postgres;

--
-- TOC entry 5234 (class 0 OID 0)
-- Dependencies: 225
-- Name: expense_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expense_categories_id_seq OWNED BY public.expense_categories.id;


--
-- TOC entry 240 (class 1259 OID 16677)
-- Name: expense_receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_receipts (
    id integer NOT NULL,
    document_id integer NOT NULL,
    report_id integer,
    threshold_id integer,
    submitted_by integer NOT NULL,
    approved_by integer,
    receipt_number character varying(200),
    receipt_date date,
    receipt_time time without time zone,
    merchant_name character varying(300),
    merchant_country character varying(100),
    merchant_city character varying(150),
    currency_code character varying(10),
    exchange_rate_to_tnd numeric(12,6) DEFAULT 1.000000,
    total_amount numeric(14,3) NOT NULL,
    total_amount_tnd numeric(14,3),
    tax_amount numeric(14,3) DEFAULT 0,
    tip_amount numeric(14,3) DEFAULT 0,
    payment_method character varying(50),
    category_code character varying(60),
    category_source character varying(20) DEFAULT 'ai'::character varying,
    threshold_result character varying(30),
    threshold_amount_tnd numeric(14,3),
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    extracted_data jsonb,
    is_duplicate boolean DEFAULT false,
    rejection_reason text,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    currency_detection_method character varying(50)
);


ALTER TABLE public.expense_receipts OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16676)
-- Name: expense_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expense_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_receipts_id_seq OWNER TO postgres;

--
-- TOC entry 5235 (class 0 OID 0)
-- Dependencies: 239
-- Name: expense_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expense_receipts_id_seq OWNED BY public.expense_receipts.id;


--
-- TOC entry 238 (class 1259 OID 16647)
-- Name: expense_reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_reports (
    id integer NOT NULL,
    submitted_by integer NOT NULL,
    approved_by integer,
    title character varying(300) NOT NULL,
    period_start date,
    period_end date,
    total_amount_tnd numeric(14,3) DEFAULT 0,
    receipt_count integer DEFAULT 0,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    submitted_at timestamp without time zone,
    approved_at timestamp without time zone,
    rejection_reason text,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.expense_reports OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16646)
-- Name: expense_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expense_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_reports_id_seq OWNER TO postgres;

--
-- TOC entry 5236 (class 0 OID 0)
-- Dependencies: 237
-- Name: expense_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expense_reports_id_seq OWNED BY public.expense_reports.id;


--
-- TOC entry 228 (class 1259 OID 16483)
-- Name: expense_thresholds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_thresholds (
    id integer NOT NULL,
    role_name character varying(100) NOT NULL,
    max_amount_tnd numeric(12,3) NOT NULL,
    auto_approve_below_tnd numeric(12,3),
    is_active boolean DEFAULT true,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.expense_thresholds OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16482)
-- Name: expense_thresholds_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expense_thresholds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expense_thresholds_id_seq OWNER TO postgres;

--
-- TOC entry 5237 (class 0 OID 0)
-- Dependencies: 227
-- Name: expense_thresholds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expense_thresholds_id_seq OWNED BY public.expense_thresholds.id;


--
-- TOC entry 236 (class 1259 OID 16618)
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    line_number smallint NOT NULL,
    item_code character varying(100),
    description text NOT NULL,
    unit character varying(40),
    quantity numeric(10,3) DEFAULT 1 NOT NULL,
    unit_price numeric(14,3) DEFAULT 0 NOT NULL,
    discount_pct numeric(5,2) DEFAULT 0,
    line_total numeric(14,3) DEFAULT 0 NOT NULL,
    vat_rate numeric(5,2) DEFAULT 0,
    vat_amount numeric(14,3) DEFAULT 0,
    CONSTRAINT chk_qty CHECK ((quantity > (0)::numeric))
);


ALTER TABLE public.invoice_items OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16617)
-- Name: invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_items_id_seq OWNER TO postgres;

--
-- TOC entry 5238 (class 0 OID 0)
-- Dependencies: 235
-- Name: invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoice_items_id_seq OWNED BY public.invoice_items.id;


--
-- TOC entry 242 (class 1259 OID 16741)
-- Name: languages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.languages (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name_en character varying(100) NOT NULL,
    name_native character varying(100),
    is_rtl boolean DEFAULT false,
    is_active boolean DEFAULT true
);


ALTER TABLE public.languages OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16740)
-- Name: languages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.languages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.languages_id_seq OWNER TO postgres;

--
-- TOC entry 5239 (class 0 OID 0)
-- Dependencies: 241
-- Name: languages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.languages_id_seq OWNED BY public.languages.id;


--
-- TOC entry 232 (class 1259 OID 16544)
-- Name: ocr_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ocr_results (
    id integer NOT NULL,
    document_id integer NOT NULL,
    ocr_engine character varying(60) DEFAULT 'PaddleOCR'::character varying,
    ocr_version character varying(20),
    processed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processing_time_ms integer,
    ocr_confidence numeric(5,2),
    extraction_confidence numeric(5,2),
    ocr_status character varying(20) DEFAULT 'success'::character varying,
    raw_text text,
    extracted_json jsonb,
    low_confidence_fields jsonb,
    error_message text
);


ALTER TABLE public.ocr_results OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16543)
-- Name: ocr_results_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ocr_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ocr_results_id_seq OWNER TO postgres;

--
-- TOC entry 5240 (class 0 OID 0)
-- Dependencies: 231
-- Name: ocr_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ocr_results_id_seq OWNED BY public.ocr_results.id;


--
-- TOC entry 234 (class 1259 OID 16566)
-- Name: supplier_invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supplier_invoices (
    id integer NOT NULL,
    document_id integer NOT NULL,
    supplier_id integer NOT NULL,
    validated_by integer,
    invoice_number character varying(150) NOT NULL,
    invoice_date date NOT NULL,
    due_date date,
    currency_code character varying(10) NOT NULL,
    exchange_rate numeric(12,6) DEFAULT 1.000000,
    total_ht numeric(14,3) DEFAULT 0,
    total_vat numeric(14,3) DEFAULT 0,
    total_ttc numeric(14,3) DEFAULT 0,
    total_ttc_tnd numeric(14,3) DEFAULT 0,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    purchase_order_ref character varying(150),
    delivery_note_ref character varying(150),
    extra_fields jsonb,
    rejection_reason text,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    needs_review boolean DEFAULT false
);


ALTER TABLE public.supplier_invoices OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16565)
-- Name: supplier_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supplier_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supplier_invoices_id_seq OWNER TO postgres;

--
-- TOC entry 5241 (class 0 OID 0)
-- Dependencies: 233
-- Name: supplier_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supplier_invoices_id_seq OWNED BY public.supplier_invoices.id;


--
-- TOC entry 224 (class 1259 OID 16446)
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying(300) NOT NULL,
    tax_id character varying(100),
    email character varying(200),
    phone character varying(60),
    address text,
    city character varying(150),
    country character varying(100) DEFAULT 'Tunisie'::character varying,
    is_active boolean DEFAULT true,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16445)
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- TOC entry 5242 (class 0 OID 0)
-- Dependencies: 223
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- TOC entry 220 (class 1259 OID 16405)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(100),
    email character varying(150),
    password character varying(255),
    role character varying(50),
    is_active boolean DEFAULT true
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16404)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5243 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4913 (class 2604 OID 16434)
-- Name: currencies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currencies ALTER COLUMN id SET DEFAULT nextval('public.currencies_id_seq'::regclass);


--
-- TOC entry 4925 (class 2604 OID 16500)
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- TOC entry 4920 (class 2604 OID 16471)
-- Name: expense_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories ALTER COLUMN id SET DEFAULT nextval('public.expense_categories_id_seq'::regclass);


--
-- TOC entry 4957 (class 2604 OID 16680)
-- Name: expense_receipts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_receipts ALTER COLUMN id SET DEFAULT nextval('public.expense_receipts_id_seq'::regclass);


--
-- TOC entry 4951 (class 2604 OID 16650)
-- Name: expense_reports id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_reports ALTER COLUMN id SET DEFAULT nextval('public.expense_reports_id_seq'::regclass);


--
-- TOC entry 4922 (class 2604 OID 16486)
-- Name: expense_thresholds id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_thresholds ALTER COLUMN id SET DEFAULT nextval('public.expense_thresholds_id_seq'::regclass);


--
-- TOC entry 4944 (class 2604 OID 16621)
-- Name: invoice_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items ALTER COLUMN id SET DEFAULT nextval('public.invoice_items_id_seq'::regclass);


--
-- TOC entry 4966 (class 2604 OID 16744)
-- Name: languages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.languages ALTER COLUMN id SET DEFAULT nextval('public.languages_id_seq'::regclass);


--
-- TOC entry 4930 (class 2604 OID 16547)
-- Name: ocr_results id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ocr_results ALTER COLUMN id SET DEFAULT nextval('public.ocr_results_id_seq'::regclass);


--
-- TOC entry 4934 (class 2604 OID 16569)
-- Name: supplier_invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices ALTER COLUMN id SET DEFAULT nextval('public.supplier_invoices_id_seq'::regclass);


--
-- TOC entry 4916 (class 2604 OID 16449)
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- TOC entry 4911 (class 2604 OID 16408)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5206 (class 0 OID 16431)
-- Dependencies: 222
-- Data for Name: currencies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.currencies (id, code, name_en, symbol, decimal_places, is_active) FROM stdin;
1	TND	Tunisian Dinar	TND	3	t
2	EUR	Euro	€	2	t
3	USD	US Dollar	$	2	t
4	GBP	British Pound	£	2	t
5	CHF	Swiss Franc	CHF	2	t
\.


--
-- TOC entry 5214 (class 0 OID 16497)
-- Dependencies: 230
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, uploaded_by, file_name, file_path, file_type, file_size_kb, file_hash, document_type, classification_confidence, detected_language, detected_currency, status, is_duplicate, duplicate_of_id, created_at, updated_at) FROM stdin;
1	3	VERNICOLOR_TUNIS.pdf	uploads\\VERNICOLOR_TUNIS.pdf	application/pdf	317	f90b1199d94606ecc3515e745e357237bf3fff9e5ea2a53d568199f5b4b1a7cb	\N	\N	\N	\N	validated	f	\N	2026-04-07 14:41:18.172241	2026-04-07 14:41:18.172241
2	3	meria_pub.jpg	uploads\\meria_pub.jpg	image/jpeg	129	2272839577d4b45cebac6fd2661cdc64806d33440201a01582519dc6af0ac14b	\N	\N	\N	\N	validated	f	\N	2026-04-07 14:44:14.599474	2026-04-07 14:44:14.599474
3	3	Elpro.jpg	uploads\\Elpro.jpg	image/jpeg	74	e307887cd0ddbb78253d415edc76d932a679fbbbd5cda9d569d09992e9f2e920	\N	\N	\N	\N	ocr_processing	f	\N	2026-04-07 16:12:59.233384	2026-04-07 16:12:59.233384
4	3	space1.jpg	uploads\\space1.jpg	image/jpeg	114	3d988abebf20083cfbefec2c08db86c74981c6de285f79982a6a2c6363aec138	\N	\N	\N	\N	validated	f	\N	2026-04-07 16:14:07.826357	2026-04-07 16:14:07.826357
5	3	cdf6ab6b-3fec-406a-88a4-676e01324f7b.jpg	uploads\\cdf6ab6b-3fec-406a-88a4-676e01324f7b.jpg	image/jpeg	30	506b83c89216366178ab7ea573e49ffe71c882ae0f8af7bb9b889473791a7964	expense_receipt	59.20	fr	TND	validated	f	\N	2026-04-07 16:18:49.824466	2026-04-07 16:18:49.824466
6	3	870256ba-0fa9-46d5-998d-a5a08c0dbb75.jpg	uploads\\870256ba-0fa9-46d5-998d-a5a08c0dbb75.jpg	image/jpeg	312	01ffc41f634102cafa5f321bf15600623271d7fbfb4a327cbe02d932100b117c	expense_receipt	49.10	fr	TND	validated	f	\N	2026-04-07 16:21:20.663008	2026-04-07 16:21:20.663008
\.


--
-- TOC entry 5210 (class 0 OID 16468)
-- Dependencies: 226
-- Data for Name: expense_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_categories (id, code, label_en, label_fr, label_ar, icon, is_active) FROM stdin;
1	restaurant	Restaurant	Restauration	\N	utensils	t
2	cafe	Café / Coffee	Café	\N	coffee	t
3	taxi	Taxi / Ride-share	Taxi / VTC	\N	car	t
4	fuel	Fuel / Petrol	Carburant	\N	fuel-pump	t
5	parking	Parking	Parking	\N	parking	t
6	toll	Toll / Highway	Péage	\N	road	t
7	hotel	Hotel / Lodging	Hébergement	\N	bed	t
8	supermarket	Supermarket	Supermarché	\N	cart	t
9	transport	Public Transport	Transport commun	\N	train	t
10	office	Office Supplies	Fournitures	\N	clipboard	t
11	other	Other	Autre	\N	dots	t
\.


--
-- TOC entry 5224 (class 0 OID 16677)
-- Dependencies: 240
-- Data for Name: expense_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_receipts (id, document_id, report_id, threshold_id, submitted_by, approved_by, receipt_number, receipt_date, receipt_time, merchant_name, merchant_country, merchant_city, currency_code, exchange_rate_to_tnd, total_amount, total_amount_tnd, tax_amount, tip_amount, payment_method, category_code, category_source, threshold_result, threshold_amount_tnd, status, extracted_data, is_duplicate, rejection_reason, notes, created_at, updated_at, currency_detection_method) FROM stdin;
1	5	\N	9	3	3	\N	2026-04-07	\N	Bouifvard	\N	\N	TND	1.000000	249.320	249.320	19.570	0.000	\N	cafe	ai	pending	249.320	validated	{"currency": "TND", "tax_amount": 19.57, "tip_amount": 0.0, "receipt_date": null, "receipt_time": null, "total_amount": 249.32, "category_code": "hotel", "merchant_name": "Bouifvard", "payment_method": null, "total_amount_tnd": 249.32, "exchange_rate_to_tnd": 1.0, "currency_detection_method": "keyword:dt", "currency_detection_confidence": 0.85}	f	\N	\N	2026-04-07 16:18:58.942659	2026-04-07 16:18:58.942659	\N
2	6	\N	9	3	3	\N	2022-05-18	20:11:00	wiem	\N	\N	TND	1.000000	35.000	35.000	0.000	0.000	\N	cafe	ai	auto_approved	35.000	validated	{"currency": "TND", "tax_amount": 0.0, "tip_amount": 0.0, "receipt_date": "2022-05-18", "receipt_time": "20:11", "total_amount": 35.0, "category_code": "other", "merchant_name": "Non Fiscale", "payment_method": null, "total_amount_tnd": 35.0, "exchange_rate_to_tnd": 1.0, "currency_detection_method": "keyword:totale", "currency_detection_confidence": 0.85}	f	\N	\N	2026-04-07 16:21:28.873431	2026-04-07 16:21:28.873431	\N
\.


--
-- TOC entry 5222 (class 0 OID 16647)
-- Dependencies: 238
-- Data for Name: expense_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_reports (id, submitted_by, approved_by, title, period_start, period_end, total_amount_tnd, receipt_count, status, submitted_at, approved_at, rejection_reason, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5212 (class 0 OID 16483)
-- Dependencies: 228
-- Data for Name: expense_thresholds; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_thresholds (id, role_name, max_amount_tnd, auto_approve_below_tnd, is_active, updated_at) FROM stdin;
7	Administrateur	5000.000	1000.000	t	2026-04-07 12:44:05.708737
8	Administrateur Système	500.000	100.000	t	2026-04-07 12:44:05.708737
9	Comptable	1000.000	200.000	t	2026-04-07 12:44:05.708737
10	Utilisateur	100.000	30.000	t	2026-04-07 12:44:05.708737
\.


--
-- TOC entry 5220 (class 0 OID 16618)
-- Dependencies: 236
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoice_items (id, invoice_id, line_number, item_code, description, unit, quantity, unit_price, discount_pct, line_total, vat_rate, vat_amount) FROM stdin;
\.


--
-- TOC entry 5226 (class 0 OID 16741)
-- Dependencies: 242
-- Data for Name: languages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.languages (id, code, name_en, name_native, is_rtl, is_active) FROM stdin;
1	fr	French	Français	f	t
2	en	English	English	f	t
3	ar	Arabic	العربية	t	t
4	es	Spanish	Español	f	t
5	it	Italian	Italiano	f	t
6	de	German	Deutsch	f	t
\.


--
-- TOC entry 5216 (class 0 OID 16544)
-- Dependencies: 232
-- Data for Name: ocr_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ocr_results (id, document_id, ocr_engine, ocr_version, processed_at, processing_time_ms, ocr_confidence, extraction_confidence, ocr_status, raw_text, extracted_json, low_confidence_fields, error_message) FROM stdin;
1	1	PaddleOCR	PP-OCRv4	2026-04-07 14:41:18.437072	80	95.00	87.66	success	Le, 20/05/2025\nFACTURE EXPORT N° FC 2025-11708\nEditée par :Nader BACH BAOUAB\nDate\n: 20/05/2025\nPO N°\n:\nHAWB\n: 6859143082\nRéf\n:\nExpéditeur\n: VERNICOLOR TUNIS\nDestinataire\n: AUTOLIV B.V. & CO. KG\nCL000137\nVERNICOLOR TUNIS\n1059177A/A/M/000\nMF:\n7221214\nFax :\nTél :\nRue des mathématiques Z.I Grombalia, TUNISIE\nRéf.\nVol N°\nDate D\nDate A\nDépart\nArrivée\nMAWB\nA25-001129E\n08/05/2025\n08/05/2025\nAIRPORT\nTUNIS\nCARTHAGE\nMarseille\nProvence\nAirport\n61590390042\nAVION N° 61590390042\n2 Proto Backshel SSP - GW = 6 Kgs - m3 = 0 - CW = 29.5 Kgs\nPrestation\nQté\nP.U. HT\nDevise\nTaux\nRem. %\nPT HT\nTVA\nMnt TVA\nfret\n1\n298,950\nEUR\n3,424\n0\n1023,605\n0\n0,000\nIDHLE Retour de Fonds\n1\n45,852\nTND\n1\n0\n45,852\n19\n0,000\nFuel surcharge\n1\n82,210\nEUR\n3,424\n0\n281,487\n0\n0,000\nMode de réglement\nDélais d'échéance\nLes montants exprimés en : TND\nArrêtée la présente facture à la somme de :\nTotal HT\n1350,944\nTotal TVA\n0,000\nTimbre Fiscale\n1,000\nTotal TTC\n1351,944\nReste à Payer\n1351,944\nMILLE TROIS CENT CINQUANTE ET UN DINARS ET NEUF CENT QUARANTE-\nQUATRE MILLIMES.\nBon de commande N° 156 valide, du 14/04/2025 au 03/07/2025\nTotal TTC en Euro\n394,84\nTotal TTC en Dollar\n441,96\nPage 1 / 1\nImprimée par Dorra HELLALI, Le 21/05/2025\n\nLe, 20/05/2025\nFACTURE EXPORT N° FC 2025-11754\nEditée par :Meriem Mrabet\nDate\n: 20/05/2025\nPO N°\n:\nHAWB\n: 5266396273\nRéf\n:\nExpéditeur\n: VERNICOLOR TUNIS\nDestinataire\n: VERRNICOLOR GROUPE\nCL000137\nVERNICOLOR TUNIS\n1059177A/A/M/000\nMF:\n7221214\nFax :\nTél :\nRue des mathématiques Z.I Grombalia, TUNISIE\nRéf.\nVol N°\nDate D\nDate A\nDépart\nArrivée\nMAWB\nA25-001110E\n06/05/2025\n06/05/2025\nAIRPORT\nTUNIS\nCARTHAGE\nMarseille\nProvence\nAirport\n61590389994\nAVION N° 61590389994\n1 PROTO SAMPLE PARTS - GW = 2 Kgs - m3 = 0 - CW = 15 Kgs\nPrestation\nQté\nP.U. HT\nDevise\nTaux\nRem. %\nPT HT\nTVA\nMnt TVA\nfret\n1\n154,950\nEUR\n3,437\n0\n532,563\n0\n0,000\nfuel surcharge\n1\n42,610\nEUR\n3,437\n0\n146,451\n0\n0,000\nIDHLE Retour de Fonds\n1\n23,766\nTND\n1\n0\n23,766\n19\n0,000\nMode de réglement\nDélais d'échéance\nLes montants exprimés en : TND\nArrêtée la présente facture à la somme de :\nTotal HT\n702,780\nTotal TVA\n0,000\nTimbre Fiscale\n1,000\nTotal TTC\n703,780\nReste à Payer\n703,780\nSEPT CENT TROIS DINARS ET SEPT CENT QUATRE-VINGTS MILLIMES.\nBon de commande N° 156 valide, du 14/04/2025 au 03/07/2025\nTotal TTC en Euro\n204,77\nTotal TTC en Dollar\n231,2\nPage 1 / 1\nImprimée par Dorra HELLALI, Le 21/05/2025\n\nLe, 20/05/2025\nFACTURE EXPORT N° FC 2025-11776\nEditée par :Olfa\n MISSAOUI\nDate\n: 20/05/2025\nPO N°\n:\nHAWB\n: 2996408844\nRéf\n:\nExpéditeur\n: VERNICOLOR TUNIS\nDestinataire\n: FORVIA\nCL000137\nVERNICOLOR TUNIS\n1059177A/A/M/000\nMF:\n7221214\nFax :\nTél :\nRue des mathématiques Z.I Grombalia, TUNISIE\nRéf.\nVol N°\nDate D\nDate A\nDépart\nArrivée\nMAWB\nA25-001119E\n07/05/2025\n07/05/2025\nAIRPORT\nTUNIS\nCARTHAGE\nMarseille\nProvence\nAirport\n61590390016\nAVION N° 61590390016\n1 Parts Wings - GW = 1 Kgs - m3 = 0 - CW = 2 Kgs\nPrestation\nQté\nP.U. HT\nDevise\nTaux\nRem. %\nPT HT\nTVA\nMnt TVA\nFRET\n1\n41,140\nEUR\n3,431\n0\n141,151\n0\n0,000\n Fuels surcharge\n1\n11,310\nEUR\n3,431\n0\n38,805\n0\n0,000\nIDHLE Retour de Fonds\n1\n6,310\nTND\n1\n0\n6,310\n19\n0,000\nMode de réglement\nDélais d'échéance\nLes montants exprimés en : TND\nArrêtée la présente facture à la somme de :\nTotal HT\n186,266\nTotal TVA\n0,000\nTimbre Fiscale\n1,000\nTotal TTC\n187,266\nReste à Payer\n187,266\nCENT QUATRE-VINGT-SEPT DINARS ET DEUX CENT SOIXANTE-SIX MILLIMES.\nBon de commande N° 156 valide, du 14/04/2025 au 03/07/2025\nTotal TTC en Euro\n54,58\nTotal TTC en Dollar\n61,18\nPage 1 / 1\nImprimée par Dorra HELLALI, Le 21/05/2025\n\nLe, 20/05/2025\nFACTURE EXPORT N° FC 2025-11911\nEditée par :Nader BACH BAOUAB\nDate\n: 20/05/2025\nPO N°\n:\nHAWB\n: 9684149720\nRéf\n:\nExpéditeur\n: VERNICOLOR TUNIS\nDestinataire\n: POSITRONE TEST HIZMETLERI A.S\nCL000137\nVERNICOLOR TUNIS\n1059177A/A/M/000\nMF:\n7221214\nFax :\nTél :\nRue des mathématiques Z.I Grombalia, TUNISIE\nRéf.\nVol N°\nDate D\nDate A\nDépart\nArrivée\nMAWB\nA25-001166E\n14/05/2025\n14/05/2025\nAIRPORT\nTUNIS\nCARTHAGE\nMarseille\nProvence\nAirport\n61590390101\nAVION N° 61590390101\n1 Plaque flamabilte - GW = 5 Kgs - m3 = 0 - CW = 11 Kgs\nPrestation\nQté\nP.U. HT\nDevise\nTaux\nRem. %\nPT HT\nTVA\nMnt TVA\nfret\n1\n179,730\nEUR\n3,416\n0\n613,958\n0\n0,000\nIDHLE Retour de Fonds\n1\n27,430\nTND\n1\n0\n27,430\n19\n0,000\nFuel surcharge\n1\n49,430\nEUR\n3,416\n0\n168,853\n0\n0,000\nMode de réglement\nDélais d'échéance\nLes montants exprimés en : TND\nArrêtée la présente facture à la somme de :\nTotal HT\n810,241\nTotal TVA\n0,000\nTimbre Fiscale\n1,000\nTotal TTC\n811,241\nReste à Payer\n811,241\nHUIT CENT ONZE DINARS ET DEUX CENT QUARANTE ET UN MILLIMES.\nBon de commande N° 156 valide, du 14/04/2025 au 03/07/2025\nTotal TTC en Euro\n237,48\nTotal TTC en Dollar\n264,59\nPage 1 / 1\nImprimée par Dorra HELLALI, Le 21/05/2025\n\nLe, 20/05/2025\nFACTURE EXPORT N° FC 2025-11912\nEditée par :Nader BACH BAOUAB\nDate\n: 20/05/2025\nPO N°\n:\nHAWB\n: 9684131251\nRéf\n:\nExpéditeur\n: VERNICOLOR TUNIS\nDestinataire\n: PETER-LACKE IBERIA\nCL000137\nVERNICOLOR TUNIS\n1059177A/A/M/000\nMF:\n7221214\nFax :\nTél :\nRue des mathématiques Z.I Grombalia, TUNISIE\nRéf.\nVol N°\nDate D\nDate A\nDépart\nArrivée\nMAWB\nA25-001166E\n14/05/2025\n14/05/2025\nAIRPORT\nTUNIS\nCARTHAGE\nMarseille\nProvence\nAirport\n61590390101\nAVION N° 61590390101\n1 High Spec - GW = 1 Kgs - m3 = 0 - CW = 6 Kgs\nPrestation\nQté\nP.U. HT\nDevise\nTaux\nRem. %\nPT HT\nTVA\nMnt TVA\nfret\n1\n74,030\nEUR\n3,416\n0\n252,886\n0\n0,000\nIDHLE Retour de Fonds\n1\n11,298\nTND\n1\n0\n11,298\n19\n0,000\nFuel surcharge\n1\n20,360\nEUR\n3,416\n0\n69,550\n0\n0,000\nMode de réglement\nDélais d'échéance\nLes montants exprimés en : TND\nArrêtée la présente facture à la somme de :\nTotal HT\n333,734\nTotal TVA\n0,000\nTimbre Fiscale\n1,000\nTotal TTC\n334,734\nReste à Payer\n334,734\nTROIS CENT TRENTE-QUATRE DINARS ET SEPT CENT TRENTE-QUATRE MILLIMES.\nBon de commande N° 156 valide, du 14/04/2025 au 03/07/2025\nTotal TTC en Euro\n97,99\nTotal TTC en Dollar\n109,18\nPage 1 / 1\nImprimée par Dorra HELLALI, Le 21/05/2025\n	{"multi_invoices": [{"fields": {"city": "Tunis", "email": null, "phone": null, "tax_id": "7221214", "address": "Rue des mathématiques Z.I Grombalia, TUNISIE", "currency": "EUR", "total_ht": 1350.944, "total_ttc": 1351.944, "total_vat": 0.0, "invoice_date": "2025-05-20", "supplier_name": ": 20/05/2025", "invoice_number": "2025-11708"}, "confidence": 87.66, "needs_review": false}, {"fields": {"city": "Tunis", "email": null, "phone": null, "tax_id": "7221214", "address": "Rue des mathématiques Z.I Grombalia, TUNISIE", "currency": "EUR", "total_ht": 702.78, "total_ttc": 703.78, "total_vat": 0.0, "invoice_date": "2025-05-20", "supplier_name": "PROTO SA", "invoice_number": "2025-11754"}, "confidence": 92.66, "needs_review": false}, {"fields": {"city": "Tunis", "email": null, "phone": null, "tax_id": "7221214", "address": "Rue des mathématiques Z.I Grombalia, TUNISIE", "currency": "EUR", "total_ht": 186.266, "total_ttc": 187.266, "total_vat": 0.0, "invoice_date": "2025-05-20", "supplier_name": "Olfa\\n MISSA", "invoice_number": "2025-11776"}, "confidence": 92.66, "needs_review": false}, {"fields": {"city": "Tunis", "email": null, "phone": null, "tax_id": "7221214", "address": "Rue des mathématiques Z.I Grombalia, TUNISIE", "currency": "EUR", "total_ht": 810.241, "total_ttc": 811.241, "total_vat": 0.0, "invoice_date": "2025-05-20", "supplier_name": ": 20/05/2025", "invoice_number": "2025-11911"}, "confidence": 87.66, "needs_review": false}, {"fields": {"city": "Tunis", "email": null, "phone": null, "tax_id": "7221214", "address": "Rue des mathématiques Z.I Grombalia, TUNISIE", "currency": "EUR", "total_ht": 333.734, "total_ttc": 334.734, "total_vat": 0.0, "invoice_date": "2025-05-20", "supplier_name": ": 20/05/2025", "invoice_number": "2025-11912"}, "confidence": 86.91, "needs_review": false}]}	\N	\N
2	2	PaddleOCR	PP-OCRv4	2026-04-07 14:44:26.849379	12207	92.35	79.30	success	Meria Pub\now missew\nLes Nouveaux Supports Publicitaires\nTunis le:24/04/2025\n-dae\nFACTURE\nFACTUREN77/MPVER-25\na ERP\nadresséea\nNom:sociétéVernicolor Tunisia\nAdresseZ,l grombalia\nCode Postal8030\nVille:grombalia\nTeléphoneFAX\nTler\nCodeTVA:\nQuantité\nDescription\nPrix unitaire HTDT\nMontant Total HTDT\nimpression sur vinyle\n36\n40cm*17cm +découpe\n2,380\n85,680\nimpression sur vinyle\n60\n185cm*5cm+découpe\n3,238\n194,250\nimpression sur vinyle 90cm*5cm\n60\n+découpe\n1,575\n94,500\nimpression sur vinyle 2m50*1m\n2\n75,000\navec depose et pose\n150,000\nimpression sur vinyle 1m50 *\n2\n33,750\n75cm avec depose et pose\n67,500\nTotal HT\n591,930\nTVA19%\n0,000\nTotalTTC\n591,930\nOcw'l\nTimbre\nPaiernent\n1,000\nNet a Payer\npar cheque\n592,930\nou especes\nArrétée la présente facturea la somme de:\nCing cents quatre vingt douze Dinars\net 930millimes\nLA DIRECTION\nERP\nOclame\n2\nlona\npoiunrncun\nAvenue 9Avril-Grombalia\nTel72255402\nmobiles:98296443-24013040-97179242\ne-mail:faouzi_bensalah@yahoo.fr\nMatricule Fiscal0908647E/A/C000\nRegistre de commerce:0908647E\nR.I.B:08109000031000610637	{"multi_invoices": [{"fields": {"city": "grombalia", "email": "faouzi_bensalah@yahoo.fr", "phone": "72255402", "tax_id": "0908647E/A/C000", "address": "Z,l grombalia", "currency": "TND", "total_ht": 591.93, "total_ttc": 591.93, "total_vat": 0.0, "invoice_date": "2025-04-24", "supplier_name": "Meria Pub", "invoice_number": "N77/MPVER-25"}, "confidence": 79.3, "needs_review": false}]}	\N	\N
3	3	PaddleOCR	PP-OCRv4	2026-04-07 16:13:41.948074	42484	92.27	79.16	success	MELPRO\nFACTURE\nFA25/160\nDate\nCliant\nLsA2km5.5RoutSoumse\n30/05/2025\nVCTO1\n8025922018\nVernicolor Tunisia\n1558026NPM000\nCAPITAL\n70000.000TND\nRue des mathematiques\nGrombalia\nMF:1059177AAM000\nPageN*1/\nCAPTEURFM100REED5-220VAC/DC 2F\nDesignatic\nARTAUTO\nTVAMantast HT\n.000\n178.400\n15,00\n454.020\nCode\nBase HT\nTaux TVA\nMontant TVA\nTotal HT\n454.920\nNet HT\n454.920\nTimbre\n454.920\nTotal TTC\n1.000\n455,920\nARRETECE PRESENTFACTUREALASOMMEDE QUATRECENT CINQUANTE-CINQDINARSET NEUF CENTVINGT miIimeS\nMODE DE PAYEMENT\nNUMERO:\nBon de livraison-25/0275 du 30/05/2025\nRIBALBARAKA32008788116087873181\némail:melpro@orange.tn	{"multi_invoices": [{"fields": {"city": "Grombalia", "email": "melpro@orange.tn", "phone": null, "tax_id": "1059177AAM000", "address": "Rue des mathematiques", "currency": "TND", "total_ht": 454.92, "total_ttc": 1000455.92, "total_vat": 0.0, "invoice_date": "2025-05-30", "supplier_name": "Date\\nCliant\\nLsA", "invoice_number": "QUANTE-C1NQD1NARSET"}, "confidence": 79.16, "needs_review": false}]}	\N	\N
4	4	PaddleOCR	PP-OCRv4	2026-04-07 16:14:23.105112	15215	88.46	63.01	success	SPACE TECH\nART08301325\nART0811315\nART0928\nART0196\nART0263\nART0433\nARTO178\nARTO23015\nART0064\nART_2008\nART0002\nART0010\nReterence\nFA250826\nNUMERO\nDONDE CO\nAUTORAONN5002500157\nART0010\nART0682\n&\nFACTURE\n51\nbrother.\nXXXXXX\nXXXX\nBase\nOPAPIER DE SOIE\nCRAYON TAILLEUR PLASTIQUE\nSTYLOMARKEUR P.FINEREF 318\nMARREUR STAIDTABLEAU\nBLOCNOTE PM\nCLASSEUR OXFORD/ELBA SMART PRO+8CM\nRAMEETIQ AUTOCOLAN2\nRAMEETIQAUTOCOLAN/8\n2/0572 BLEU\nPILEAG13\nPILE KODAK ALCALINE.AAAVAA\nCAHIER WIRO300P PM\nINTERCALAIRE 100 MIC\nSTYLOBIC\nAMEETIOAUTOCOLAN75\n30/05/2025\nDATE\n0701/2025AU3/12/2025\nTaux\nEPSON\nMontant\nDesignation\nXXXXXX\nBCN\nXxXxxX\nArreter la présente Facture a la somme de\nTotal HT\nSTEEL HANI SPACETECH SARL\nxxxxx\nRUEMOHAMEDMFADHLG\nM.F.:\nClient\nREMISE\n01009011\nxxxxxxxxx\nVERNICOLOR TUNISIA SARL\nDOL\nTotal TTC\nQte\nto\nNU\n2\nPrixU.H.TTVAR\nGROMBALIA\n1059177A\n129,000\n27,800\n27.800\n27,800\n3,800\n5,800\n2,950\n15,850\n4.850\n0.52\n0.690\nF\nLEXMARK.\nNETAPAYER\nACE Scar\nTotal HT\nCanon\n120.064\n278.00\n278.00\nXXXXXX\n645.000\n83,072\n27.034\n201,995\n42,68\n15.752\n22.880\n278.00\n25,98\n6.68\n11.60\n27.896\n68,112	{"multi_invoices": [{"fields": {"city": "Grombalia", "email": null, "phone": null, "tax_id": "Client", "address": null, "currency": "TND", "total_ht": null, "total_ttc": 2.0, "total_vat": 0.0, "invoice_date": "2025-05-30", "supplier_name": "sente Facture a la somme de\\nTotal HT\\nSTEEL HANI SPACETECH SARL", "invoice_number": "250826"}, "confidence": 63.01, "needs_review": true}]}	\N	\N
5	5	PaddleOCR	PP-OCRv4	2026-04-07 16:18:58.937897	9041	97.06	59.20	success	BOUIFVARD\nONE MISSION STREE\nSAN FRANCISCO,CA 94105\n415543-6084\nDINING ROOM\n1019KEN\nTb1.64/1\nChk 9458\nGst2\nFeb150607:20PM\n1HENDRIKS\n8.00\n1BOURBON MANHATN\n8.75\n1DSOUP\n13.75\n1DABALONE\n19.50\n1D LOBSTER LINGUI\n18.75\n1D SHORTRIB\n17.50\n1D SWEETBREADS\n17.25\n1DLAMB\n32.00\n1DPORK\n31.00\n11/2GL-3SAINTSPN\n5.50\n11/2GL SAUV BLANC\n4.25\n11/2GL-BAROLO\n9.75\n11/2G-UNTISYRAH\n5.50\n1POTRERO\n10.50\n1G-CASTELNAU\n9.00\n1D BANANAS FOSTER\n9.50\n1DTRIO\n9.75\nSUBTOTAL\n230.25\nTax\n19.57\nTotal\n249.32\nBOULEVARD COOKBOOKS\nARE NOW AVAILABLE\nPLEASE ASK YOUR SERVER\nTHANK YOU FOR DINING WITH US	{"currency": "TND", "tax_amount": 19.57, "tip_amount": 0.0, "receipt_date": null, "receipt_time": null, "total_amount": 249.32, "category_code": "hotel", "merchant_name": "Bouifvard", "payment_method": null, "total_amount_tnd": 249.32, "exchange_rate_to_tnd": 1.0, "currency_detection_method": "keyword:dt", "currency_detection_confidence": 0.85}	[{"field": "receipt_date", "issue": "Non détecté — vérification manuelle", "confidence": 0}]	\N
6	6	PaddleOCR	PP-OCRv4	2026-04-07 16:21:28.865778	8148	96.02	49.10	success	NON FISCALE\nOPERATORE:\nPRECONTO-?\nRITIRARE SCONTRINO ALLA CASSA\nEURO\n6,00\nRISTORANTE\nINSALATA POLPO\n10,00\nMARGHERITA\n6.00\nROMANA\n8,00\nACQUA/1LITRO\n2.00\nCOPERTO\n1.50\nCOPERTO\n1.50\nTOTALE\n35,00\n18-05-2022\n20:11\nNON FISCALE	{"currency": "TND", "tax_amount": 0.0, "tip_amount": 0.0, "receipt_date": "2022-05-18", "receipt_time": "20:11", "total_amount": 35.0, "category_code": "other", "merchant_name": "Non Fiscale", "payment_method": null, "total_amount_tnd": 35.0, "exchange_rate_to_tnd": 1.0, "currency_detection_method": "keyword:totale", "currency_detection_confidence": 0.85}	[{"field": "total_amount", "issue": "Confiance faible (fallback_max)", "confidence": 30.0}, {"field": "category_code", "issue": "Confiance faible (default_other)", "confidence": 30.0}]	\N
\.


--
-- TOC entry 5218 (class 0 OID 16566)
-- Dependencies: 234
-- Data for Name: supplier_invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supplier_invoices (id, document_id, supplier_id, validated_by, invoice_number, invoice_date, due_date, currency_code, exchange_rate, total_ht, total_vat, total_ttc, total_ttc_tnd, status, purchase_order_ref, delivery_note_ref, extra_fields, rejection_reason, notes, created_at, updated_at, needs_review) FROM stdin;
2	1	2	\N	2025-11754	2025-05-20	\N	EUR	1.000000	702.780	0.000	703.780	0.000	pending	\N	\N	\N	\N	\N	2026-04-07 14:41:18.39862	2026-04-07 14:41:18.39862	f
3	1	3	\N	2025-11776	2025-05-20	\N	EUR	1.000000	186.266	0.000	187.266	0.000	pending	\N	\N	\N	\N	\N	2026-04-07 14:41:18.414346	2026-04-07 14:41:18.414346	f
4	1	1	\N	2025-11911	2025-05-20	\N	EUR	1.000000	810.241	0.000	811.241	0.000	pending	\N	\N	\N	\N	\N	2026-04-07 14:41:18.414346	2026-04-07 14:41:18.414346	f
5	1	1	\N	2025-11912	2025-05-20	\N	EUR	1.000000	333.734	0.000	334.734	0.000	pending	\N	\N	\N	\N	\N	2026-04-07 14:41:18.414346	2026-04-07 14:41:18.414346	f
1	1	4	3	 FC 2025-11708	2025-05-20	\N	TND	1.000000	1350.944	0.000	1351.000	1351.000	validated	\N	\N	\N	\N	\N	2026-04-07 14:41:18.361771	2026-04-07 14:41:18.361771	f
6	2	5	3	N77/MPVER-25	2025-04-24	\N	TND	1.000000	591.930	0.000	591.930	591.930	validated	\N	\N	\N	\N	\N	2026-04-07 14:44:26.842755	2026-04-07 14:44:26.842755	f
7	3	6	\N	QUANTE-C1NQD1NARSET	2025-05-30	\N	TND	1.000000	454.920	0.000	1000455.920	0.000	pending	\N	\N	\N	\N	\N	2026-04-07 16:13:41.907018	2026-04-07 16:13:41.907018	f
8	4	7	3	250826	2025-05-30	\N	TND	1.000000	0.000	0.000	2.000	2.000	validated	\N	\N	\N	\N	\N	2026-04-07 16:14:23.099501	2026-04-07 16:14:23.099501	f
\.


--
-- TOC entry 5208 (class 0 OID 16446)
-- Dependencies: 224
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.suppliers (id, name, tax_id, email, phone, address, city, country, is_active, created_by, created_at) FROM stdin;
1	: 20/05/2025	7221214	\N	\N	Rue des mathématiques Z.I Grombalia, TUNISIE	Tunis	Tunisie	t	3	2026-04-07 14:41:18.22559
2	PROTO SA	7221214	\N	\N	Rue des mathématiques Z.I Grombalia, TUNISIE	Tunis	Tunisie	t	3	2026-04-07 14:41:18.361771
3	Olfa\n MISSA	7221214	\N	\N	Rue des mathématiques Z.I Grombalia, TUNISIE	Tunis	Tunisie	t	3	2026-04-07 14:41:18.39862
4	SINDBAD		\N	\N	\N	\N	Tunisie	t	3	2026-04-07 14:43:13.187046
5	Meria Pub	0908647E/A/C000	faouzi_bensalah@yahoo.fr	72255402	Z,l grombalia	grombalia	Tunisie	t	3	2026-04-07 14:44:14.622902
6	Date\nCliant\nLsA	1059177AAM000	melpro@orange.tn	\N	Rue des mathematiques	Grombalia	Tunisie	t	3	2026-04-07 16:12:59.367721
7	sente Facture a la somme de\nTotal HT\nSTEEL HANI SPACETECH SARL	Client	\N	\N	\N	Grombalia	Tunisie	t	3	2026-04-07 16:14:07.840894
\.


--
-- TOC entry 5204 (class 0 OID 16405)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password, role, is_active) FROM stdin;
5	Yasmine_Mamlouk	Yasmine@vernicolor.tn	Jasmine88	Utilisateur	t
6	Wiem_BenSassi	Wiem@vernicolor.tn	Wiem55	Utilisateur	t
1	François-Xavier Lemasson	dga@vernicolor.tn	DGA456	Administrateur	t
2	Houssem_Jebali	Houssem@vernicolor.tn	Houssem123	Administrateur Système	t
3	Utilisateur_Comptable	Comptable@vernicolor.tn	comp000	Comptable	t
\.


--
-- TOC entry 5244 (class 0 OID 0)
-- Dependencies: 221
-- Name: currencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.currencies_id_seq', 5, true);


--
-- TOC entry 5245 (class 0 OID 0)
-- Dependencies: 229
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documents_id_seq', 6, true);


--
-- TOC entry 5246 (class 0 OID 0)
-- Dependencies: 225
-- Name: expense_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_categories_id_seq', 11, true);


--
-- TOC entry 5247 (class 0 OID 0)
-- Dependencies: 239
-- Name: expense_receipts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_receipts_id_seq', 2, true);


--
-- TOC entry 5248 (class 0 OID 0)
-- Dependencies: 237
-- Name: expense_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_reports_id_seq', 1, false);


--
-- TOC entry 5249 (class 0 OID 0)
-- Dependencies: 227
-- Name: expense_thresholds_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expense_thresholds_id_seq', 10, true);


--
-- TOC entry 5250 (class 0 OID 0)
-- Dependencies: 235
-- Name: invoice_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.invoice_items_id_seq', 1, false);


--
-- TOC entry 5251 (class 0 OID 0)
-- Dependencies: 241
-- Name: languages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.languages_id_seq', 6, true);


--
-- TOC entry 5252 (class 0 OID 0)
-- Dependencies: 231
-- Name: ocr_results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ocr_results_id_seq', 6, true);


--
-- TOC entry 5253 (class 0 OID 0)
-- Dependencies: 233
-- Name: supplier_invoices_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supplier_invoices_id_seq', 8, true);


--
-- TOC entry 5254 (class 0 OID 0)
-- Dependencies: 223
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 7, true);


--
-- TOC entry 5255 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- TOC entry 4975 (class 2606 OID 16444)
-- Name: currencies currencies_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_code_key UNIQUE (code);


--
-- TOC entry 4977 (class 2606 OID 16442)
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (id);


--
-- TOC entry 4991 (class 2606 OID 16516)
-- Name: documents documents_file_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_file_hash_key UNIQUE (file_hash);


--
-- TOC entry 4993 (class 2606 OID 16514)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 4983 (class 2606 OID 16481)
-- Name: expense_categories expense_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_code_key UNIQUE (code);


--
-- TOC entry 4985 (class 2606 OID 16479)
-- Name: expense_categories expense_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_categories
    ADD CONSTRAINT expense_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5023 (class 2606 OID 16699)
-- Name: expense_receipts expense_receipts_document_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_receipts
    ADD CONSTRAINT expense_receipts_document_id_key UNIQUE (document_id);


--
-- TOC entry 5025 (class 2606 OID 16697)
-- Name: expense_receipts expense_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_receipts
    ADD CONSTRAINT expense_receipts_pkey PRIMARY KEY (id);


--
-- TOC entry 5019 (class 2606 OID 16663)
-- Name: expense_reports expense_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_reports
    ADD CONSTRAINT expense_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 4987 (class 2606 OID 16493)
-- Name: expense_thresholds expense_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_thresholds
    ADD CONSTRAINT expense_thresholds_pkey PRIMARY KEY (id);


--
-- TOC entry 4989 (class 2606 OID 16495)
-- Name: expense_thresholds expense_thresholds_role_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_thresholds
    ADD CONSTRAINT expense_thresholds_role_name_key UNIQUE (role_name);


--
-- TOC entry 5017 (class 2606 OID 16639)
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5035 (class 2606 OID 16753)
-- Name: languages languages_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_code_key UNIQUE (code);


--
-- TOC entry 5037 (class 2606 OID 16751)
-- Name: languages languages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_pkey PRIMARY KEY (id);


--
-- TOC entry 5002 (class 2606 OID 16558)
-- Name: ocr_results ocr_results_document_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ocr_results
    ADD CONSTRAINT ocr_results_document_id_key UNIQUE (document_id);


--
-- TOC entry 5004 (class 2606 OID 16556)
-- Name: ocr_results ocr_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ocr_results
    ADD CONSTRAINT ocr_results_pkey PRIMARY KEY (id);


--
-- TOC entry 5010 (class 2606 OID 16588)
-- Name: supplier_invoices supplier_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_pkey PRIMARY KEY (id);


--
-- TOC entry 4981 (class 2606 OID 16459)
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- TOC entry 5012 (class 2606 OID 17641)
-- Name: supplier_invoices unique_doc_invoice; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT unique_doc_invoice UNIQUE (document_id, invoice_number);


--
-- TOC entry 5014 (class 2606 OID 16592)
-- Name: supplier_invoices uq_invoice_supplier; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT uq_invoice_supplier UNIQUE (invoice_number, supplier_id);


--
-- TOC entry 4971 (class 2606 OID 16415)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4973 (class 2606 OID 16413)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4994 (class 1259 OID 16542)
-- Name: idx_documents_currency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_currency ON public.documents USING btree (detected_currency);


--
-- TOC entry 4995 (class 1259 OID 16540)
-- Name: idx_documents_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_hash ON public.documents USING btree (file_hash);


--
-- TOC entry 4996 (class 1259 OID 16541)
-- Name: idx_documents_language; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_language ON public.documents USING btree (detected_language);


--
-- TOC entry 4997 (class 1259 OID 16539)
-- Name: idx_documents_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_status ON public.documents USING btree (status);


--
-- TOC entry 4998 (class 1259 OID 16538)
-- Name: idx_documents_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_type ON public.documents USING btree (document_type);


--
-- TOC entry 4999 (class 1259 OID 16537)
-- Name: idx_documents_uploaded_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_uploaded_by ON public.documents USING btree (uploaded_by);


--
-- TOC entry 5015 (class 1259 OID 16645)
-- Name: idx_invoice_items; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoice_items ON public.invoice_items USING btree (invoice_id);


--
-- TOC entry 5005 (class 1259 OID 16615)
-- Name: idx_invoices_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_date ON public.supplier_invoices USING btree (invoice_date);


--
-- TOC entry 5006 (class 1259 OID 16616)
-- Name: idx_invoices_document; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_document ON public.supplier_invoices USING btree (document_id);


--
-- TOC entry 5007 (class 1259 OID 16614)
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_status ON public.supplier_invoices USING btree (status);


--
-- TOC entry 5008 (class 1259 OID 16613)
-- Name: idx_invoices_supplier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_supplier ON public.supplier_invoices USING btree (supplier_id);


--
-- TOC entry 5000 (class 1259 OID 16564)
-- Name: idx_ocr_document; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_ocr_document ON public.ocr_results USING btree (document_id);


--
-- TOC entry 5026 (class 1259 OID 16735)
-- Name: idx_receipts_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receipts_category ON public.expense_receipts USING btree (category_code);


--
-- TOC entry 5027 (class 1259 OID 16736)
-- Name: idx_receipts_currency; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receipts_currency ON public.expense_receipts USING btree (currency_code);


--
-- TOC entry 5028 (class 1259 OID 16730)
-- Name: idx_receipts_document; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receipts_document ON public.expense_receipts USING btree (document_id);


--
-- TOC entry 5029 (class 1259 OID 16737)
-- Name: idx_receipts_json; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receipts_json ON public.expense_receipts USING gin (extracted_data);


--
-- TOC entry 5030 (class 1259 OID 16731)
-- Name: idx_receipts_report; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receipts_report ON public.expense_receipts USING btree (report_id);


--
-- TOC entry 5031 (class 1259 OID 16734)
-- Name: idx_receipts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receipts_status ON public.expense_receipts USING btree (status);


--
-- TOC entry 5032 (class 1259 OID 16732)
-- Name: idx_receipts_threshold; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receipts_threshold ON public.expense_receipts USING btree (threshold_id);


--
-- TOC entry 5033 (class 1259 OID 16733)
-- Name: idx_receipts_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_receipts_user ON public.expense_receipts USING btree (submitted_by);


--
-- TOC entry 5020 (class 1259 OID 16675)
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_status ON public.expense_reports USING btree (status);


--
-- TOC entry 5021 (class 1259 OID 16674)
-- Name: idx_reports_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_user ON public.expense_reports USING btree (submitted_by);


--
-- TOC entry 4978 (class 1259 OID 16465)
-- Name: idx_suppliers_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_name ON public.suppliers USING btree (name);


--
-- TOC entry 4979 (class 1259 OID 16466)
-- Name: idx_suppliers_tax_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_suppliers_tax_id ON public.suppliers USING btree (tax_id);


--
-- TOC entry 5039 (class 2606 OID 16527)
-- Name: documents documents_detected_currency_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_detected_currency_fkey FOREIGN KEY (detected_currency) REFERENCES public.currencies(code) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5040 (class 2606 OID 16532)
-- Name: documents documents_duplicate_of_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_duplicate_of_id_fkey FOREIGN KEY (duplicate_of_id) REFERENCES public.documents(id) ON DELETE SET NULL;


--
-- TOC entry 5041 (class 2606 OID 16517)
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5050 (class 2606 OID 16720)
-- Name: expense_receipts expense_receipts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_receipts
    ADD CONSTRAINT expense_receipts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5051 (class 2606 OID 16725)
-- Name: expense_receipts expense_receipts_currency_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_receipts
    ADD CONSTRAINT expense_receipts_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES public.currencies(code) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5052 (class 2606 OID 16700)
-- Name: expense_receipts expense_receipts_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_receipts
    ADD CONSTRAINT expense_receipts_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE RESTRICT;


--
-- TOC entry 5053 (class 2606 OID 16705)
-- Name: expense_receipts expense_receipts_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_receipts
    ADD CONSTRAINT expense_receipts_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.expense_reports(id) ON DELETE SET NULL;


--
-- TOC entry 5054 (class 2606 OID 16715)
-- Name: expense_receipts expense_receipts_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_receipts
    ADD CONSTRAINT expense_receipts_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5055 (class 2606 OID 16710)
-- Name: expense_receipts expense_receipts_threshold_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_receipts
    ADD CONSTRAINT expense_receipts_threshold_id_fkey FOREIGN KEY (threshold_id) REFERENCES public.expense_thresholds(id) ON DELETE SET NULL;


--
-- TOC entry 5048 (class 2606 OID 16669)
-- Name: expense_reports expense_reports_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_reports
    ADD CONSTRAINT expense_reports_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5049 (class 2606 OID 16664)
-- Name: expense_reports expense_reports_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_reports
    ADD CONSTRAINT expense_reports_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5047 (class 2606 OID 16640)
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.supplier_invoices(id) ON DELETE CASCADE;


--
-- TOC entry 5042 (class 2606 OID 16559)
-- Name: ocr_results ocr_results_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ocr_results
    ADD CONSTRAINT ocr_results_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- TOC entry 5043 (class 2606 OID 16608)
-- Name: supplier_invoices supplier_invoices_currency_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_currency_code_fkey FOREIGN KEY (currency_code) REFERENCES public.currencies(code) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5044 (class 2606 OID 16593)
-- Name: supplier_invoices supplier_invoices_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE RESTRICT;


--
-- TOC entry 5045 (class 2606 OID 16598)
-- Name: supplier_invoices supplier_invoices_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT;


--
-- TOC entry 5046 (class 2606 OID 16603)
-- Name: supplier_invoices supplier_invoices_validated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supplier_invoices
    ADD CONSTRAINT supplier_invoices_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 5038 (class 2606 OID 16460)
-- Name: suppliers suppliers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


-- Completed on 2026-04-07 16:23:49

--
-- PostgreSQL database dump complete
--

\unrestrict vfQWyfX69CNpYfKQT80bzns2aE6SLJ9iXXCo3YfzNhrW5zgnQ27j0dZtzudq9Gn

