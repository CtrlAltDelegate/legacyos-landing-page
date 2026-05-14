-- LegacyOS PostgreSQL Schema
-- Run: psql -d legacyos -f scripts/schema.sql

BEGIN;

-- ─── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'advisor', 'viewer')),
  refresh_token TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── Subscriptions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id   TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan                 TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'core', 'premium')),
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- ─── Assets: Equities ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equities (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker         TEXT NOT NULL,
  name           TEXT,
  shares         NUMERIC(18, 6) NOT NULL DEFAULT 0,
  cost_basis     NUMERIC(18, 2),
  current_price  NUMERIC(18, 2),
  price_updated_at TIMESTAMPTZ,
  account_type   TEXT CHECK (account_type IN ('taxable', 'ira', 'roth_ira', '401k', 'other')),
  notes          TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equities_user_id ON equities(user_id);
CREATE INDEX IF NOT EXISTS idx_equities_ticker ON equities(ticker);

-- ─── Assets: Real Estate ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS real_estate (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  address              TEXT NOT NULL,
  property_type        TEXT CHECK (property_type IN ('primary_residence', 'rental', 'commercial', 'land', 'other')),
  estimated_value      NUMERIC(18, 2) NOT NULL,
  adjusted_value       NUMERIC(18, 2),         -- e.g. 91% of estimated (after agent/closing costs)
  adjustment_percent   NUMERIC(5, 2) DEFAULT 91.0,
  mortgage_balance     NUMERIC(18, 2) DEFAULT 0,
  equity               NUMERIC(18, 2) GENERATED ALWAYS AS (
                         COALESCE(adjusted_value, estimated_value) - COALESCE(mortgage_balance, 0)
                       ) STORED,
  purchase_price       NUMERIC(18, 2),
  purchase_date        DATE,
  notes                TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_real_estate_user_id ON real_estate(user_id);

-- ─── Assets: Other Assets ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS other_assets (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  category     TEXT CHECK (category IN ('business_equity', 'collectible', 'vehicle', 'cash', 'crypto', 'whole_life', 'annuity', 'other')),
  current_value NUMERIC(18, 2) NOT NULL,
  valuation_method TEXT,   -- 'self_assessed', 'appraisal', 'book_value', etc.
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_other_assets_user_id ON other_assets(user_id);

-- ─── Assets: Restricted Assets ─────────────────────────────────────────────────
-- Never counted in net worth — tracked separately (unvested RSUs, pending inheritance, etc.)
CREATE TABLE IF NOT EXISTS restricted_assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT CHECK (category IN ('unvested_equity', 'pending_inheritance', 'lawsuit_settlement', 'deferred_comp', 'other')),
  estimated_value NUMERIC(18, 2),
  vest_date       DATE,
  probability     NUMERIC(5, 2) CHECK (probability BETWEEN 0 AND 100),  -- % likelihood of receiving
  notes           TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restricted_assets_user_id ON restricted_assets(user_id);

-- ─── Asset History (versioned snapshots) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS asset_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_type  TEXT NOT NULL CHECK (asset_type IN ('equity', 'real_estate', 'other', 'restricted')),
  asset_id    UUID NOT NULL,
  snapshot    JSONB NOT NULL,   -- full copy of the asset row at point in time
  changed_by  UUID REFERENCES users(id),
  source      TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'document_parse', 'equity_quote', 'import')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_history_user_id ON asset_history(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_history_asset ON asset_history(asset_type, asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_history_created_at ON asset_history(created_at);

-- ─── Net Worth Snapshots ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_assets       NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_liabilities  NUMERIC(18, 2) NOT NULL DEFAULT 0,
  net_worth          NUMERIC(18, 2) NOT NULL DEFAULT 0,
  equities_total     NUMERIC(18, 2) NOT NULL DEFAULT 0,
  real_estate_total  NUMERIC(18, 2) NOT NULL DEFAULT 0,
  other_total        NUMERIC(18, 2) NOT NULL DEFAULT 0,
  restricted_total   NUMERIC(18, 2) NOT NULL DEFAULT 0,  -- tracked but excluded from net_worth
  snapshot_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nw_snapshots_user_id ON net_worth_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_nw_snapshots_date ON net_worth_snapshots(user_id, snapshot_date);

-- Prevent duplicate snapshots for the same day
CREATE UNIQUE INDEX IF NOT EXISTS idx_nw_snapshots_user_date
  ON net_worth_snapshots(user_id, snapshot_date);

-- ─── Documents ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  s3_key        TEXT NOT NULL UNIQUE,
  s3_bucket     TEXT NOT NULL,
  mime_type     TEXT NOT NULL DEFAULT 'application/pdf',
  file_size     BIGINT,
  doc_type      TEXT CHECK (doc_type IN (
    'mortgage_statement', 'brokerage_statement', 'whole_life_statement',
    'tax_return_1040', 'insurance_illustration', 'other'
  )),
  parse_status  TEXT NOT NULL DEFAULT 'pending'
    CHECK (parse_status IN ('pending', 'parsing', 'parsed', 'failed', 'confirmed')),
  parse_error   TEXT,
  parsed_at     TIMESTAMPTZ,
  confirmed_at  TIMESTAMPTZ,
  confirmed_by  UUID REFERENCES users(id),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_parse_status ON documents(parse_status);

-- ─── Document Extractions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_extractions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_extraction  JSONB NOT NULL,          -- exactly what Claude returned
  confirmed_data  JSONB,                   -- what the user confirmed/edited
  confidence      NUMERIC(5, 2),           -- 0-100, Claude's confidence estimate
  written_to_asset BOOLEAN DEFAULT FALSE,  -- did this update an asset record?
  asset_type      TEXT,
  asset_id        UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extractions_document_id ON document_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_extractions_user_id ON document_extractions(user_id);

-- ─── Triggers: updated_at auto-update ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'subscriptions', 'equities', 'real_estate',
    'other_assets', 'restricted_assets', 'documents', 'document_extractions'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
       CREATE TRIGGER trg_%s_updated_at
         BEFORE UPDATE ON %s
         FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END;
$$;

COMMIT;
