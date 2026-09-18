import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canViewFinancials } from '@/lib/permissions'

type Range = 'last_7_days' | 'last_28_days' | 'last_90_days' | 'this_month' | 'previous_month' | 'this_year' | 'all_time' | 'custom'
type GroupBy = 'day' | 'week' | 'month'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const RANGE_LABELS: Record<string, string> = {
  last_7_days: 'Últimos 7 días',
  last_28_days: 'Últimos 28 días',
  last_90_days: 'Últimos 90 días',
  this_month: 'Este mes',
  previous_month: 'Mes anterior',
  this_year: 'Este año',
  all_time: 'Total histórico',
  custom: 'Rango personalizado',
}

function getRangeDates(range: Range, startDate?: string, endDate?: string): { start: Date; end: Date; groupBy: GroupBy } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (range) {
    case 'last_7_days': {
      const s = new Date(today); s.setDate(s.getDate() - 6)
      return { start: s, end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59), groupBy: 'day' }
    }
    case 'last_28_days': {
      const s = new Date(today); s.setDate(s.getDate() - 27)
      return { start: s, end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59), groupBy: 'day' }
    }
    case 'last_90_days': {
      const s = new Date(today); s.setDate(s.getDate() - 89)
      return { start: s, end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59), groupBy: 'week' }
    }
    case 'this_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
        groupBy: 'day',
      }
    case 'previous_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
        groupBy: 'day',
      }
    case 'this_year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
        groupBy: 'month',
      }
    case 'all_time':
      // start is a sentinel; real start is derived from data
      return { start: new Date(2000, 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59), groupBy: 'month' }
    case 'custom': {
      if (!startDate || !endDate) {
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
          groupBy: 'day',
        }
      }
      const s = new Date(startDate + 'T00:00:00')
      const e = new Date(endDate + 'T23:59:59')
      const diffDays = Math.ceil((e.getTime() - s.getTime()) / 86400000)
      const groupBy: GroupBy = diffDays <= 31 ? 'day' : diffDays <= 90 ? 'week' : 'month'
      return { start: s, end: e, groupBy }
    }
  }
}

function getPreviousDates(range: Range, current: { start: Date; end: Date }): { start: Date; end: Date } | null {
  if (range === 'all_time') return null
  const y = current.start.getFullYear()
  const m = current.start.getMonth()
  switch (range) {
    case 'this_month':
    case 'previous_month':
      return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) }
    case 'this_year':
      return { start: new Date(y - 1, 0, 1), end: new Date(y - 1, 11, 31, 23, 59, 59) }
    default: {
      const dur = current.end.getTime() - current.start.getTime()
      return { start: new Date(current.start.getTime() - dur), end: new Date(current.start.getTime() - 1) }
    }
  }
}

function buildSeries(
  ingresos: { fechaIngreso: Date; montoPagado: number }[],
  start: Date,
  end: Date,
  groupBy: GroupBy,
): { label: string; value: number }[] {
  if (groupBy === 'day') {
    const map: Record<string, number> = {}
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    while (cur <= endDay) {
      const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
      map[k] = 0
      cur.setDate(cur.getDate() + 1)
    }
    ingresos.forEach(i => {
      const k = `${i.fechaIngreso.getFullYear()}-${String(i.fechaIngreso.getMonth() + 1).padStart(2, '0')}-${String(i.fechaIngreso.getDate()).padStart(2, '0')}`
      if (k in map) map[k] += i.montoPagado || 0
    })
    return Object.entries(map).map(([k, v]) => {
      const [, mm, dd] = k.split('-').map(Number)
      return { label: `${dd} ${MONTHS[mm - 1]}`, value: Math.round(v * 100) / 100 }
    })
  }

  if (groupBy === 'week') {
    const result: { label: string; value: number }[] = []
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    let week = 1
    while (cur <= end) {
      const wStart = new Date(cur)
      const wEnd = new Date(cur); wEnd.setDate(wEnd.getDate() + 6)
      if (wEnd > end) wEnd.setTime(end.getTime())
      const total = ingresos
        .filter(i => i.fechaIngreso >= wStart && i.fechaIngreso <= wEnd)
        .reduce((s, i) => s + (i.montoPagado || 0), 0)
      result.push({ label: `${wStart.getDate()} ${MONTHS[wStart.getMonth()]}`, value: Math.round(total * 100) / 100 })
      cur.setDate(cur.getDate() + 7)
      week++
    }
    return result
  }

  // month
  const map: Record<string, number> = {}
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cur <= endMonth) {
    const k = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
    map[k] = 0
    cur.setMonth(cur.getMonth() + 1)
  }
  ingresos.forEach(i => {
    const k = `${i.fechaIngreso.getFullYear()}-${String(i.fechaIngreso.getMonth() + 1).padStart(2, '0')}`
    if (k in map) map[k] += i.montoPagado || 0
  })
  return Object.entries(map).map(([k, v]) => {
    const [y, m] = k.split('-').map(Number)
    return { label: `${MONTHS[m - 1]} ${String(y).slice(-2)}`, value: Math.round(v * 100) / 100 }
  })
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canViewFinancials(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const range = (searchParams.get('range') ?? 'this_month') as Range
  const startDate = searchParams.get('startDate') ?? undefined
  const endDate = searchParams.get('endDate') ?? undefined

  const { start, end, groupBy } = getRangeDates(range, startDate, endDate)
  const prev = getPreviousDates(range, { start, end })

  const currentWhere = range === 'all_time'
    ? { estadoPago: { not: 'PENDIENTE' as const } }
    : { fechaIngreso: { gte: start, lte: end }, estadoPago: { not: 'PENDIENTE' as const } }

  const [currentIngresos, prevIngresos] = await Promise.all([
    prisma.ingreso.findMany({ where: currentWhere, select: { fechaIngreso: true, montoPagado: true } }),
    prev
      ? prisma.ingreso.findMany({
          where: { fechaIngreso: { gte: prev.start, lte: prev.end }, estadoPago: { not: 'PENDIENTE' } },
          select: { montoPagado: true },
        })
      : Promise.resolve([]),
  ])

  const total = currentIngresos.reduce((s, i) => s + (i.montoPagado || 0), 0)
  const previousTotal = prevIngresos.reduce((s, i) => s + (i.montoPagado || 0), 0)
  const percentChange = previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 100) : null

  // For all_time: derive series start from earliest data point
  let seriesStart = start
  if (range === 'all_time' && currentIngresos.length > 0) {
    const minTime = Math.min(...currentIngresos.map(i => new Date(i.fechaIngreso).getTime()))
    const minDate = new Date(minTime)
    seriesStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1)
  }

  const series = buildSeries(currentIngresos, seriesStart, end, groupBy)

  const displayStart = range === 'all_time'
    ? (series.length > 0 ? series[0].label : 'Sin datos')
    : fmtDate(start)
  const displayEnd = range === 'all_time' ? 'Hoy' : fmtDate(end)

  return NextResponse.json({
    total: Math.round(total * 100) / 100,
    previousTotal: Math.round(previousTotal * 100) / 100,
    percentChange,
    series,
    label: RANGE_LABELS[range] ?? 'Personalizado',
    rangeStart: displayStart,
    rangeEnd: displayEnd,
    groupBy,
  })
}
