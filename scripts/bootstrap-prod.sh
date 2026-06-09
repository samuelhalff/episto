#!/usr/bin/env bash
# Episto — first-time prod host bootstrap.
#
# Idempotent: safe to re-run. Installs docker engine + compose v2 plugin from
# Docker's official apt repo, adds the SSH user to the docker group, and
# prepares the deploy directory.
#
# Run from your laptop (NOT on the server):
#   PROD_HOST=episto.ch ./scripts/bootstrap-prod.sh

set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_deploy_to_prod}"
SSH_USER="${SSH_USER:-ubuntu}"
PROD_PATH="${PROD_PATH:-/home/ubuntu/episto}"
REMOTE_ENV_DIR="${REMOTE_ENV_DIR:-/etc/episto}"
REMOTE_WEBROOT_PATH="${REMOTE_WEBROOT_PATH:-/var/lib/episto-www}"

[[ -r "$SSH_KEY" ]] || { echo "missing $SSH_KEY"; exit 1; }
if [[ -z "${PROD_HOST:-}" ]]; then
  read -r -p "Production host (e.g. episto.ch): " PROD_HOST
fi

SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o BatchMode=yes)
REMOTE="${SSH_USER}@${PROD_HOST}"

# The remote needs sudo without a password OR an interactive sudo prompt.
# Most cloud Ubuntu images allow passwordless sudo for the default user.
ssh "${SSH_OPTS[@]}" "$REMOTE" "bash -s" <<REMOTE_SCRIPT
set -Eeuo pipefail

echo '→ Updating apt index'
sudo apt-get update -y

if ! command -v docker >/dev/null; then
  echo '→ Installing docker engine + compose plugin'
  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=\$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu \$(. /etc/os-release && echo \$VERSION_CODENAME) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
else
  echo '→ docker already installed: '"\$(docker --version)"
fi

if ! command -v certbot >/dev/null; then
  echo '→ Installing certbot'
  sudo apt-get install -y certbot
else
  echo '→ certbot already installed: '"\$(certbot --version)"
fi

if ! id -nG \$USER | grep -qw docker; then
  echo '→ Adding \$USER to docker group'
  sudo usermod -aG docker \$USER
fi

sudo systemctl enable --now docker

echo '→ Ensuring deploy directory exists'
mkdir -p '$PROD_PATH'
mkdir -p '$PROD_PATH/nginx'

echo '→ Preparing protected env + ACME webroot directories'
sudo install -d -o root -g "\$(id -gn)" -m 0750 '$REMOTE_ENV_DIR'
sudo install -d -m 0755 '$REMOTE_WEBROOT_PATH/.well-known/acme-challenge'
sudo chown -R \$USER:\$USER '$REMOTE_WEBROOT_PATH'

echo '→ Versions:'
sudo docker --version
sudo docker compose version
sudo certbot --version

echo '→ Bootstrap done. NOTE: if this was the first time adding \$USER to the docker group,'
echo '  you may need a fresh SSH session before docker commands work without sudo.'
REMOTE_SCRIPT
