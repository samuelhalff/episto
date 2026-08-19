#!/usr/bin/env bash
# Episto — production deploy
#
# Builds the prod docker images on this machine (the prod VPS only has 2 GB
# RAM — too small to build), saves them as compressed tarballs, ships them
# over SSH together with .env.production + docker-compose.prod.yml, then
# loads + restarts the stack on the remote host.
#
# Usage:
#   ./scripts/deploy.sh                       # interactive
#   PROD_HOST=episto.ch ./scripts/deploy.sh   # non-interactive
#   PROD_HOST=1.2.3.4 SKIP_BUILD=1 ./scripts/deploy.sh   # ship cached images
#
# Required local files (gitignored):
#   .env.production            ← live secrets, see docs above
#   ~/.ssh/id_deploy_to_prod   ← SSH key authorized on the prod box
#
# Idempotent: safe to re-run after every staging change.

set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── Config ────────────────────────────────────────────────────────────────
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_deploy_to_prod}"
SSH_USER="${SSH_USER:-ubuntu}"
PROD_PATH="${PROD_PATH:-/home/ubuntu/episto}"
ENV_FILE="${ENV_FILE:-.env.production}"
OCR_SOURCE_ENV_FILE="${OCR_SOURCE_ENV_FILE:-.env}"
SERVICE_ACCOUNT_SOURCE="${SERVICE_ACCOUNT_SOURCE:-.google-service-account.json}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
PROJECT_NAME="${PROJECT_NAME:-}"
REMOTE_ENV_PATH="${REMOTE_ENV_PATH:-/etc/episto/production.env}"
REMOTE_WEBROOT_PATH="${REMOTE_WEBROOT_PATH:-/var/lib/episto-www}"
REMOTE_ENV_UPLOAD="${REMOTE_ENV_UPLOAD:-$PROD_PATH/.production.env.upload}"
SKIP_BUILD="${SKIP_BUILD:-0}"
SKIP_UPLOAD="${SKIP_UPLOAD:-0}"
SKIP_RESTART="${SKIP_RESTART:-0}"
PRUNE_REMOTE="${PRUNE_REMOTE:-1}"
TEMP_ENV_FILE=""

# ── Helpers ───────────────────────────────────────────────────────────────
say() { printf '\033[1;36m▶\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }
cleanup() {
  if [[ -n "$TEMP_ENV_FILE" && -f "$TEMP_ENV_FILE" ]]; then
    rm -f "$TEMP_ENV_FILE"
  fi
}
trap cleanup EXIT

extract_env() {
  local key="$1"
  local line

  line=$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)
  [[ -n "$line" ]] || return 1
  printf '%s' "${line#*=}"
}

extract_host() {
  printf '%s' "$1" | sed -E 's#^[A-Za-z][A-Za-z0-9+.-]*://([^/:]+).*$#\1#'
}

append_domain() {
  local domain="$1"
  local existing

  [[ -n "$domain" ]] || return 0
  for existing in "${CERTBOT_DOMAINS[@]:-}"; do
    [[ "$existing" == "$domain" ]] && return 0
  done
  CERTBOT_DOMAINS+=("$domain")
}

[[ -f "$ENV_FILE" ]] || die "$ENV_FILE not found in $REPO_ROOT"

# Scanned PDFs and images are unreadable without both Document Intelligence
# settings. Keep the live production file minimal, but safely fill missing OCR
# settings from the local environment already used for development. The merged
# file is temporary, never committed, and is removed on exit.
for ocr_key in AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT AZURE_DOCUMENT_INTELLIGENCE_KEY; do
  if ! grep -Eq "^${ocr_key}=.+" "$ENV_FILE"; then
    [[ -f "$OCR_SOURCE_ENV_FILE" ]] || die "$ocr_key is missing from $ENV_FILE and $OCR_SOURCE_ENV_FILE is unavailable"
    grep -Eq "^${ocr_key}=.+" "$OCR_SOURCE_ENV_FILE" \
      || die "$ocr_key is missing from both $ENV_FILE and $OCR_SOURCE_ENV_FILE"
    if [[ -z "$TEMP_ENV_FILE" ]]; then
      TEMP_ENV_FILE="$(mktemp "${TMPDIR:-/tmp}/episto-production-env.XXXXXX")"
      cp "$ENV_FILE" "$TEMP_ENV_FILE"
      chmod 600 "$TEMP_ENV_FILE"
    fi
    grep -E "^${ocr_key}=" "$OCR_SOURCE_ENV_FILE" >> "$TEMP_ENV_FILE"
  fi
done
if [[ -n "$TEMP_ENV_FILE" ]]; then
  ENV_FILE="$TEMP_ENV_FILE"
  say "Added missing OCR settings to the temporary deployment environment (secret values hidden)."
