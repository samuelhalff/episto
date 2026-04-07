CREATE TYPE provider_rate_matrix_status AS ENUM ('building', 'active', 'failed', 'retired');
CREATE TYPE quote_source AS ENUM ('matrix', 'live');

CREATE TABLE provider_rate_matrix_versions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  provider_name text NOT NULL,
  status provider_rate_matrix_status NOT NULL,
  verified_at timestamptz,
  effective_at timestamptz,
  expires_at timestamptz,
  source_endpoint text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE provider_rate_matrix_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  version_id uuid NOT NULL REFERENCES provider_rate_matrix_versions(id),
  postage text NOT NULL,
  number_of_page integer NOT NULL,
  attachment_mode text NOT NULL,
  shipping_country text NOT NULL,
  envelope_size text NOT NULL,
  window_location text NOT NULL,
  duplex boolean NOT NULL,
  provider_quoted_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'CHF',
  provider_quote_reference text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX provider_rate_matrix_entries_lookup_idx
  ON provider_rate_matrix_entries (version_id, postage, number_of_page, attachment_mode, shipping_country, envelope_size, window_location, duplex);

CREATE TABLE draft_quote_cache (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v7(),
  draft_id uuid NOT NULL REFERENCES draft_letters(id),
  snapshot_id uuid REFERENCES draft_snapshots(id),
  pricing_input_hash text NOT NULL,
  pricing_input jsonb NOT NULL,
  source quote_source NOT NULL,
  delivery_type delivery_type NOT NULL,
  postage text NOT NULL,
  provider_quoted_cents integer NOT NULL,
  swiss_mail_markup_cents integer NOT NULL,
  total_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'CHF',
  provider_quote_reference text,
  rate_matrix_version_id uuid REFERENCES provider_rate_matrix_versions(id),
  generated_at timestamptz NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX draft_quote_cache_input_hash_idx
  ON draft_quote_cache (pricing_input_hash, generated_at DESC);
