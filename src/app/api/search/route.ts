import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q || q.length < 2) return NextResponse.json([])

  const [clients, projects, plans, contents, events] = await Promise.all([
    prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { business: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 3,
      select: { id: true, name: true, business: true },
    }),
    prisma.clientProject.findMany({
      where: { nombre: { contains: q, mode: 'insensitive' } },
      take: 3,
      include: { client: { select: { name: true } } },
    }),
    prisma.monthlyPlan.findMany({
      where: { client: { name: { contains: q, mode: 'insensitive' } } },
      take: 2,
      include: { client: { select: { name: true } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    }),
    prisma.content.findMany({
      where: { title: { contains: q, mode: 'insensitive' } },
      take: 2,
      select: { id: true, title: true },
    }),
    prisma.calendarEvent.findMany({
      where: { title: { contains: q, mode: 'insensitive' } },
      take: 2,
      select: { id: true, title: true },
    }),
  ])

  const results = [
    ...clients.map((c) => ({
      id: c.id,
      type: 'cliente' as const,
      title: c.name,
      subtitle: c.business || '',
      href: `/clientes/${c.id}`,
    })),
    ...projects.map((p) => ({
      id: p.id,
      type: 'proyecto' as const,
      title: p.nombre,
      subtitle: p.client?.name || '',
      href: `/proyectos/${p.id}`,
    })),
    ...plans.map((p) => ({
      id: p.id,
      type: 'plan' as const,
      title: `Plan ${MONTHS[(p.month ?? 1) - 1]} ${p.year}`,
      subtitle: p.client?.name || '',
      href: `/planes/${p.id}`,
    })),
    ...contents.map((c) => ({
      id: c.id,
      type: 'contenido' as const,
      title: c.title,
      subtitle: '',
      href: `/contenidos/${c.id}`,
    })),
    ...events.map((e) => ({
      id: e.id,
      type: 'evento' as const,
      title: e.title,
      subtitle: '',
      href: `/calendario`,
    })),
  ].slice(0, 10)

  return NextResponse.json(results)
}