fi
if [[ -f "$SERVICE_ACCOUNT_SOURCE" ]]; then
  HAS_SERVICE_ACCOUNT=1
else
  HAS_SERVICE_ACCOUNT=0
  echo "▶ No $SERVICE_ACCOUNT_SOURCE in $REPO_ROOT — skipping GA4/Ads service-account provisioning (acquisition analytics stay disabled until it is provided)." >&2
fi
[[ -f "$COMPOSE_FILE" ]] || die "$COMPOSE_FILE not found"
[[ -r "$SSH_KEY" ]] || die "SSH key $SSH_KEY missing or unreadable (chmod 600)"

if [[ -z "${PROD_HOST:-}" ]]; then
  read -r -p "Production host (e.g. episto.ch): " PROD_HOST
  [[ -n "$PROD_HOST" ]] || die "PROD_HOST is required"
fi

POSTGRES_PASSWORD=$(extract_env POSTGRES_PASSWORD || true)
MINIO_ROOT_PASSWORD=$(extract_env MINIO_ROOT_PASSWORD || true)
NEXT_PUBLIC_SITE_URL=$(extract_env NEXT_PUBLIC_SITE_URL || true)
NEXT_PUBLIC_API_URL_VALUE=$(extract_env NEXT_PUBLIC_API_URL || true)
PUBLIC_FRONTEND_SERVER_NAMES=$(extract_env PUBLIC_FRONTEND_SERVER_NAMES || true)
PUBLIC_TLS_CERT_NAME=$(extract_env PUBLIC_TLS_CERT_NAME || true)
COMPOSE_PROJECT_NAME_OVERRIDE=$(extract_env COMPOSE_PROJECT_NAME || true)
CERTBOT_EMAIL="${CERTBOT_EMAIL:-$(extract_env SUPPORT_EMAIL || true)}"
if [[ -z "$CERTBOT_EMAIL" ]]; then
  CERTBOT_EMAIL="$(extract_env EMAIL_FROM || true)"
fi

if [[ -z "$PROJECT_NAME" ]]; then
  PROJECT_NAME="${COMPOSE_PROJECT_NAME_OVERRIDE:-episto}"
fi

# Images this stack ships (must match service names that have a `build:` block
# in docker-compose.prod.yml). Pinned here so we can save → scp → load.
LOCAL_IMAGES=(
  "${PROJECT_NAME}-backend"
  "${PROJECT_NAME}-worker"
  "${PROJECT_NAME}-frontend"
  "${PROJECT_NAME}-zefix-proxy"
)

[[ -n "$POSTGRES_PASSWORD" ]] || die "POSTGRES_PASSWORD is missing from $ENV_FILE"
[[ -n "$MINIO_ROOT_PASSWORD" ]] || die "MINIO_ROOT_PASSWORD is missing from $ENV_FILE"
[[ "$POSTGRES_PASSWORD" != "CHANGE_ME_TO_A_STRONG_PASSWORD" ]] \
  || die "POSTGRES_PASSWORD still uses the placeholder value"
[[ "$MINIO_ROOT_PASSWORD" != "CHANGE_ME_TO_A_STRONG_PASSWORD" ]] \
  || die "MINIO_ROOT_PASSWORD still uses the placeholder value"
