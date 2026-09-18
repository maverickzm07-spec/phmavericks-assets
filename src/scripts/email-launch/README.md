# Sistema de correos — Estreno Musical Maverick Zambrano

Herramienta en Python para enviar correos de invitación personalizados al lanzamiento musical.

---

## Requisitos

```bash
pip install python-dotenv
```

> `openpyxl` **no es necesario** — el conversor de Excel usa sólo la biblioteca estándar de Python.

---

## Configuración inicial

### 1. Crear el archivo `.env`

Copia `.env.example` y renómbralo a `.env`:

```bash
cp .env.example .env
```

Abre `.env` y llena los valores.

---

### 2. Crear una contraseña de aplicación en Gmail

Tu contraseña normal de Gmail **no funciona** con `smtplib`. Necesitas una contraseña de aplicación:

1. Ve a [myaccount.google.com](https://myaccount.google.com)
2. Selecciona **Seguridad** en el menú lateral
3. En "Cómo accedes a Google", activa la **Verificación en dos pasos** (si no está activa)
4. Regresa a Seguridad → busca **Contraseñas de aplicaciones**
   (o ve directo a: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords))
5. En "Nombre de la aplicación" escribe algo como `Email Lanzamiento`
6. Haz clic en **Crear**
7. Copia la contraseña de 16 caracteres (los espacios se pueden incluir o quitar)
8. Pégala en tu `.env` como valor de `EMAIL_PASSWORD`

---

### 3. Preparar la lista de contactos

#### Opción A — Desde tu archivo Excel

Usa el conversor incluido (no necesita instalar nada extra):

```bash
python xlsx_to_csv.py C:\Users\tres3\Downloads\export_1454742444.xlsx
```

Esto genera `correos.csv` automáticamente con las columnas `name` y `email` del Excel.
Si tus columnas tienen nombres distintos, usa los flags:

```bash
python xlsx_to_csv.py archivo.xlsx --col-nombre nombre_columna --col-email email_columna
```

#### Opción B — Editar `correos.csv` manualmente

El CSV debe tener estas columnas (primera fila = cabecera):

```csv
nombre,email
Andrés García,andres@ejemplo.com
María López,maria@ejemplo.com
,sinNombre@ejemplo.com
```

- Si el nombre está vacío, el saludo será genérico ("Hola,")
- Los duplicados y correos inválidos se ignoran automáticamente

---

### 4. Configurar el banner (`BANNER_URL`)

El banner es la imagen principal del correo (portada del lanzamiento, foto, etc.).

**Pasos recomendados — Google Drive:**

1. Sube la imagen a Google Drive
2. Clic derecho → **Obtener enlace** → cambia a "Cualquier persona con el enlace puede ver"
3. Copia el ID del archivo (la parte larga entre `/d/` y `/view` en la URL)
4. Forma la URL directa así:
   ```
   https://drive.google.com/uc?export=view&id=TU_ID_AQUI
   ```
5. Pégala como valor de `BANNER_URL` en `.env`

**Alternativas:**
- [Imgur](https://imgur.com) — sube y copia el enlace directo (termina en `.jpg` o `.png`)
- [Dropbox](https://dropbox.com) — sube, comparte y cambia `?dl=0` por `?raw=1` en la URL

> Si dejas `BANNER_URL` vacío, el correo muestra un **hero tipográfico cinematográfico** con
> el nombre del artista en grande, etiqueta "Nuevo estreno" y tagline — diseño negro premium.

---

## Uso

### Envío de prueba

Envía un correo de prueba a tu `TEST_EMAIL` con los datos del primer contacto:

```bash
python send_emails.py --test
```

Para simular los primeros 3 contactos (todos van a `TEST_EMAIL`):

```bash
python send_emails.py --test --limit 3
```

### Envío real

Envía a toda la lista de `correos.csv`. Pide confirmación antes de proceder:

```bash
python send_emails.py --send
```

---

## Archivos generados

| Archivo | Descripción |
|---|---|
| `enviados.csv` | Registro de correos enviados exitosamente (nombre, email, fecha) |
| `errores.csv` | Registro de correos que fallaron con el mensaje de error |

---

## Estructura del proyecto

```
email-launch/
├── send_emails.py       # Script principal de envío
├── xlsx_to_csv.py       # Conversor de Excel a correos.csv
├── correos.csv          # Lista de contactos (generada o editada manualmente)
├── .env                 # Variables de entorno (NO subir a git)
├── .env.example         # Plantilla para .env
├── enviados.csv         # Generado automáticamente al enviar
├── errores.csv          # Generado automáticamente si hay errores
└── README.md
```

---

## Notas importantes

- El script espera **4 segundos** entre cada correo para evitar que Gmail lo marque como spam
- Si envías a más de ~100 personas, considera dividirlo en días
- Gmail permite enviar hasta ~500 correos diarios con una cuenta personal
- El correo incluye versión **plain text** además del HTML para mayor compatibilidad
- El diseño del correo es compatible con Gmail, Outlook y clientes móviles
