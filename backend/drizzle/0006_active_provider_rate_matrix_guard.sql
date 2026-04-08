CREATE UNIQUE INDEX provider_rate_matrix_versions_active_provider_idx
  ON provider_rate_matrix_versions (provider_name)
  WHERE status = 'active';
