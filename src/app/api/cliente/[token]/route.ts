import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const DONE_STATUSES = ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO']

export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const client = await prisma.client.findUnique({
    where: { clientPortalToken: params.token },
    select: {
      id: true,
      name: true,
      business: true,
      status: true,
      servicePlan: { select: { nombre: true, modalidad: true } },
      monthlyPlans: {
        where: { planStatus: { not: 'COMPLETED' } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 3,
        select: {
          id: true, month: true, year: true, planStatus: true,
          reelsCount: true, carouselsCount: true, flyersCount: true,
          contents: {
            select: { id: true, title: true, type: true, status: true, driveLink: true, publishedLink: true, publishedAt: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
      projects: {
        where: { estado: { notIn: ['COMPLETADO', 'ENTREGADO'] } },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: {
          id: true, nombre: true, estado: true, fechaEntrega: true, linkEntrega: true,
          contents: {
            select: { id: true, title: true, type: true, status: true, driveLink: true, publishedLink: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  })

  if (!client) return NextResponse.json({ error: 'Portal no encontrado' }, { status: 404 })

  // Calcular progreso por plan
  const plans = client.monthlyPlans.map((p) => {
    const total = p.contents.length
    const done = p.contents.filter((c) => DONE_STATUSES.includes(c.status)).length
    return { ...p, progress: total > 0 ? Math.round((done / total) * 100) : 0, totalContents: total, doneContents: done }
  })

  const projects = client.projects.map((p) => {
    const total = p.contents.length
    const done = p.contents.filter((c) => DONE_STATUSES.includes(c.status)).length
    return { ...p, progress: total > 0 ? Math.round((done / total) * 100) : 0, totalContents: total, doneContents: done }
  })

  return NextResponse.json({ client: { name: client.name, business: client.business, status: client.status }, plans, projects })
}
