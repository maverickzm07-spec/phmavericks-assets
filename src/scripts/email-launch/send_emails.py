"""
Sistema de envío de correos para estreno musical — Maverick Zambrano
Uso:
    python send_emails.py --test         # Envía sólo al TEST_EMAIL
    python send_emails.py --send         # Envía a toda la lista
    python send_emails.py --test --limit 3  # Prueba primeros 3 contactos
"""

import csv
import os
import re
import smtplib
import sys
import time
import argparse
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("[ADVERTENCIA] python-dotenv no instalado. Usando variables de entorno del sistema.")

# ─────────────────────────────────────────────
#  CONFIGURACIÓN
# ─────────────────────────────────────────────

EMAIL_USER     = os.getenv("EMAIL_USER", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
SPOTIFY_LINK   = os.getenv("SPOTIFY_LINK", "https://open.spotify.com/intl-es/album/7gLEL6FDMPbbJINgFmsVcs?si=l8vG_TwWTVSngr6xXux0Jg")
TEST_EMAIL     = os.getenv("TEST_EMAIL", "")
BANNER_URL     = os.getenv("BANNER_URL", "")

SMTP_HOST      = "smtp.gmail.com"
SMTP_PORT      = 587
SUBJECT        = "Te invito a escuchar mi nuevo estreno 🎶"

DELAY_BETWEEN  = 4   # segundos entre correos para reducir riesgo de spam

BASE_DIR       = Path(__file__).parent
CONTACTS_FILE  = BASE_DIR / "correos.csv"
SENT_FILE      = BASE_DIR / "enviados.csv"
ERRORS_FILE    = BASE_DIR / "errores.csv"


# ─────────────────────────────────────────────
#  VALIDACIÓN DE EMAIL
# ─────────────────────────────────────────────

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")

def is_valid_email(email: str) -> bool:
    return bool(EMAIL_REGEX.match(email.strip()))


# ─────────────────────────────────────────────
#  CARGA Y LIMPIEZA DE CONTACTOS
# ─────────────────────────────────────────────

def load_contacts(filepath: Path) -> list[dict]:
    """Lee correos.csv y retorna lista de contactos únicos y válidos."""
    if not filepath.exists():
        print(f"[ERROR] No se encontró el archivo: {filepath}")
        sys.exit(1)

    contacts = []
    seen_emails = set()

    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            email = row.get("email", "").strip().lower()
            nombre = row.get("nombre", "").strip()

            if not email:
                continue
            if not is_valid_email(email):
                print(f"  [SKIP] Email inválido: {email}")
                continue
            if email in seen_emails:
                print(f"  [SKIP] Duplicado: {email}")
                continue

            seen_emails.add(email)
            contacts.append({"nombre": nombre, "email": email})

    return contacts


# ─────────────────────────────────────────────
#  REGISTROS DE RESULTADO
# ─────────────────────────────────────────────

def _ensure_csv(filepath: Path, headers: list[str]):
    if not filepath.exists():
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(headers)

def record_sent(nombre: str, email: str):
    _ensure_csv(SENT_FILE, ["nombre", "email", "fecha"])
    with open(SENT_FILE, "a", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow([nombre, email, datetime.now().isoformat()])

def record_error(nombre: str, email: str, error: str):
    _ensure_csv(ERRORS_FILE, ["nombre", "email", "error", "fecha"])
    with open(ERRORS_FILE, "a", newline="", encoding="utf-8") as f:
        csv.writer(f).writerow([nombre, email, error, datetime.now().isoformat()])


# ─────────────────────────────────────────────
#  CONSTRUCCIÓN DEL CORREO — PLAIN TEXT
# ─────────────────────────────────────────────

def build_plain_text_email(nombre: str, spotify_link: str) -> str:
    saludo = f"Hola {nombre}," if nombre else "Hola,"
    return f"""{saludo}

Hoy quiero invitarte personalmente a escuchar mi nuevo estreno musical.

Este proyecto nace desde la emoción del fútbol, la fe en Ecuador y ese sentimiento
que todos vivimos cuando apoyamos a nuestro equipo, incluso en los momentos difíciles.

Ya puedes escucharlo aquí:
{spotify_link}

Si te gusta, me ayudaría muchísimo que lo compartas o lo agregues a tu playlist.
Ese pequeño gesto apoya mucho este proyecto.

Gracias por escuchar y ser parte de este estreno.

Un abrazo,
Maverick Zambrano
"""


# ─────────────────────────────────────────────
#  CONSTRUCCIÓN DEL CORREO — HTML
# ─────────────────────────────────────────────

def build_html_email(nombre: str, spotify_link: str, banner_url: str) -> str:
    saludo = f"Hola {nombre}," if nombre else "Hola,"

    banner_block = ""
    if banner_url:
        banner_block = f"""
        <!-- BANNER HERO -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:0; line-height:0; font-size:0;">
              <img src="{banner_url}"
                   alt="Nuevo estreno — Maverick Zambrano"
                   width="600"
                   style="display:block; width:100%; max-width:600px;
                          height:auto; border-radius:12px 12px 0 0;"
              />
            </td>
          </tr>
        </table>
        """
    else:
        # Hero banner cinematográfico — sin imagen externa
        banner_block = """
        <!-- HERO BANNER CINEMATOGRÁFICO -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="border-radius:12px 12px 0 0; overflow:hidden;">
          <tr>
            <!-- Capa de fondo: negro profundo con velo azul-oscuro -->
            <td style="background-color:#080808;
                       border-radius:12px 12px 0 0;
                       padding:0;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- FRANJA SUPERIOR: etiqueta de release -->
                <tr>
                  <td style="padding:28px 40px 0; text-align:left;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="background-color:#1DB954; border-radius:3px;
                                   padding:4px 12px;">
                          <p style="margin:0; font-family:Arial,Helvetica,sans-serif;
                                    font-size:9px; font-weight:700; letter-spacing:3px;
                                    text-transform:uppercase; color:#000000;
                                    line-height:1.4;">
                            Nuevo estreno
                          </p>
                        </td>
                        <td style="padding-left:14px; vertical-align:middle;">
                          <p style="margin:0; font-family:Arial,Helvetica,sans-serif;
                                    font-size:9px; font-weight:400; letter-spacing:2px;
                                    text-transform:uppercase; color:#444444;">
                            2025
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- NOMBRE DEL ARTISTA — tipografía display grande -->
                <tr>
                  <td style="padding:24px 40px 0; text-align:left;">
                    <p style="margin:0; font-family:Arial,Helvetica,sans-serif;
                               font-size:13px; font-weight:400; letter-spacing:5px;
                               text-transform:uppercase; color:#666666;
                               line-height:1;">
                      Maverick
                    </p>
                    <h1 style="margin:0; font-family:Arial,Helvetica,sans-serif;
                                font-size:58px; font-weight:900; color:#ffffff;
                                line-height:0.95; letter-spacing:-2px;
                                text-transform:uppercase;">
                      Zambrano
                    </h1>
                  </td>
                </tr>

                <!-- LÍNEA DIVISORA + TAGLINE -->
                <tr>
                  <td style="padding:22px 40px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <!-- Barra verde corta -->
                        <td width="32" style="vertical-align:middle; padding-right:16px;">
                          <div style="width:32px; height:2px; background-color:#1DB954;"></div>
                        </td>
                        <!-- Tagline -->
                        <td style="vertical-align:middle;">
                          <p style="margin:0; font-family:Arial,Helvetica,sans-serif;
                                    font-size:11px; font-weight:400; letter-spacing:3px;
                                    text-transform:uppercase; color:#888888;">
                            Ya disponible en Spotify
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ESPACIO INFERIOR del hero -->
                <tr>
                  <td style="padding:36px 40px 40px; text-align:left;">
                    <!-- Tres líneas decorativas tipo "score musical" -->
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <div style="width:280px; height:1px; background-color:#1a1a1a; margin-bottom:9px;"></div>
                          <div style="width:200px; height:1px; background-color:#1a1a1a; margin-bottom:9px;"></div>
                          <div style="width:120px; height:1px; background-color:#1a1a1a;"></div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
        """

    return f"""<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Nuevo estreno — Maverick Zambrano</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 620px) {{
      .email-body      {{ padding: 12px !important; }}
      .card            {{ border-radius: 12px !important; }}
      .card-inner      {{ padding: 32px 24px !important; }}
      .hero-title      {{ font-size: 26px !important; }}
      .cta-button      {{ font-size: 15px !important; padding: 14px 28px !important; }}
      .footer-text     {{ font-size: 11px !important; }}
    }}
  </style>
</head>
<body style="margin:0; padding:0; background-color:#0f0f0f;
             font-family:Arial,Helvetica,sans-serif; -webkit-text-size-adjust:100%;">

  <!-- PREHEADER INVISIBLE -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;
              font-size:1px; color:#0f0f0f; line-height:1px;">
    Ya está disponible mi nuevo estreno musical. Escúchalo en Spotify ahora.
    &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <!-- WRAPPER -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#0f0f0f; min-width:320px;">
    <tr>
      <td class="email-body" align="center"
          style="padding:32px 16px 48px;">

        <!-- TARJETA CENTRAL -->
        <table class="card" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px; width:100%; background-color:#181818;
                      border-radius:16px; overflow:hidden;
                      border:1px solid #2a2a2a;">

          <!-- ── BANNER HERO ── -->
          <tr>
            <td style="padding:0;">{banner_block}
            </td>
          </tr>

          <!-- ── ENCABEZADO DE SECCIÓN (solo cuando hay imagen de banner) ── -->
          {"""
          <tr>
            <td style="padding:28px 48px 0; text-align:left;">
              <p style="margin:0 0 4px; font-family:Arial,Helvetica,sans-serif;
                        font-size:9px; font-weight:700; letter-spacing:4px;
                        text-transform:uppercase; color:#1DB954;">
                Nuevo estreno
              </p>
              <h2 style="margin:0; font-family:Arial,Helvetica,sans-serif;
                          font-size:26px; font-weight:900; color:#ffffff;
                          letter-spacing:-0.5px; line-height:1.15;">
                Maverick Zambrano
              </h2>
              <p style="margin:6px 0 0; font-family:Arial,Helvetica,sans-serif;
                         font-size:13px; color:#888888; letter-spacing:1px;">
                Ya disponible en Spotify
              </p>
            </td>
          </tr>
          """ if banner_url else ""}

          <!-- ── CUERPO PRINCIPAL ── -->
          <tr>
            <td class="card-inner"
                style="padding:28px 48px 40px;">

              <!-- Divisor superior si hay banner -->
              {"""
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid #2a2a2a; padding-bottom:24px;"></td>
                </tr>
              </table>
              """ if banner_url else ""}

              <!-- Saludo personalizado -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-top:28px;">
                    <p style="margin:0 0 18px; font-family:Arial,Helvetica,sans-serif;
                               font-size:16px; color:#e0e0e0; line-height:1.6;">
                      {saludo}
                    </p>
                    <p style="margin:0 0 18px; font-family:Arial,Helvetica,sans-serif;
                               font-size:15px; color:#c8c8c8; line-height:1.75;">
                      Hoy quiero invitarte personalmente a escuchar mi
                      <strong style="color:#ffffff;">nuevo estreno musical</strong>.
                    </p>
                    <p style="margin:0 0 18px; font-family:Arial,Helvetica,sans-serif;
                               font-size:15px; color:#c8c8c8; line-height:1.75;">
                      Este proyecto nace desde la emoción del fútbol, la fe en Ecuador
                      y ese sentimiento que todos vivimos cuando apoyamos a nuestro
                      equipo, incluso en los momentos difíciles.
                    </p>
                    <p style="margin:0 0 32px; font-family:Arial,Helvetica,sans-serif;
                               font-size:15px; color:#c8c8c8; line-height:1.75;">
                      Ya puedes escucharlo aquí.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA BOTÓN SPOTIFY -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:36px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
                                 xmlns:w="urn:schemas-microsoft-com:office:word"
                                 href="{spotify_link}"
                                 style="height:52px;v-text-anchor:middle;width:240px;"
                                 arcsize="50%" stroke="f" fillcolor="#1DB954">
                      <w:anchorlock/>
                      <center style="color:#000000;font-family:Arial,Helvetica,sans-serif;
                                     font-size:16px;font-weight:700;">
                        Escuchar en Spotify
                      </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="{spotify_link}"
                       class="cta-button"
                       style="display:inline-block; background-color:#1DB954;
                              color:#000000; font-family:Arial,Helvetica,sans-serif;
                              font-size:16px; font-weight:700; text-decoration:none;
                              padding:16px 48px; border-radius:50px;
                              letter-spacing:0.3px; line-height:1;">
                      ▶&nbsp;&nbsp;Escuchar en Spotify
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <!-- DIVISOR -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid #2a2a2a; padding-top:28px;">
                  </td>
                </tr>
              </table>

              <!-- BLOQUE COMPARTIR -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-top:4px;">
                    <!-- Icono musical decorativo -->
                    <p style="margin:0 0 12px; font-family:Arial,Helvetica,sans-serif;
                               font-size:22px; text-align:center;">
                      &#9835;
                    </p>
                    <p style="margin:0 0 12px; font-family:Arial,Helvetica,sans-serif;
                               font-size:14px; font-weight:700; color:#ffffff;
                               text-align:center; text-transform:uppercase;
                               letter-spacing:2px;">
                      Comparte este lanzamiento
                    </p>
                    <p style="margin:0 0 28px; font-family:Arial,Helvetica,sans-serif;
                               font-size:14px; color:#a0a0a0; line-height:1.7;
                               text-align:center;">
                      Si te gusta, me ayudaría muchísimo que lo compartas<br>
                      o lo agregues a tu playlist. Ese pequeño gesto<br>
                      apoya mucho este proyecto.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- FIRMA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid #2a2a2a; padding-top:24px;">
                    <p style="margin:0 0 4px; font-family:Arial,Helvetica,sans-serif;
                               font-size:14px; color:#a0a0a0;">
                      Gracias por escuchar y ser parte de este estreno.
                    </p>
                    <p style="margin:0; font-family:Arial,Helvetica,sans-serif;
                               font-size:14px; color:#a0a0a0;">
                      Un abrazo,
                    </p>
                    <p style="margin:8px 0 0; font-family:Arial,Helvetica,sans-serif;
                               font-size:17px; font-weight:700; color:#ffffff;
                               letter-spacing:0.3px;">
                      Maverick Zambrano
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background-color:#111111; padding:20px 40px;
                       border-top:1px solid #222222; border-radius:0 0 16px 16px;">
              <p class="footer-text"
                 style="margin:0; font-family:Arial,Helvetica,sans-serif;
                        font-size:11px; color:#555555; text-align:center;
                        line-height:1.6;">
                Recibiste este correo porque formas parte de mi círculo cercano.<br>
                Si no deseas recibir más correos de este tipo, simplemente ignóralo.
              </p>
            </td>
          </tr>

        </table>
        <!-- FIN TARJETA -->

      </td>
    </tr>
  </table>
  <!-- FIN WRAPPER -->

</body>
</html>"""


# ─────────────────────────────────────────────
#  ENVÍO DE UN CORREO
# ─────────────────────────────────────────────

def send_email(smtp: smtplib.SMTP, nombre: str, to_email: str) -> bool:
    """Construye y envía el correo a un destinatario. Retorna True si fue exitoso."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = SUBJECT
        msg["From"]    = f"Maverick Zambrano <{EMAIL_USER}>"
        msg["To"]      = to_email
        msg["Reply-To"] = EMAIL_USER

        # Cabeceras anti-spam
        msg["X-Mailer"] = "Python/smtplib"
        msg["Precedence"] = "bulk"

        plain = build_plain_text_email(nombre, SPOTIFY_LINK)
        html  = build_html_email(nombre, SPOTIFY_LINK, BANNER_URL)

        msg.attach(MIMEText(plain, "plain", "utf-8"))
        msg.attach(MIMEText(html,  "html",  "utf-8"))

        smtp.sendmail(EMAIL_USER, to_email, msg.as_string())
        return True

    except Exception as e:
        record_error(nombre, to_email, str(e))
        return False


# ─────────────────────────────────────────────
#  CONEXIÓN SMTP
# ─────────────────────────────────────────────

def get_smtp_connection() -> smtplib.SMTP:
    if not EMAIL_USER or not EMAIL_PASSWORD:
        print("[ERROR] EMAIL_USER y EMAIL_PASSWORD deben estar definidos en .env")
        sys.exit(1)

    print(f"  Conectando a {SMTP_HOST}:{SMTP_PORT} ...")
    smtp = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
    smtp.ehlo()
    smtp.starttls()
    smtp.ehlo()
    smtp.login(EMAIL_USER, EMAIL_PASSWORD)
    print(f"  Sesión iniciada como: {EMAIL_USER}\n")
    return smtp


# ─────────────────────────────────────────────
#  MODO PRUEBA
# ─────────────────────────────────────────────

def run_test_mode(contacts: list[dict], limit: int | None = None):
    """Envía sólo al TEST_EMAIL (o primeros `limit` contactos si se especifica)."""
    if not TEST_EMAIL:
        print("[ERROR] TEST_EMAIL no está definido en .env")
        sys.exit(1)

    targets = contacts[:limit] if limit else contacts[:1]

    print("=" * 52)
    print("  MODO PRUEBA")
    print(f"  Destinatario real: {TEST_EMAIL}")
    print(f"  Contactos simulados: {len(targets)}")
    print("=" * 52 + "\n")

    smtp = get_smtp_connection()
    try:
        for i, contact in enumerate(targets, 1):
            nombre = contact["nombre"]
            original = contact["email"]
            print(f"  [{i}/{len(targets)}] Simulando → {original} | enviando a {TEST_EMAIL}")

            ok = send_email(smtp, nombre, TEST_EMAIL)
            estado = "OK" if ok else "ERROR"
            print(f"         [{estado}]")

            if i < len(targets):
                time.sleep(DELAY_BETWEEN)
    finally:
        smtp.quit()

    print(f"\n  Prueba finalizada.")


# ─────────────────────────────────────────────
#  ENVÍO REAL
# ─────────────────────────────────────────────

def run_send_mode(contacts: list[dict]):
    """Envía a todos los contactos de la lista."""
    total  = len(contacts)
    ok_cnt = 0
    er_cnt = 0

    print("=" * 52)
    print(f"  ENVÍO REAL — {total} contacto(s)")
    print("=" * 52 + "\n")

    confirm = input(f"  ¿Confirmas el envío a {total} contactos? (escribe 'si'): ")
    if confirm.strip().lower() not in ("si", "sí"):
        print("  Envío cancelado.")
        sys.exit(0)

    smtp = get_smtp_connection()
    try:
        for i, contact in enumerate(contacts, 1):
            nombre = contact["nombre"]
            email  = contact["email"]
            print(f"  [{i:>3}/{total}] {email:<40}", end=" ")

            ok = send_email(smtp, nombre, email)
            if ok:
                record_sent(nombre, email)
                ok_cnt += 1
                print("✓")
            else:
                er_cnt += 1
                print("✗ ERROR")

            if i < total:
                time.sleep(DELAY_BETWEEN)

    finally:
        smtp.quit()

    print("\n" + "=" * 52)
    print(f"  Enviados : {ok_cnt}")
    print(f"  Errores  : {er_cnt}")
    print(f"  Total    : {total}")
    print("=" * 52)
    if ok_cnt:  print(f"  Registro: {SENT_FILE}")
    if er_cnt:  print(f"  Errores:  {ERRORS_FILE}")


# ─────────────────────────────────────────────
#  PUNTO DE ENTRADA
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Envío de correos para estreno musical — Maverick Zambrano"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--test", action="store_true",
                       help="Modo prueba: envía sólo a TEST_EMAIL")
    group.add_argument("--send", action="store_true",
                       help="Modo real: envía a toda la lista")
    parser.add_argument("--limit", type=int, default=None,
                        help="Limita el número de contactos (sólo en --test)")
    args = parser.parse_args()

    print("\n  Cargando contactos desde:", CONTACTS_FILE)
    contacts = load_contacts(CONTACTS_FILE)
    print(f"  {len(contacts)} contacto(s) válido(s) y únicos cargados.\n")

    if not contacts:
        print("[ERROR] No hay contactos válidos en el CSV.")
        sys.exit(1)

    if args.test:
        run_test_mode(contacts, limit=args.limit)
    elif args.send:
        run_send_mode(contacts)


if __name__ == "__main__":
    main()
