# PH System — Documentación de la reestructuración

PHMavericks S.A.S. · Octubre 2026

Este documento recoge qué cambió en PH System durante la reestructuración, cómo
operarlo y cómo recuperarlo si algo sale mal. Está escrito para quien tenga que
retomar el sistema sin haber estado en el proceso.

---

## 1. Qué es y sobre qué corre

Aplicación administrativa interna de PHMavericks: clientes, proyectos, dinero,
gastos, documentos, calendario y entregas.

| | |
|---|---|
| Framework | Next.js 14.2.18 (App Router) + TypeScript |
| Estilos | Tailwind CSS |
| Base de datos | PostgreSQL 17 + Prisma 5.22 |
| Sesiones | JWT (`jose`) en cookie `phm_token` |
| Servidor | VPS Hostinger · Nginx → localhost:3000 · PM2 (proceso `phm`) |
| Dominio | https://app.phmavericks.com |
| Repositorio | github.com/maverickzm07-spec/phmavericks-assets |

---

## 2. Módulos

**Operativos:** Dashboard · Clientes · Servicios · Proyectos · Reportes ·
Finanzas · Ingresos · Gastos · Equipo · Calendario · Portal público de entregas.

**Retirados** (Etapa 3): Planes Mensuales y Contenido como módulos
administrativos. Sus **datos se conservan**: sostienen el histórico financiero y
los enlaces de entrega ya emitidos.

---

## 3. Funciones agregadas

- **Gastos**: por proyecto o generales, con categorías ampliables desde la propia
  aplicación, estado pagado/pendiente y comprobante adjunto.
- **Finanzas** como centro de control: resumen del período, resultado operativo,
  cuentas por cobrar y por pagar, rentabilidad por proyecto e histórico.
- **Documentos adjuntos**: cotizaciones, facturas PDF y XML, comprobantes.
  Antes el sistema no podía guardar ningún archivo.
- **Histórico financiero** consultable dentro de la aplicación, inmutable.
- **Reporte contable** mensual descargable (CSV que Excel abre directamente).
- **Compartir entregas** por WhatsApp y por correo corporativo.
- **Mensaje de agradecimiento** en el portal de entrega, personalizable.
- **Recordatorios** de grabaciones, sesiones y entregas próximas.

---

## 4. Errores corregidos

| Defecto | Consecuencia que tenía |
|---|---|
| Creación de proyectos y planes sin transacción | Un fallo intermedio dejaba un proyecto sin su registro económico |
| El abono solo se creaba si había método de pago | Ingresos cobrados sin respaldo (origen de los $200 sin trazabilidad del cierre) |
| Middleware en la raíz en vez de `src/` | **Nunca se ejecutó**: las páginas se renderizaban sin sesión |
| Cálculo de cartera duplicado | Finanzas y Dashboard podían discrepar |
| Dashboard sumaba ingresos sin límite superior de fecha | Un ingreso futuro inflaba el mes en una pantalla y no en la otra |
| «Por cobrar» fijo en `—` | El dato existía y nunca se mostraba |
| `ensureCurrentMonthlyPlans()` en cada GET | Creaba planes sola: generó $1.200 de cartera fantasma |
| Sincronización de Google en orden inverso | Los cambios hechos en Google nunca volvían a PH System |
| Eventos de calendario no seguían al proyecto | Al reprogramar, el calendario quedaba desfasado |
| Fechas guardadas a medianoche UTC | En Ecuador caían el día anterior |
| El token no revalidaba al usuario | Desactivar a alguien no surtía efecto hasta 7 días |
| Escritura de calendario y entregas sin control de rol | Un rol de solo lectura podía crear y borrar |
| Portal público exponía notas internas e importes | Cualquiera con el enlace los veía |
| Estados nuevos fuera de los filtros del dashboard | Un proyecto recién confirmado desaparecía de los indicadores |

---

## 5. Cambios en la base de datos

Todas las migraciones fueron **aditivas**: ninguna borró datos ni columnas.