[[ "$NEXT_PUBLIC_SITE_URL" == https://* ]] \
  || die "NEXT_PUBLIC_SITE_URL must be an https:// URL in $ENV_FILE"
[[ -n "$NEXT_PUBLIC_API_URL_VALUE" ]] || die "NEXT_PUBLIC_API_URL is missing from $ENV_FILE"

if [[ -z "$PUBLIC_FRONTEND_SERVER_NAMES" ]]; then
  PUBLIC_FRONTEND_SERVER_NAMES="$(extract_host "$NEXT_PUBLIC_SITE_URL")"
fi
[[ -n "$PUBLIC_FRONTEND_SERVER_NAMES" ]] || die "Unable to derive the public hostname from NEXT_PUBLIC_SITE_URL"

TLS_CERT_NAME="$PUBLIC_TLS_CERT_NAME"
if [[ -z "$TLS_CERT_NAME" ]]; then
  TLS_CERT_NAME="$(printf '%s' "$PUBLIC_FRONTEND_SERVER_NAMES" | awk '{print $1}')"
fi

API_HOST=""
case "$NEXT_PUBLIC_API_URL_VALUE" in
  /*) ;;
  https://*)
    API_HOST="$(extract_host "$NEXT_PUBLIC_API_URL_VALUE")"
    ;;
  *)
    die "NEXT_PUBLIC_API_URL must be a root-relative path or an https:// URL"
    ;;
esac

declare -a CERTBOT_DOMAINS=()
for domain in $PUBLIC_FRONTEND_SERVER_NAMES; do
  append_domain "$domain"
done
append_domain "$API_HOST"
[[ "${#CERTBOT_DOMAINS[@]}" -gt 0 ]] || die "No public hostnames were found for Let's Encrypt"

CERTBOT_ARGS=(
  certonly
  --non-interactive
  --agree-tos
  --keep-until-expiring
  --webroot
  -w "$REMOTE_WEBROOT_PATH"
  --cert-name "$TLS_CERT_NAME"
)
if [[ -n "$CERTBOT_EMAIL" ]]; then
  CERTBOT_ARGS+=(--email "$CERTBOT_EMAIL")
else
  CERTBOT_ARGS+=(--register-unsafely-without-email)
fi
for domain in "${CERTBOT_DOMAINS[@]}"; do
  CERTBOT_ARGS+=(-d "$domain")
done
printf -v CERTBOT_ARGS_ESCAPED '%q ' "${CERTBOT_ARGS[@]}"

chmod 600 "$ENV_FILE"

SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o BatchMode=yes)
RSH="ssh ${SSH_OPTS[*]}"
REMOTE="${SSH_USER}@${PROD_HOST}"
REMOTE_ENV_DIR="$(dirname "$REMOTE_ENV_PATH")"

# ── Sanity: SSH reachable ─────────────────────────────────────────────────
say "Checking SSH connectivity to ${REMOTE}…"
ssh "${SSH_OPTS[@]}" "$REMOTE" "echo ok" >/dev/null \
  || die "SSH to $REMOTE failed (key not authorized? host wrong? port closed?)"

# ── Sanity: prod path + docker present ────────────────────────────────────
say "Checking remote prerequisites…"
ssh "${SSH_OPTS[@]}" "$REMOTE" "set -e
  command -v docker >/dev/null || { echo 'docker missing on remote'; exit 1; }
  docker compose version >/dev/null || { echo 'docker compose v2 missing'; exit 1; }
  command -v certbot >/dev/null || { echo 'certbot missing on remote'; exit 1; }
  mkdir -p '$PROD_PATH' '$PROD_PATH/nginx'
  sudo install -d -o root -g \"\$(id -gn)\" -m 0750 '$REMOTE_ENV_DIR'
  sudo install -d -m 0755 '$REMOTE_WEBROOT_PATH/.well-known/acme-challenge'
" || die "Remote does not look ready for deploy"

# ── Build images locally ──────────────────────────────────────────────────
if [[ "$SKIP_BUILD" != "1" ]]; then
  say "Building production images locally…"
  # Compose needs all NEXT_PUBLIC_* and POSTGRES_* etc. for interpolation; pass
  # the prod env file so build args resolve.
  EPISTO_ENV_FILE="$REPO_ROOT/$ENV_FILE" \
    docker compose --project-name "$PROJECT_NAME" \
    --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build
else
  say "SKIP_BUILD=1 — using cached images"
fi

# Verify each expected image now exists locally.
for img in "${LOCAL_IMAGES[@]}"; do
  docker image inspect "$img" >/dev/null 2>&1 \
    || die "Image $img not found locally. Did the build fail?"
done

# ── Save images → tarball ─────────────────────────────────────────────────
TARBALL="/tmp/${PROJECT_NAME}-images.tar"
say "Saving images → $TARBALL (this can take a minute)…"
docker save -o "$TARBALL" "${LOCAL_IMAGES[@]}"
TAR_SIZE=$(du -h "$TARBALL" | awk '{print $1}')
say "Saved $TAR_SIZE"

# ── Ship payload to prod ──────────────────────────────────────────────────
if [[ "$SKIP_UPLOAD" != "1" ]]; then
  say "Uploading images + compose file + nginx renderer to ${REMOTE}:${PROD_PATH}/ …"
  if ssh "${SSH_OPTS[@]}" "$REMOTE" "command -v rsync >/dev/null"; then
    rsync -e "$RSH" -avz --progress \
      "$TARBALL" "$COMPOSE_FILE" \
      "$REMOTE:$PROD_PATH/"
    rsync -e "$RSH" -avz --progress \
      "nginx/render-prod-proxy.sh" \
      "$REMOTE:$PROD_PATH/nginx/"
    rsync -e "$RSH" -avz --progress --chmod=F600 \
      "$ENV_FILE" \
      "$REMOTE:$REMOTE_ENV_UPLOAD"
    if [[ "$HAS_SERVICE_ACCOUNT" == 1 ]]; then
      rsync -e "$RSH" -avz --progress --chmod=F600 \
        "$SERVICE_ACCOUNT_SOURCE" \
        "$REMOTE:$PROD_PATH/.google-service-account.json"
    fi
  else
    scp "${SSH_OPTS[@]}" "$TARBALL" "$COMPOSE_FILE" \
      "$REMOTE:$PROD_PATH/"
    scp "${SSH_OPTS[@]}" "nginx/render-prod-proxy.sh" \
      "$REMOTE:$PROD_PATH/nginx/"
    scp "${SSH_OPTS[@]}" "$ENV_FILE" \
      "$REMOTE:$REMOTE_ENV_UPLOAD"
    if [[ "$HAS_SERVICE_ACCOUNT" == 1 ]]; then
      scp "${SSH_OPTS[@]}" "$SERVICE_ACCOUNT_SOURCE" \
        "$REMOTE:$PROD_PATH/.google-service-account.json"
    fi
  fi

  say "Installing protected env file on remote…"
  ssh "${SSH_OPTS[@]}" "$REMOTE" "set -Eeuo pipefail
    chmod 600 '$REMOTE_ENV_UPLOAD'
    sudo install -d -o root -g \"\$(id -gn)\" -m 0750 '$REMOTE_ENV_DIR'
    sudo install -o root -g \"\$(id -gn)\" -m 0640 '$REMOTE_ENV_UPLOAD' '$REMOTE_ENV_PATH'
    if [[ -f '$PROD_PATH/.google-service-account.json' ]]; then
      sudo install -o 1001 -g 1001 -m 0400 '$PROD_PATH/.google-service-account.json' /etc/episto/ga-sa.json
    else
      # Keep the compose bind-mount source a real file even when GA4 is not
      # provisioned, so the container starts cleanly (GA4/Ads stay disabled
      # until GOOGLE_SERVICE_ACCOUNT_FILE + GA4_PROPERTY_ID are configured).
      [[ -e /etc/episto/ga-sa.json ]] || sudo install -o 1001 -g 1001 -m 0400 /dev/null /etc/episto/ga-sa.json
    fi
    rm -f '$REMOTE_ENV_UPLOAD' '$PROD_PATH/.google-service-account.json'
  "
else
  say "SKIP_UPLOAD=1 — leaving remote payload untouched"
fi

# ── Load + restart on remote ──────────────────────────────────────────────
if [[ "$SKIP_RESTART" != "1" ]]; then
  say "Loading images and restarting stack on remote…"
  ssh "${SSH_OPTS[@]}" "$REMOTE" "set -Eeuo pipefail
    cd '$PROD_PATH'
    echo '→ Loading new images'
    docker load -i '$(basename "$TARBALL")'
    echo '→ Stopping current stack'
    EPISTO_ENV_FILE='$REMOTE_ENV_PATH' \\
      docker compose --project-name '$PROJECT_NAME' \\
      --env-file '$REMOTE_ENV_PATH' -f '$COMPOSE_FILE' down --remove-orphans
    echo '→ Starting infrastructure services'
    EPISTO_ENV_FILE='$REMOTE_ENV_PATH' \\
      docker compose --project-name '$PROJECT_NAME' \\
      --env-file '$REMOTE_ENV_PATH' -f '$COMPOSE_FILE' up -d postgres redis minio zefix-proxy
    echo '→ Ensuring MinIO bucket exists'
    EPISTO_ENV_FILE='$REMOTE_ENV_PATH' \\
      docker compose --project-name '$PROJECT_NAME' \\
      --env-file '$REMOTE_ENV_PATH' -f '$COMPOSE_FILE' --profile manual run --rm minio-provision
    echo '→ Starting app + proxy services'
    EPISTO_ENV_FILE='$REMOTE_ENV_PATH' \\
      docker compose --project-name '$PROJECT_NAME' \\
      --env-file '$REMOTE_ENV_PATH' -f '$COMPOSE_FILE' up -d backend worker frontend proxy
    echo '→ Running certbot certonly via the shared webroot'
    sudo certbot $CERTBOT_ARGS_ESCAPED
    echo '→ Reloading proxy with current certificate set'
    EPISTO_ENV_FILE='$REMOTE_ENV_PATH' \\
      docker compose --project-name '$PROJECT_NAME' \\
      --env-file '$REMOTE_ENV_PATH' -f '$COMPOSE_FILE' up -d --force-recreate proxy
    if [ '$PRUNE_REMOTE' = '1' ]; then
      echo '→ Pruning dangling images'
      docker image prune -f >/dev/null
    fi
    echo '→ Status:'
    docker compose --project-name '$PROJECT_NAME' \\
      --env-file '$REMOTE_ENV_PATH' -f '$COMPOSE_FILE' ps
  "
else
  say "SKIP_RESTART=1 — payload uploaded, no restart performed"
fi

say "Done."
