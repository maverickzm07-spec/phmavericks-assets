import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canViewFinancials } from '@/lib/permissions'

/**
 * Reporte contable del período, en CSV (Excel lo abre directamente).
 *
 * Incluye el detalle de ingresos y gastos, los totales por categoría y el
 * resultado operativo, con la referencia de cada comprobante adjunto para que
 * la contadora pueda cruzarlos.
 */

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function celda(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  return `"${texto.replace(/"/g, '""')}"`
}

function fila(valores: unknown[]): string {
  return valores.map(celda).join(',')
}

function fecha(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canViewFinancials(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const hoy = new Date()
  const anio = Number(searchParams.get('anio')) || hoy.getFullYear()
  const mes = Number(searchParams.get('mes')) || hoy.getMonth() + 1

  if (mes < 1 || mes > 12) {
    return NextResponse.json({ error: 'Mes inválido' }, { status: 400 })
  }

  const inicio = new Date(anio, mes - 1, 1)
  const fin = new Date(anio, mes, 0, 23, 59, 59)

  const [ingresos, gastos] = await Promise.all([
    prisma.ingreso.findMany({
      where: { fechaIngreso: { gte: inicio, lte: fin } },
      include: {
        cliente: { select: { name: true, cedulaRuc: true } },
        project: { select: { nombre: true } },
        documentos: { select: { tipo: true, numeroFactura: true, nombreOriginal: true } },
      },
      orderBy: { fechaIngreso: 'asc' },
    }),
    prisma.gasto.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      include: {
        categoria: { select: { nombre: true } },
        project: { select: { nombre: true } },
        documentos: { select: { nombreOriginal: true } },
      },
      orderBy: { fecha: 'asc' },
    }),
  ])

  const redondear = (n: number) => Math.round(n * 100) / 100
  const totalCobrado = redondear(ingresos.reduce((s, i) => s + (i.montoPagado || 0), 0))
  const gastosPagados = gastos.filter((g) => g.estado === 'PAGADO')
  const totalGastosPagados = redondear(gastosPagados.reduce((s, g) => s + g.monto, 0))
  const totalGastosPendientes = redondear(gastos.filter((g) => g.estado === 'PENDIENTE').reduce((s, g) => s + g.monto, 0))

  const porCategoria: Record<string, number> = {}
  for (const g of gastos) {
    porCategoria[g.categoria.nombre] = redondear((porCategoria[g.categoria.nombre] ?? 0) + g.monto)
  }

  const lineas: string[] = []

  lineas.push(fila([`REPORTE CONTABLE — PHMAVERICKS`]))
  lineas.push(fila([`Período: ${MESES[mes - 1]} ${anio}`]))
  lineas.push(fila([`Generado: ${fecha(hoy)}`, `Moneda: USD`]))
  lineas.push('')

  lineas.push(fila(['RESUMEN']))
  lineas.push(fila(['Concepto', 'Valor']))
  lineas.push(fila(['Ingresos cobrados', totalCobrado]))
  lineas.push(fila(['Gastos pagados', totalGastosPagados]))
  lineas.push(fila(['Resultado operativo', redondear(totalCobrado - totalGastosPagados)]))
  lineas.push(fila(['Gastos pendientes de pago', totalGastosPendientes]))
  lineas.push('')

  lineas.push(fila(['INGRESOS DEL MES']))
  lineas.push(fila(['Fecha', 'Cliente', 'Cédula/RUC', 'Proyecto', 'Descripción', 'Contratado', 'Cobrado', 'Método', 'N.º factura', 'Comprobante']))
  for (const i of ingresos) {
    const factura = i.documentos.find((d) => d.tipo === 'FACTURA_PDF' || d.tipo === 'FACTURA_XML')
    lineas.push(fila([
      fecha(i.fechaIngreso),
      i.cliente?.name ?? '',
      i.cliente?.cedulaRuc ?? '',
      i.project?.nombre ?? '',
      i.descripcion ?? '',
      redondear(i.monto),
      redondear(i.montoPagado || 0),
      i.metodoPago ?? '',
      factura?.numeroFactura ?? '',
      i.documentos.length > 0 ? i.documentos.map((d) => d.nombreOriginal).join(' | ') : 'SIN COMPROBANTE',
    ]))
  }
  lineas.push(fila(['', '', '', '', 'TOTAL COBRADO', '', totalCobrado]))
  lineas.push('')

  lineas.push(fila(['GASTOS DEL MES']))
  lineas.push(fila(['Fecha', 'Concepto', 'Categoría', 'Proveedor', 'Ámbito', 'Estado', 'Valor', 'Método', 'Comprobante']))
  for (const g of gastos) {
    lineas.push(fila([
      fecha(g.fecha),
      g.concepto,
      g.categoria.nombre,
      g.proveedor ?? '',
      g.project ? `Proyecto: ${g.project.nombre}` : 'General',
      g.estado === 'PAGADO' ? 'Pagado' : 'Pendiente',
      redondear(g.monto),
      g.metodoPago ?? '',
      g.documentos.length > 0 ? g.documentos.map((d) => d.nombreOriginal).join(' | ') : 'SIN COMPROBANTE',
    ]))
  }
  lineas.push(fila(['', '', '', '', '', 'TOTAL PAGADO', totalGastosPagados]))
  lineas.push('')

  lineas.push(fila(['GASTOS POR CATEGORÍA']))
  lineas.push(fila(['Categoría', 'Total']))
  for (const [nombre, total] of Object.entries(porCategoria).sort((a, b) => b[1] - a[1])) {
    lineas.push(fila([nombre, total]))
  }

  // BOM para que Excel reconozca los acentos al abrir el archivo
  const csv = '﻿' + lineas.join('\r\n')
  const nombreArchivo = `reporte-contable-${anio}-${String(mes).padStart(2, '0')}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
