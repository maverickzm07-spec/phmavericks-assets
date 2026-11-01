# Correo de entregas PHMavericks

El botón **Enviar por correo** usa exclusivamente el correo guardado en la ficha del cliente relacionado con la entrega. El navegador envía solamente `accessId`; el servidor obtiene el cliente, el nombre del trabajo y el enlace activo.

El remitente y la dirección de respuesta son `contacto@phmavericks.com`. Se adjunta como imagen inline el banner general de PHMavericks, válido para bodas, sesiones, eventos y videos. El banner, el botón y el enlace de texto abren la entrega del proyecto elegido. El nombre del cliente, el proyecto, el destinatario y la URL se personalizan en cada envío.

## Configuración en el servidor

Configurar los valores SMTP del buzón corporativo en el entorno del proceso de PHM, siguiendo `.env.example`. La contraseña del buzón se configura exclusivamente en el servidor. No se incluye ninguna credencial en este cambio.

Los valores de ejemplo (`smtp.hostinger.com`, puerto 465 y SSL) corresponden a la [configuración oficial de Hostinger Email](https://www.hostinger.com/es/support/1575756-como-obtener-los-detalles-de-configuracion-de-la-cuenta-de-email-para-el-correo-de-hostinger/).

En producción, `NEXTAUTH_URL` debe ser `https://app.phmavericks.com` para generar enlaces absolutos de entrega correctos.

Aplicar este cambio sobre la versión que esté efectivamente desplegada en `/var/www/phm`, compilar con `npm run build` y reiniciar el proceso `phm` de PM2. Verificar primero la rama y el estado del checkout del servidor. Este cambio no modifica el esquema de Prisma ni necesita migraciones de base de datos.

## Comprobación

Ejecutar `node --test tests/delivery-email.test.cjs` y `npx tsc --noEmit`. Las pruebas usan un transporte en memoria: no escriben en la base de datos ni envían correos a personas.

Tras desplegar, comprobar con una entrega de prueba y un buzón controlado que el remitente sea el corporativo, que el destinatario coincida con la ficha y que el banner y ambos enlaces abran esa entrega. Un resultado SMTP aceptado permite mostrar “Enviado”; no garantiza que el proveedor destinatario lo ubique en la bandeja de entrada.

Si faltan credenciales SMTP, o si `SMTP_USER` no es `contacto@phmavericks.com` (por ejemplo, una cuenta de Gmail, que reescribiría el remitente), la API devuelve error 503 y la interfaz no muestra “Enviado”. Si el correo del cliente es inválido o el acceso está desactivado, se solicita corregirlo antes de enviar.

## Banner general

Archivo: `public/email/entrega-phmavericks.jpg` (1200 × 630 px). Conserva la ruta y el formato JPEG para integrarse con el envío inline existente.

Texto gráfico:
- «¡Tu entrega está lista!»
- «Tu material ya está disponible.»
- «Entra al enlace para ver y descargar tu entrega.»
- Botón: «VER MI ENTREGA».

Se editó la imagen con ImageGen tomando el banner existente como referencia, con la indicación de conservar el logo, la distribución y los colores y sustituir las referencias a la sesión familiar y a fotografías por estos textos generales. Se exportó como JPEG optimizado para correo. La comprobación del hash en la prueba de envío corresponde a esta nueva versión.

Para integrar esta actualización, incorporar el commit del banner en la rama efectivamente desplegada y actualizar el archivo público en el VPS. Conservar la configuración SMTP y la personalización ya operativas. Verificar que los nuevos correos incluyan la imagen actualizada y que sigan abriendo la entrega correcta. Los correos enviados anteriormente conservan su imagen anterior.
