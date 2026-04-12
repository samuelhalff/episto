#!/bin/sh

set -eu

extract_host() {
  printf '%s' "$1" | sed -E 's#^[A-Za-z][A-Za-z0-9+.-]*://([^/:]+).*$#\1#'
}

require_https_url() {
  case "$1" in
    https://*) ;;
    *)
      echo >&2 "Expected an https:// URL, got: $1"
      exit 1
      ;;
  esac
}

NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:?NEXT_PUBLIC_SITE_URL is required}
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:?NEXT_PUBLIC_API_URL is required}

require_https_url "$NEXT_PUBLIC_SITE_URL"

FRONTEND_SERVER_NAMES=${PUBLIC_FRONTEND_SERVER_NAMES:-}
if [ -z "$FRONTEND_SERVER_NAMES" ]; then
  FRONTEND_SERVER_NAMES=$(extract_host "$NEXT_PUBLIC_SITE_URL")
fi

CANONICAL_HOST=$(printf '%s' "$FRONTEND_SERVER_NAMES" | awk '{print $1}')
TLS_CERT_NAME=${PUBLIC_TLS_CERT_NAME:-$CANONICAL_HOST}

API_HOST=""
case "$NEXT_PUBLIC_API_URL" in
  /*) ;;
  https://*)
    API_HOST=$(extract_host "$NEXT_PUBLIC_API_URL")
    ;;
  *)
    echo >&2 "NEXT_PUBLIC_API_URL must be a root-relative path or an https:// URL"
    exit 1
    ;;
esac

HTTP_SERVER_NAMES="$FRONTEND_SERVER_NAMES"
if [ -n "$API_HOST" ] && ! printf ' %s ' "$FRONTEND_SERVER_NAMES" | grep -Fq " $API_HOST "; then
  HTTP_SERVER_NAMES="$HTTP_SERVER_NAMES $API_HOST"
fi

cat > /etc/nginx/conf.d/default.conf <<EOF
map \$http_upgrade \$connection_upgrade {
  default upgrade;
  '' '';
}

map \$http_x_forwarded_proto \$forwarded_proto {
  default \$http_x_forwarded_proto;
  '' \$scheme;
}

map \$http_x_forwarded_host \$forwarded_host {
  default \$http_x_forwarded_host;
  '' \$host;
}

map \$http_x_forwarded_port \$forwarded_port {
  default \$http_x_forwarded_port;
  '' \$server_port;
}

resolver 127.0.0.11 valid=10s ipv6=off;

server {
  listen 5000;
  server_name $HTTP_SERVER_NAMES;

  client_max_body_size 50M;

  proxy_set_header Host              \$host;
  proxy_set_header X-Real-IP         \$remote_addr;
  proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Host  \$forwarded_host;
  proxy_set_header X-Forwarded-Port  \$forwarded_port;
  proxy_set_header X-Forwarded-Proto \$forwarded_proto;
  proxy_set_header Forwarded         "host=\$forwarded_host;proto=\$forwarded_proto";
  proxy_http_version 1.1;
  proxy_redirect off;

  location = /.well-known/apple-developer-merchantid-domain-association {
    root /var/www;
    default_type application/octet-stream;
  }

  location ~ ^/api/v1/drafts/[^/]+/stream {
    set \$backend_upstream http://backend:4000;
    proxy_pass \$backend_upstream;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 300s;
    chunked_transfer_encoding on;
  }

  location /api/ {
    set \$backend_upstream http://backend:4000;
    proxy_pass \$backend_upstream;
    proxy_set_header Upgrade    \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
  }

  location / {
    set \$frontend_upstream http://frontend:3000;
    proxy_pass \$frontend_upstream;
    proxy_set_header Upgrade    \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
  }
}

server {
  listen 80;
  server_name $HTTP_SERVER_NAMES;

  location ^~ /.well-known/acme-challenge/ {
    root /var/www;
  }

  location / {
    return 301 https://\$host\$request_uri;
  }
}
EOF

cat >> /etc/nginx/conf.d/default.conf <<EOF

server {
  listen 443 ssl;
  http2 on;
  server_name $FRONTEND_SERVER_NAMES;

  ssl_certificate /etc/letsencrypt/live/$TLS_CERT_NAME/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$TLS_CERT_NAME/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_prefer_server_ciphers off;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 1d;
  ssl_session_tickets off;

  client_max_body_size 50M;

  proxy_set_header Host              \$host;
  proxy_set_header X-Real-IP         \$remote_addr;
  proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Host  \$host;
  proxy_set_header X-Forwarded-Port  \$server_port;
  proxy_set_header X-Forwarded-Proto https;
  proxy_set_header Forwarded         "host=\$host;proto=https";
  proxy_http_version 1.1;
  proxy_redirect off;
EOF

case "$FRONTEND_SERVER_NAMES" in
  *" "*)
    cat >> /etc/nginx/conf.d/default.conf <<EOF

  if (\$host != $CANONICAL_HOST) {
    return 301 https://$CANONICAL_HOST\$request_uri;
  }
EOF
    ;;
esac

cat >> /etc/nginx/conf.d/default.conf <<'EOF'

  location = /.well-known/apple-developer-merchantid-domain-association {
    root /var/www;
    default_type application/octet-stream;
  }

  location ~ ^/api/v1/drafts/[^/]+/stream {
    set $backend_upstream http://backend:4000;
    proxy_pass $backend_upstream;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 300s;
    chunked_transfer_encoding on;
  }

  location /api/ {
    set $backend_upstream http://backend:4000;
    proxy_pass $backend_upstream;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
  }
EOF

cat >> /etc/nginx/conf.d/default.conf <<'EOF'

  location / {
    set $frontend_upstream http://frontend:3000;
    proxy_pass $frontend_upstream;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
  }
}
EOF

if [ -n "$API_HOST" ] && [ "$API_HOST" != "$CANONICAL_HOST" ]; then
  cat >> /etc/nginx/conf.d/default.conf <<EOF

server {
  listen 443 ssl;
  http2 on;
  server_name $API_HOST;

  ssl_certificate /etc/letsencrypt/live/$TLS_CERT_NAME/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$TLS_CERT_NAME/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_prefer_server_ciphers off;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 1d;
  ssl_session_tickets off;

  client_max_body_size 50M;

  proxy_set_header Host              \$host;
  proxy_set_header X-Real-IP         \$remote_addr;
  proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Host  \$host;
  proxy_set_header X-Forwarded-Port  \$server_port;
  proxy_set_header X-Forwarded-Proto https;
  proxy_set_header Forwarded         "host=\$host;proto=https";
  proxy_http_version 1.1;
  proxy_redirect off;

  location ~ ^/api/v1/drafts/[^/]+/stream {
    set \$backend_upstream http://backend:4000;
    proxy_pass \$backend_upstream;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 300s;
    chunked_transfer_encoding on;
  }

  location / {
    set \$backend_upstream http://backend:4000;
    proxy_pass \$backend_upstream;
    proxy_set_header Upgrade    \$http_upgrade;
    proxy_set_header Connection \$connection_upgrade;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;
  }
}
EOF
fi

exec nginx -g 'daemon off;'
