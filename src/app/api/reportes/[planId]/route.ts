import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { calculateCompliance } from '@/lib/utils'

export async function GET(request: NextRequest, { params }: { params: { planId: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const plan = await prisma.monthlyPlan.findUnique({
    where: { id: params.planId },
    include: {
      client: true,
      contents: { orderBy: [{ type: 'asc' }, { views: 'desc' }] },
    },
  })

  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })

  const compliance = calculateCompliance(plan, plan.contents)

  const deliveredContents = plan.contents.filter(
    (c) =>
      (c.status === 'PUBLISHED' || c.status === 'COMPLETED') &&
      (c.driveLink || c.publishedLink)
  )

  const reels = plan.contents.filter((c) => c.type === 'REEL')
  const carousels = plan.contents.filter((c) => c.type === 'CAROUSEL')
  const flyers = plan.contents.filter((c) => c.type === 'FLYER')

  const totalViews = deliveredContents.reduce((s, c) => s + c.views, 0)
  const totalLikes = deliveredContents.reduce((s, c) => s + c.likes, 0)
  const totalComments = deliveredContents.reduce((s, c) => s + c.comments, 0)
  const totalShares = deliveredContents.reduce((s, c) => s + c.shares, 0)
  const totalSaves = deliveredContents.reduce((s, c) => s + c.saves, 0)

  const publishedReels = reels.filter((c) => c.status === 'PUBLISHED' || c.status === 'COMPLETED')
  const bestReel = publishedReels.sort((a, b) => b.views - a.views)[0] || null

  const bestContent = deliveredContents
    .map((c) => ({ ...c, engagement: c.likes + c.comments + c.shares + c.saves }))
    .sort((a, b) => b.engagement - a.engagement)[0] || null

  const recommendation = bestContent
    ? `El contenido con mejor rendimiento fue "${bestContent.title}" con un engagement de ${bestContent.likes + bestContent.comments + bestContent.shares + bestContent.saves}. Se recomienda reforzar esta línea de contenido el próximo mes.`
    : 'No hay suficientes datos para generar una recomendación este mes.'

  return NextResponse.json({
    plan,
    compliance,
    reels,
    carousels,
    flyers,
    totalViews,
    totalLikes,
    totalComments,
    totalShares,
    totalSaves,
    bestReel,
    bestContent,
    recommendation,
  })
}
