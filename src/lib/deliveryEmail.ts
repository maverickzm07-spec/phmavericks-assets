export const DELIVERY_SENDER = 'PHMavericks <contacto@phmavericks.com>'
export const DELIVERY_REPLY_TO = 'contacto@phmavericks.com'
export const DELIVERY_BANNER_CID = 'entrega-phmavericks@phmavericks.com'

export interface DeliveryEmailData {
  nombreCliente: string
  nombreTrabajo: string
  url: string
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]!))
}

/** La misma imagen y el mismo mensaje del correo de entrega aprobado. */
export function renderDeliveryEmail({ nombreCliente, nombreTrabajo, url }: DeliveryEmailData) {
  const parsedUrl = new URL(url)
  if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
    throw new Error('Enlace de entrega inválido')
  }

  const saludo = nombreCliente.trim() ? `Hola ${nombreCliente.trim()}` : 'Hola'
  const mensaje = `${saludo}, tu entrega de "${nombreTrabajo}" de PHMavericks ya está lista. Puedes verla aquí:`
  const enlace = escapeHtml(url)

  return {
    subject: `Tu entrega de PHMavericks ya está lista — ${nombreTrabajo}`,
    text: `${mensaje}\n${url}`,
    html: `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f2f2f3;font-family:Arial,sans-serif;color:#222">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table role="presentation" width="700" cellspacing="0" cellpadding="0" style="width:100%;max-width:700px;background:#fff;border-radius:12px;overflow:hidden"><tr>
      <td style="padding:12px 18px 20px;text-align:center">
        <a href="${enlace}" target="_blank"><img src="cid:${DELIVERY_BANNER_CID}" alt="PHMavericks — Tu entrega está lista. Ver mi entrega." width="664" style="display:block;width:100%;max-width:664px;height:auto;border:0"></a>
        <p style="font-size:16px;line-height:1.6;margin:14px 0">${escapeHtml(mensaje)}</p>
        <p style="margin:20px 0"><a href="${enlace}" target="_blank" style="display:inline-block;padding:14px 26px;background:#e90036;color:#fff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:30px">Ver mi entrega</a></p>
        <p style="font-size:13px;line-height:1.6;margin:14px 0 0"><a href="${enlace}" style="color:#d40c34;word-break:break-all">${enlace}</a></p>
      </td>
    </tr></table>
  </td></tr></table>
</body></html>`,
  }
}
