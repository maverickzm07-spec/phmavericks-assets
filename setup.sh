#!/usr/bin/env bash
# Puesta en marcha de PH System en el VPS.
#
# Este script NO lleva credenciales: las toma del entorno. Antes estuvieron
# escritas aqui en texto plano, lo que las publicaba en el repositorio.
# Ejecutar asi:
#   DATABASE_URL=... JWT_SECRET=... bash setup.sh
set -e

echo "==> Creando .env..."
cat > /var/www/phm/.env << ENVEOF
DATABASE_URL="${DATABASE_URL:?define DATABASE_URL antes de ejecutar}"
JWT_SECRET="${JWT_SECRET:?define JWT_SECRET antes de ejecutar}"
NODE_ENV="production"
ENVEOF

echo "==> Sincronizando base de datos..."
cd /var/www/phm
npx prisma db push

echo "==> Creando Super Admin..."
npm run db:seed

echo "==> Compilando app..."
npm run build

echo "==> Iniciando con PM2..."
npm install -g pm2
pm2 delete phm 2>/dev/null || true
pm2 start npm --name phm -- start
pm2 save
pm2 startup | tail -1 | bash || true

echo "==> Configurando Nginx..."
cat > /etc/nginx/sites-available/phm << NGINXEOF
server {
    listen 80;
    server_name app.phmavericks.com;

    # Adjuntos de hasta 25 MB (la app valida el límite exacto).
    client_max_body_size 30M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/phm /etc/nginx/sites-enabled/phm
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> Instalando SSL..."
apt install -y certbot python3-certbot-nginx
certbot --nginx -d app.phmavericks.com --non-interactive --agree-tos -m maverickzm07@gmail.com

echo ""
echo "✓ Deploy completo. Abre https://app.phmavericks.com"
