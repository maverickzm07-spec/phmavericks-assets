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

/**
 * Envía al cliente el enlace de su entrega, con la imagen de PHMavericks.
 *
 * Sin SMTP configurado no falla: registra el correo en la consola y avisa que
 * no se envió. Así se puede probar el flujo completo sin escribirle a nadie.
 */
export async function enviarEntregaPorCorreo(datos: {
  destinatario: string
  nombreCliente: string
  nombreTrabajo: string
  url: string
}): Promise<{ enviado: boolean }> {
  const { destinatario, nombreCliente, nombreTrabajo, url } = datos
  const saludo = nombreCliente ? `Hola ${nombreCliente}` : 'Hola'
  const asunto = `Tu entrega de PHMavericks ya está lista — ${nombreTrabajo}`

  const html = `
<div style="margin:0;padding:32px 16px;background:#0b0b0e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#141418;border:1px solid #26262c;border-radius:16px;overflow:hidden;">
    <div style="padding:28px 28px 20px;border-bottom:1px solid #26262c;">
      <p style="margin:0;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#C9A84C;font-weight:600;">PHMavericks</p>
      <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;color:#ffffff;font-weight:600;">Tu entrega está lista</h1>
    </div>
    <div style="padding:24px 28px;">
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#d4d4d8;">${saludo},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#d4d4d8;">
        Ya puedes ver el material de <strong style="color:#ffffff;">${nombreTrabajo}</strong>.
        Ábrelo cuando quieras desde el siguiente enlace.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${url}" style="display:inline-block;padding:13px 26px;background:#8B0000;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">
          Ver mi entrega
        </a>
      </p>
      <p style="margin:0 0 6px;font-size:12px;color:#8a8a93;">Si el botón no funciona, copia esta dirección:</p>
      <p style="margin:0;font-size:12px;color:#C9A84C;word-break:break-all;">${url}</p>
    </div>
    <div style="padding:18px 28px;border-top:1px solid #26262c;">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#6f6f78;">
        Gracias por confiar en PHMavericks.<br>
        Cualquier duda, responde a este correo.
      </p>
    </div>
  </div>
</div>`.trim()

  const texto = `${saludo},

Ya puedes ver el material de ${nombreTrabajo}.

Ábrelo aquí: ${url}

Gracias por confiar en PHMavericks.`

  const transporter = createTransporter()

  // Sin SMTP: no se envía nada. Queda registrado para poder revisarlo.
  if (!transporter) {
    console.log('[email] SMTP no configurado — entrega NO enviada')
    console.log(`[email] Para: ${destinatario}`)
    console.log(`[email] Asunto: ${asunto}`)
    console.log(`[email] Enlace: ${url}`)
    return { enviado: false }
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `PHMavericks <${process.env.SMTP_USER}>`,
    to: destinatario,
    subject: asunto,
    text: texto,
    html,
  })

  return { enviado: true }
}
