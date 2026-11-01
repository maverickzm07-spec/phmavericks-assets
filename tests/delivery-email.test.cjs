const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createHash } = require('node:crypto')
const { test } = require('node:test')
const ts = require('typescript')
const nodemailer = require('nodemailer')

const root = path.resolve(__dirname, '..')

// Aislamos SMTP y la base de datos: ninguna prueba envía correos reales.
function loadTs(file, dependencies = {}, env = {}) {
  const filename = path.join(root, file)
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, {
    exports: module.exports, module,
    require: name => dependencies[name] ?? require(name),
    process: { env, cwd: () => root }, URL,
    console: { log() {}, error() {} },
  }, { filename })
  return module.exports
}

const renderer = loadTs('src/lib/deliveryEmail.ts')
const delivery = { nombreCliente: 'Cliente de prueba', nombreTrabajo: 'Sesión de prueba', url: 'https://app.phmavericks.com/e/cliente-prueba' }

test('personaliza el mensaje y enlaza banner, botón y URL a la misma entrega', () => {
  const result = renderer.renderDeliveryEmail(delivery)
  assert.equal(result.text, `Hola Cliente de prueba, tu entrega de "Sesión de prueba" de PHMavericks ya está lista. Puedes verla aquí:\n${delivery.url}`)
  assert.equal((result.html.match(new RegExp(`href="${delivery.url}"`, 'g')) || []).length, 3)
  assert.ok(result.html.includes(`src="cid:${renderer.DELIVERY_BANNER_CID}"`))
  assert.ok(result.html.includes('Ver mi entrega'))
})

test('los nombres se muestran como texto y no pueden inyectar HTML', () => {
  const result = renderer.renderDeliveryEmail({ ...delivery, nombreCliente: '<img src=x onerror=alert(1)>', nombreTrabajo: 'Boda & "Fiesta"' })
  assert.ok(result.html.includes('&lt;img src=x onerror=alert(1)&gt;'))
  assert.ok(result.html.includes('Boda &amp; &quot;Fiesta&quot;'))
  assert.ok(!result.html.includes('<img src=x'))
  assert.throws(() => renderer.renderDeliveryEmail({ ...delivery, url: 'javascript:alert(1)' }))
})

function emailService(sendMail, env = {}) {
  return loadTs('src/lib/email.ts', {
    nodemailer: { createTransport: () => ({ sendMail }) },
    './deliveryEmail': renderer,
  }, { SMTP_HOST: 'smtp.example.test', SMTP_USER: 'contacto@phmavericks.com', SMTP_PASS: 'test-only', ...env })
}

test('SMTP lleva el remitente corporativo, el correo del cliente y el banner inline genérico', async () => {
  let options
  let mime
  const service = emailService(async mail => {
    options = mail
    const stream = nodemailer.createTransport({ streamTransport: true, buffer: true })
    mime = (await stream.sendMail(mail)).message.toString()
    return { accepted: [mail.to.address] }
  }, { SMTP_FROM: 'Cuenta personal <propietario@example.test>' })
  assert.equal((await service.enviarEntregaPorCorreo({ ...delivery, destinatario: ' cliente@example.test ' })).enviado, true)
  assert.equal(options.to.address, 'cliente@example.test')
  assert.equal(options.from, 'PHMavericks <contacto@phmavericks.com>')
  assert.equal(options.replyTo, 'contacto@phmavericks.com')
  assert.equal(options.cc, undefined)
  assert.equal(options.bcc, undefined)
  assert.equal(options.attachments[0].cid, renderer.DELIVERY_BANNER_CID)
  assert.equal(options.attachments[0].contentDisposition, 'inline')
  assert.ok(mime.includes(`Content-ID: <${renderer.DELIVERY_BANNER_CID}>`))
  assert.ok(mime.includes('Content-Type: image/jpeg'))
  const banner = fs.readFileSync(options.attachments[0].path)
  assert.equal(createHash('sha256').update(banner).digest('hex'), '237535ff7d4f38b7764114a926a618d36780a36389bf777fee8510041b3db7ba')
})