- `Client.cedulaRuc`; `Client.business` pasa a opcional
- `ClientProject`: `descripcion`, `driveLink`, `fechaGrabacion`, `mensajeEntrega`
- `ProjectStatus`: se añaden `CONFIRMADO` y `GRABADO` (los antiguos se conservan)
- `Documento` + enum `TipoDocumento` (cotizaciones, facturas, comprobantes)
- `CategoriaGasto`, `Gasto` + enum `EstadoGasto`
- `CalendarEvent`: `lastSyncedAt`, `projectId`
- `Content`: 9 columnas que ya existían en el código y faltaban en producción

Aplicar con `npx prisma db push`. **No requiere `--accept-data-loss`.**

---

## 6. Estados y criterios

**Producción:** Confirmado → Grabado/realizado → En edición → Entregado.
Los valores antiguos (Pendiente, En proceso, Aprobado, Completado, Atrasado)
siguen en la base para los proyectos anteriores.

**Pago** (independiente del anterior): Pendiente · Abonado parcialmente · Pagado.
Un trabajo puede estar entregado y seguir pendiente de cobro.

**Reglas de dinero que el sistema respeta:**

1. Lo cobrado sale de `Ingreso.montoPagado`. Los abonos son su desglose y **nunca
   se suman aparte**.
2. Una cuenta pendiente no es efectivo. Contratado y cobrado van separados.
3. El resultado operativo solo descuenta **gastos pagados**; los pendientes son
   cuentas por pagar.
4. La cartera suma **solo saldos positivos**: un sobrecobro no cancela la deuda
   de otro cliente.
5. Un cobro de una deuda anterior al cierre es **recuperación de cartera**, no
   una venta nueva.

---

## 7. Cierre financiero histórico

Corte: **9 de octubre de 2026, 16:39:54** (America/Guayaquil). Período auditado:
25 abr — 18 sep 2026.

| | |
|---|---|
| Total contratado | $4.461,00 |
| Efectivamente cobrado | $3.636,00 |
| Pendiente de cobro | $875,00 |
| Gastos documentados | **Sin registros** |

**No existe resultado neto histórico**: no se registró ni un gasto antes del
corte. Lo cobrado no es utilidad.

Las cifras viven en `src/lib/historico.ts` como constantes inmutables; no se
recalculan. Se consultan en **Finanzas → Histórico financiero**.

---

## 8. Respaldo y recuperación

> No hay respaldo automático: por decisión de la gerencia es un **procedimiento
> manual**. Ejecútelo antes de cada despliegue o migración.

**Generar** (en el VPS, como root):

```bash
TS=$(TZ=America/Guayaquil date +%Y%m%d-%H%M%S)
sudo -u postgres pg_dump -Fc -d phm_sistema > /var/backups/phm/phm_sistema-$TS.dump
sudo -u postgres pg_dump -Fp -d phm_sistema > /var/backups/phm/phm_sistema-$TS.sql
sha256sum /var/backups/phm/phm_sistema-$TS.*
```

**Verificar que sirve** (un respaldo sin probar no es un respaldo):

```bash
sudo -u postgres createdb phm_restore_test
sudo -u postgres pg_restore -d phm_restore_test /var/backups/phm/phm_sistema-$TS.dump
# comparar conteos de las 13 tablas contra phm_sistema
sudo -u postgres dropdb phm_restore_test
```

**Conservar fuera del servidor**: copiar al equipo local y cotejar el SHA-256.
Un respaldo que solo vive en la máquina que respalda no protege de perderla.

**Restaurar:**

```bash
pm2 stop phm
sudo -u postgres dropdb phm_sistema && sudo -u postgres createdb phm_sistema
sudo -u postgres pg_restore -d phm_sistema /var/backups/phm/<archivo>.dump
pm2 start phm
```

**Los documentos adjuntos NO están en la base**: viven en `UPLOAD_DIR`. Hay que
respaldar esa carpeta por separado.

---

## 9. Despliegue

```bash
cd /var/www/phm
git pull origin main          # main es la rama correcta
npm install
npx prisma generate
npx prisma db push            # migración aditiva
npm run build
pm2 restart phm --update-env && pm2 save
```

Verificar: `curl -s -o /dev/null -w '%{http_code}' https://app.phmavericks.com/login` → 200

