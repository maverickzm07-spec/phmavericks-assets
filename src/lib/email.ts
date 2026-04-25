import nodemailer from 'nodemailer'

function createTransporter() {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  })
}

export async function sendVerificationCode(
  email: string,
  code: string,
  recipientName: string
): Promise<{ ok: boolean; devMode?: boolean }> {
  const transporter = createTransporter()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:16px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#8B0000;padding:28px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(0,0,0,0.3);border-radius:10px;padding:8px 14px;margin-right:12px;">
                    <span style="color:#fff;font-weight:800;font-size:16px;letter-spacing:1px;">PH</span>
                  </td>
                  <td style="padding-left:14px;">
                    <p style="margin:0;color:#fff;font-weight:700;font-size:16px;">PHM Sistema</p>
                    <p style="margin:0;color:rgba(255,255,255,0.7);font-size:12px;">PHMavericks Agency</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <p style="margin:0 0 8px;color:#a1a1aa;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Verificación de cuenta</p>
              <h1 style="margin:0 0 16px;color:#fafafa;font-size:22px;font-weight:700;">Hola, ${recipientName} 👋</h1>
              <p style="margin:0 0 28px;color:#a1a1aa;font-size:15px;line-height:1.6;">
                Un administrador de <strong style="color:#fafafa;">PHM Sistema</strong> ha iniciado la creación de tu cuenta.
                Usa el siguiente código para confirmar tu correo electrónico:
              </p>

              <!-- Code Box -->
              <div style="text-align:center;margin:0 0 28px;">
                <div style="display:inline-block;background:#0a0a0a;border:2px solid #8B0000;border-radius:12px;padding:20px 40px;">
                  <p style="margin:0;color:#fafafa;font-size:40px;font-weight:800;letter-spacing:14px;font-family:monospace;">${code}</p>
                </div>
                <p style="margin:12px 0 0;color:#71717a;font-size:12px;">Este código expira en <strong style="color:#a1a1aa;">15 minutos</strong></p>
              </div>

              <div style="background:#0a0a0a;border:1px solid #27272a;border-radius:8px;padding:14px 16px;margin:0 0 24px;">
                <p style="margin:0;color:#71717a;font-size:12px;line-height:1.6;">
                  🔒 Si no esperabas este correo, puedes ignorarlo con seguridad.
                  Tu cuenta no será creada hasta que el código sea ingresado.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #27272a;">
              <p style="margin:0;color:#3f3f46;font-size:12px;text-align:center;">
                © ${new Date().getFullYear()} PHMavericks Agency — Sistema Interno
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  // Sin SMTP configurado: modo desarrollo, imprimir en consola
  if (!transporter) {
    console.log('\n' + '═'.repeat(50))
    console.log('📧  CÓDIGO DE VERIFICACIÓN (modo desarrollo)')
    console.log('═'.repeat(50))
    console.log(`  Para: ${email} (${recipientName})`)
    console.log(`  Código: \x1b[33m${code}\x1b[0m`)
    console.log('═'.repeat(50) + '\n')
    return { ok: true, devMode: true }
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `PHM Sistema <${process.env.SMTP_USER}>`,
    to: email,
    subject: `${code} es tu código de verificación — PHM Sistema`,
    html,
  })

  return { ok: true, devMode: false }
}