test('no confirma envío si faltan credenciales o SMTP rechaza al destinatario', async () => {
  let calls = 0
  const missing = emailService(async () => { calls++; return {} }, { SMTP_PASS: '' })
  assert.equal((await missing.enviarEntregaPorCorreo({ ...delivery, destinatario: 'cliente@example.test' })).enviado, false)
  assert.equal(calls, 0)
  const personal = emailService(async () => { calls++; return {} }, { SMTP_USER: 'cuenta@gmail.com' })
  const resultadoPersonal = await personal.enviarEntregaPorCorreo({ ...delivery, destinatario: 'cliente@example.test' })
  assert.equal(resultadoPersonal.enviado, false)
  assert.equal(resultadoPersonal.motivo, 'cuenta-no-corporativa')
  assert.equal(calls, 0)
  const rejected = emailService(async () => ({ accepted: [], rejected: ['cliente@example.test'] }))
  await assert.rejects(() => rejected.enviarEntregaPorCorreo({ ...delivery, destinatario: 'cliente@example.test' }))
})

function routeFixture({ email = ' cliente@example.test ', active = true, user = { role: 'ADMIN', email: 'propietario@example.test' }, permitted = true, sent = true, motivo, slug = 'cliente-sesion-123' } = {}) {
  const calls = []
  const route = loadTs('src/app/api/delivery-access/enviar/route.ts', {
    'next/server': { NextResponse: { json: (data, init = {}) => ({ status: init.status || 200, data }) } },
    '@/lib/prisma': { prisma: { deliveryAccess: { findUnique: async () => ({
      client: { name: delivery.nombreCliente, email }, project: { nombre: delivery.nombreTrabajo }, monthlyPlan: null,
      isActive: active, publicSlug: slug, token: 'token-privado',
    }) } } },
    '@/lib/auth': { getUserFromRequest: async () => user },
    '@/lib/permissions': { canWriteContents: () => permitted },
    '@/lib/email': { enviarEntregaPorCorreo: async data => { calls.push(data); return { enviado: sent, motivo } } },
  }, { NEXTAUTH_URL: 'https://app.phmavericks.com/' })
  return { calls, post: (body = { accessId: 'access-1' }) => route.POST({ json: async () => body }) }
}

test('la API toma el correo registrado y la URL de esa entrega, ignorando destinos enviados desde el navegador', async () => {
  const fixture = routeFixture()
  const result = await fixture.post({ accessId: 'access-1', destinatario: 'propietario@example.test' })
  assert.equal(result.status, 200)
  assert.equal(result.data.success, true)
  assert.equal(result.data.destinatario, 'cliente@example.test')
  assert.equal(fixture.calls[0].destinatario, 'cliente@example.test')
  assert.equal(fixture.calls[0].url, 'https://app.phmavericks.com/e/cliente-sesion-123')
  assert.equal(fixture.calls[0].nombreTrabajo, delivery.nombreTrabajo)
})

test('los enlaces antiguos siguen llevando a la entrega correspondiente', async () => {
  const fixture = routeFixture({ slug: null })
  assert.equal((await fixture.post()).status, 200)
  assert.equal(fixture.calls[0].url, 'https://app.phmavericks.com/entrega/token-privado')
})

test('sin correo válido, acceso activo o permisos no se intenta enviar', async () => {
  for (const [config, expected] of [
    [{ email: null }, 400], [{ email: 'incorrecto' }, 400], [{ email: ' ' }, 400],
    [{ active: false }, 400], [{ user: null }, 401], [{ permitted: false }, 403],
  ]) {
    const fixture = routeFixture(config)
    assert.equal((await fixture.post()).status, expected)
    assert.equal(fixture.calls.length, 0)
  }
})

test('la API no devuelve éxito si SMTP no está configurado', async () => {
  const result = await routeFixture({ sent: false }).post()
  assert.equal(result.status, 503)
  assert.equal(result.data.success, false)
  assert.ok(result.data.error.includes('no se ha enviado'))
})

test('la API explica cuando SMTP no usa el buzón corporativo', async () => {
  const result = await routeFixture({ sent: false, motivo: 'cuenta-no-corporativa' }).post()
  assert.equal(result.status, 503)
  assert.ok(result.data.error.includes('contacto@phmavericks.com'))
})