### Variable nueva obligatoria

```
UPLOAD_DIR=/var/lib/phm/uploads
```

**Debe apuntar fuera de `/var/www/phm`**, o un `git pull` o un build borrarían
las cotizaciones y facturas.

### Qué esperar en el primer despliegue

- El **middleware se activará por primera vez**: las páginas pasarán a exigir
  sesión de verdad.
- La **primera sincronización de Google** reenviará los 41 eventos una vez
  (tienen `lastSyncedAt` vacío). Es idempotente: actualiza, no duplica.
- Los **planes mensuales desaparecen del menú**. Sus datos y enlaces siguen.

---

## 10. Manual breve

**Registrar un trabajo**
1. Clientes → Nuevo: nombre o razón social, cédula/RUC, WhatsApp, correo.
2. Cotice fuera del sistema y negocie con el cliente.
3. Proyectos → Nuevo: cliente, nombre, descripción, **adjunte el PDF de la
   cotización aprobada**, valor final y anticipo si lo hubo.
4. Indique fecha de grabación y de entrega: entran solas al calendario.
5. Guarde. El sistema crea el ingreso, el abono y muestra el saldo.

**Cobrar el resto**: ficha del proyecto → Registrar pago. El sistema no deja
cobrar de más.

**Gastos**: Gastos → Nuevo. Si lo asocia a un proyecto afecta el resultado de ese
trabajo; si no, es gasto general. Puede crear categorías nuevas desde ahí.

**Entregar**: ficha del proyecto → Entrega del cliente. Pegue el enlace de Drive,
genere el enlace público y compártalo por WhatsApp o correo. **El enlace no
cambia** aunque luego edite estados, fechas o pagos.

**Cierre de mes**: Finanzas → elija el período → «Reporte contable» descarga el
CSV para la contadora.

---

## 11. Estado de las integraciones

| Integración | Estado |
|---|---|
| Google Calendar | Conectada, con renovación automática de token. Sincronización **manual** desde Calendario |
| Google Drive | Solo vista previa por enlace; no se usa su API |
| Correo (SMTP) | Configurado en producción. Sin SMTP no envía: registra en consola |
| SRI | No integrado. Las facturas se adjuntan manualmente |

---

## 12. Pruebas

Batería de aceptación: **51 pruebas, 51 correctas**. Cubre el flujo de proyectos,
los cálculos financieros, archivos, calendario, portal público, roles y sesiones.

El script vive en el scratchpad de la sesión; para reutilizarlo conviene moverlo
al repositorio.

---

## 13. Pendientes y riesgos

**Requieren decisión**
- **Rotar el `JWT_SECRET` de producción.** Al hacerlo se cierran las sesiones
  activas.
- **La contraseña de PostgreSQL está en texto plano en `setup.sh`**, versionado
  en Git. Conviene rotarla y sacarla del repositorio.
- Sin respaldo automático: el último punto de restauración envejece cada día.

**Deuda técnica**
- El dinero se guarda en `Float`. Debería ser `Decimal(12,2)`: con `Float` hay
  errores de redondeo en acumulados. Migración pendiente desde agosto.
- El servidor y PostgreSQL corren en **UTC**, no en America/Guayaquil. Las fechas
  se fijan a mediodía para compensarlo, pero lo correcto sería alinear el huso.
- `/api/servicios` ejecuta su semilla en cada GET.
- `/api/reportes/[planId]` quedó sin interfaz que lo use.

**No implementado**
- PDF del reporte contable generado por el servidor (hoy: CSV + impresión del
  navegador). Requeriría una dependencia nueva.
- Paquete ZIP con los documentos del mes.
- Sincronización automática de Google por cron: sigue siendo manual.
- La ficha de cliente no tiene todavía acceso directo para crear un proyecto.

**Verificado parcialmente**
- La sincronización con Google se probó por lógica, **no contra la cuenta real**:
  habría escrito en el calendario de producción. Ejecute «Sincronizar» una vez
  tras desplegar y revise el resultado.
- El diseño móvil se verificó de forma estructural (sin grids fijos, tablas con
  scroll propio, viewport configurado), **no visualmente en un teléfono**.
