#!/bin/sh
set -e

NODE_ENV=${NODE_ENV:-development}

if [ "$NODE_ENV" = "production" ]; then
    if [ -z "$DOMAIN" ]; then
        echo "❌ DOMAIN doit être défini en production."
        exit 1
    fi

    echo "🔒 Production: configuration Caddy pour $DOMAIN → api-server:5000"

    cat > /etc/caddy/Caddyfile <<EOF
http://$DOMAIN {
    redir https://$DOMAIN{uri}
}

https://$DOMAIN {
    reverse_proxy api-server:5000
}
EOF

else
    echo "🛠 Développement: configuration Caddy pour http://localhost → api-server:5000"

    cat > /etc/caddy/Caddyfile <<EOF
http://localhost {
    reverse_proxy api-server:5000
}
EOF

fi

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile