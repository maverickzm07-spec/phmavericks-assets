# PHM Sistema — PHMavericks Agency

Plataforma interna de gestión de contenidos para PHMavericks. Controla el cumplimiento de contenidos contratados por cliente (reels, carruseles, flyers), guarda links publicados, métricas y genera reportes mensuales automáticos.

## Stack Tecnológico

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (tema oscuro premium)
- **PostgreSQL** + **Prisma ORM**
- **Auth JWT** con cookies HttpOnly
- **bcryptjs** para hashing de contraseñas

---

## Requisitos

- Node.js 18+
- PostgreSQL 14+ (local o en VPS)
- npm o pnpm

---

## Instalación

```bash
# 1. Clona el repositorio
git clone https://github.com/TU_USUARIO/phm-sistema.git
cd phm-sistema

# 2. Instala dependencias
npm install

# 3. Configura variables de entorno
cp .env.example .env
# Edita .env con tus datos reales
```

---

## Configuración del archivo .env

```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/phm_sistema"
JWT_SECRET="tu-clave-secreta-super-larga-y-aleatoria"
```

Para generar una clave JWT segura:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Crear la base de datos

```bash
# Crea la base de datos en PostgreSQL
psql -U postgres -c "CREATE DATABASE phm_sistema;"
```

---

## Comandos de Prisma

```bash
# Generar el cliente Prisma
npm run db:generate

# Aplicar el schema a la base de datos
npm run db:push

# O usar migraciones (recomendado para producción)
npm run db:migrate

# Poblar la base de datos con datos de prueba
npm run db:seed

# Abrir Prisma Studio (interfaz visual)
npm run db:studio
```

---

## Iniciar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Credenciales de prueba

| Campo | Valor |
|-------|-------|
| Email | admin@phmavericks.com |
| Password | cambiar123 |

---

## Build para producción

```bash
npm run build
npm run start
```

---

## Subir a GitHub

```bash
# Inicializar git (si no está inicializado)
git init
git add .
git commit -m "feat: PHM Sistema inicial"

# Crear repositorio en GitHub y conectar
git remote add origin https://github.com/TU_USUARIO/phm-sistema.git
git branch -M main
git push -u origin main
```

---

## Desplegar en VPS (Ubuntu/Debian)

### 1. Preparar el servidor

```bash
# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 (gestor de procesos)
sudo npm install -g pm2

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Instalar Nginx
sudo apt install nginx
```

### 2. Configurar PostgreSQL en VPS

```bash
sudo -u postgres psql
CREATE USER phmuser WITH PASSWORD 'contraseña_segura';
CREATE DATABASE phm_sistema OWNER phmuser;
GRANT ALL PRIVILEGES ON DATABASE phm_sistema TO phmuser;
\q
```

### 3. Clonar y configurar el proyecto

```bash
cd /var/www
git clone https://github.com/TU_USUARIO/phm-sistema.git
cd phm-sistema

# Crear .env con datos de producción
nano .env

# Instalar dependencias y build
npm install
npm run db:push
npm run db:seed
npm run build
```

### 4. Iniciar con PM2

```bash
pm2 start npm --name "phm-sistema" -- start
pm2 save
pm2 startup
```

### 5. Configurar Nginx

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL con Certbot (opcional pero recomendado)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

---

## Módulos del sistema

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Login | `/login` | Autenticación |
| Dashboard | `/dashboard` | Métricas generales |
| Clientes | `/clientes` | CRUD de clientes |
| Planes | `/planes` | Planes mensuales por cliente |
| Contenidos | `/contenidos` | Reels, carruseles y flyers |
| Reportes | `/reportes` | Reporte detallado por plan |

---

## Estructura del proyecto

```
phm/
├── prisma/
│   ├── schema.prisma      # Modelos de base de datos
│   └── seed.ts            # Datos de prueba
├── src/
│   ├── app/
│   │   ├── (protected)/   # Rutas autenticadas
│   │   ├── api/           # API Routes
│   │   └── login/         # Página de login
│   ├── components/
│   │   ├── layout/        # Sidebar y Header
│   │   └── ui/            # Componentes reutilizables
│   ├── lib/               # Utilidades (prisma, auth, utils)
│   └── types/             # TypeScript types
├── .env.example
├── middleware.ts           # Protección de rutas
└── README.md
```

---

© 2026 PHMavericks — Sistema Interno de Gestión
