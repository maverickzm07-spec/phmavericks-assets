'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { contentStatusBadge } from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import PremiumCard from '@/components/ui/PremiumCard'
import { getMonthName, formatNumber, formatCurrency } from '@/lib/utils'

export default function ReportePlanPage() {
  const params = useParams()
  const planId = params.planId as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reportes/${planId}`).then((r) => r.json()).then(setData).catch(console.error).finally(() => setLoading(false))
  }, [planId])

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-64 skeleton-shimmer rounded-lg" />
      <div className="h-36 skeleton-shimmer rounded-2xl" />
      <div className="h-40 skeleton-shimmer rounded-2xl" />
    </div>
  )
  if (!data || !data.plan) return <PremiumCard padding="lg" className="text-center"><p className="text-phm-gray">Reporte no encontrado.</p></PremiumCard>

  const { plan, compliance, reels, carousels, flyers, totalViews, totalLikes, totalComments, totalShares, totalSaves, bestReel, bestContent, recommendation } = data
  const totalEngagement = totalLikes + totalComments + totalShares + totalSaves
  const handlePrint = () => window.print()

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 no-print">
        <Link href="/reportes" className="text-phm-gray-soft hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Reporte Mensual</h1>
          <p className="text-phm-gray-soft text-sm">{plan.client?.name} — {getMonthName(plan.month)} {plan.year}</p>
        </div>
        <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors">
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
      </div>

      <div className="space-y-5" id="report-content">
        {/* Header del reporte */}
        <PremiumCard padding="md">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-phm-red text-white text-xs font-bold shadow-glow-red">PH</div>
                <span className="text-xs text-phm-gray-soft font-medium">PHMavericks — Reporte Mensual</span>
              </div>
              <h2 className="text-2xl font-bold text-white">{plan.client?.name}</h2>
              <p className="text-phm-gray">{plan.client?.business}</p>
              <p className="text-phm-gray-soft text-sm mt-1">{getMonthName(plan.month)} {plan.year}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-phm-gray-soft">Precio del plan</p>
              <p className="text-xl font-bold text-white">{formatCurrency(plan.monthlyPrice)}</p>
              <p className="text-xs text-phm-gray-soft mt-1">Estado: <span className={plan.paymentStatus === 'PAID' ? 'text-emerald-400' : plan.paymentStatus === 'PARTIAL' ? 'text-amber-400' : 'text-red-400'}>
                {plan.paymentStatus === 'PAID' ? 'Pagado' : plan.paymentStatus === 'PARTIAL' ? 'Parcial' : 'Pendiente'}
              </span></p>
            </div>
          </div>
        </PremiumCard>

        {/* Resumen de cumplimiento */}
        <PremiumCard padding="md">
          <h3 className="font-semibold text-white mb-4">Resumen de Cumplimiento</h3>
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Reels', delivered: compliance.reelsDelivered, total: plan.reelsCount, color: 'text-purple-400' },
              { label: 'Carruseles', delivered: compliance.carouselsDelivered, total: plan.carouselsCount, color: 'text-blue-400' },
              { label: 'Flyers', delivered: compliance.flyersDelivered, total: plan.flyersCount, color: 'text-orange-400' },
              { label: 'Total', delivered: compliance.totalDelivered, total: compliance.totalContracted, color: 'text-white' },
            ].map((item) => (
              <div key={item.label} className="bg-phm-surface border border-phm-border-soft rounded-lg p-4 text-center">
                <p className={`text-2xl font-bold ${item.color}`}>{item.delivered}/{item.total}</p>
                <p className="text-xs text-phm-gray-soft mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          <ProgressBar value={compliance.compliancePercentage} size="lg" />
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-phm-gray">{compliance.totalDelivered} de {compliance.totalContracted} contenidos entregados</p>
            <p className={`text-lg font-bold ${compliance.compliancePercentage >= 100 ? 'text-emerald-400' : compliance.compliancePercentage >= 70 ? 'text-phm-gold' : 'text-amber-400'}`}>
              {compliance.compliancePercentage}% cumplimiento
            </p>
          </div>
          {compliance.compliancePercentage >= 100 && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2 bg-emerald-950/40 border border-emerald-900/60 rounded-lg">
              <span className="text-emerald-400 text-sm font-semibold">✓ Plan 100% completado</span>
            </div>
          )}
        </PremiumCard>

        {/* Métricas */}
        <PremiumCard padding="md">
          <h3 className="font-semibold text-white mb-4">Métricas Totales del Mes</h3>
          <div className="grid grid-cols-5 gap-3 mb-4">
            {[
              { label: 'Views', value: totalViews, icon: '👁', color: 'text-white' },
              { label: 'Likes', value: totalLikes, icon: '❤️', color: 'text-red-400' },
              { label: 'Comentarios', value: totalComments, icon: '💬', color: 'text-blue-400' },
              { label: 'Compartidos', value: totalShares, icon: '↗️', color: 'text-emerald-400' },
              { label: 'Guardados', value: totalSaves, icon: '🔖', color: 'text-phm-gold' },
            ].map((m) => (
              <div key={m.label} className="bg-phm-surface border border-phm-border-soft rounded-lg p-4 text-center">
                <p className="text-sm mb-1">{m.icon}</p>
                <p className={`text-xl font-bold ${m.color}`}>{formatNumber(m.value)}</p>
                <p className="text-xs text-phm-gray-soft mt-1">{m.label}</p>
              </div>
            ))}
          </div>
          {totalEngagement > 0 && (
            <div className="bg-phm-surface border border-phm-border-soft rounded-lg px-4 py-3">
              <span className="text-sm text-phm-gray">Engagement total: </span>
              <span className="text-sm font-bold text-white">{formatNumber(totalEngagement)}</span>
            </div>
          )}
        </PremiumCard>

        {/* Mejor contenido */}
        {(bestReel || bestContent) && (
          <div className="grid md:grid-cols-2 gap-4">
            {bestReel && (
              <PremiumCard padding="md">
                <p className="text-xs text-purple-400 font-semibold mb-2 uppercase tracking-wide">🏆 Mejor Reel del Mes</p>
                <p className="font-semibold text-white mb-1">{bestReel.title}</p>
                <p className="text-2xl font-bold text-phm-gold">{formatNumber(bestReel.views)}</p>
                <p className="text-xs text-phm-gray-soft">visualizaciones</p>
                {bestReel.publishedLink && <a href={bestReel.publishedLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 mt-2 block transition-colors">Ver publicación →</a>}
              </PremiumCard>
            )}
            {bestContent && (
              <PremiumCard padding="md">
                <p className="text-xs text-phm-gold font-semibold mb-2 uppercase tracking-wide">⭐ Mejor Engagement</p>
                <p className="font-semibold text-white mb-1">{bestContent.title}</p>
                <p className="text-2xl font-bold text-phm-gold">{formatNumber(bestContent.likes + bestContent.comments + bestContent.shares + bestContent.saves)}</p>
                <p className="text-xs text-phm-gray-soft">engagement total</p>
              </PremiumCard>
            )}
          </div>
        )}

        {/* Recomendación */}
        <PremiumCard padding="md" glow="red">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-phm-red shadow-glow-red flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Recomendación PHMavericks</p>
              <p className="text-sm text-phm-gray leading-relaxed">{recommendation}</p>
            </div>
          </div>
        </PremiumCard>

        {/* Detalle de contenidos */}
        {reels.length > 0 && (
          <PremiumCard padding="none">
            <div className="px-5 py-4 border-b border-phm-border-soft flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <h3 className="font-semibold text-white">Reels ({reels.length}/{plan.reelsCount})</h3>
            </div>
            <ContentTable contents={reels} />
          </PremiumCard>
        )}

        {carousels.length > 0 && (
          <PremiumCard padding="none">
            <div className="px-5 py-4 border-b border-phm-border-soft flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <h3 className="font-semibold text-white">Carruseles ({carousels.length}/{plan.carouselsCount})</h3>
            </div>
            <ContentTable contents={carousels} />
          </PremiumCard>
        )}

        {flyers.length > 0 && (
          <PremiumCard padding="none">
            <div className="px-5 py-4 border-b border-phm-border-soft flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
              <h3 className="font-semibold text-white">Flyers ({flyers.length}/{plan.flyersCount})</h3>
            </div>
            <ContentTable contents={flyers} showMetrics={false} />
          </PremiumCard>
        )}

        <div className="text-center text-xs text-phm-gray-soft py-4">
          Generado por PHM Sistema — PHMavericks Agency © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}

function ContentTable({ contents, showMetrics = true }: { contents: any[]; showMetrics?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-phm-border-soft bg-white/[0.015]">
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Título</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Estado</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Link</th>
            {showMetrics && <>
              <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Views</th>
              <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Likes</th>
              <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Coments.</th>
              <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Compart.</th>
              <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Guard.</th>
              <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-phm-gray-soft px-5 py-3">Engagement</th>
            </>}
          </tr>
        </thead>
        <tbody className="divide-y divide-phm-border-soft">
          {contents.map((c) => (
            <tr key={c.id} className="row-hover">
              <td className="px-5 py-3"><p className="text-sm text-white max-w-xs">{c.title}</p></td>
              <td className="px-5 py-3">{contentStatusBadge(c.status)}</td>
              <td className="px-5 py-3">
                {c.publishedLink ? <a href={c.publishedLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">publicado</a>
                  : c.driveLink ? <a href={c.driveLink} target="_blank" rel="noopener noreferrer" className="text-xs text-phm-gray hover:text-white transition-colors">drive</a>
                  : <span className="text-xs text-phm-gray-soft">sin link</span>}
              </td>
              {showMetrics && <>
                <td className="px-5 py-3 text-right text-sm text-phm-gray tabular-nums">{c.views > 0 ? formatNumber(c.views) : '—'}</td>
                <td className="px-5 py-3 text-right text-sm text-phm-gray tabular-nums">{c.likes > 0 ? formatNumber(c.likes) : '—'}</td>
                <td className="px-5 py-3 text-right text-sm text-phm-gray tabular-nums">{c.comments > 0 ? formatNumber(c.comments) : '—'}</td>
                <td className="px-5 py-3 text-right text-sm text-phm-gray tabular-nums">{c.shares > 0 ? formatNumber(c.shares) : '—'}</td>
                <td className="px-5 py-3 text-right text-sm text-phm-gray tabular-nums">{c.saves > 0 ? formatNumber(c.saves) : '—'}</td>
                <td className="px-5 py-3 text-right text-sm font-semibold text-white tabular-nums">
                  {(c.likes + c.comments + c.shares + c.saves) > 0 ? formatNumber(c.likes + c.comments + c.shares + c.saves) : '—'}
                </td>
              </>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
