'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { contentStatusBadge } from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/ProgressBar'
import { getMonthName, formatNumber, formatCurrency } from '@/lib/utils'

export default function ReportePlanPage() {
  const params = useParams()
  const planId = params.planId as string
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/reportes/${planId}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [planId])

  if (loading) return <div className="text-zinc-500 text-sm py-10 text-center">Cargando reporte...</div>
  if (!data || !data.plan) return <div className="text-red-400 text-sm py-10 text-center">Reporte no encontrado</div>

  const { plan, compliance, reels, carousels, flyers, totalViews, totalLikes, totalComments, totalShares, totalSaves, bestReel, bestContent, recommendation } = data

  const totalEngagement = totalLikes + totalComments + totalShares + totalSaves

  const handlePrint = () => window.print()

  return (
    <div>
      {/* Controls - no print */}
      <div className="flex items-center gap-3 mb-6 no-print">
        <Link href="/reportes" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-zinc-50">Reporte Mensual</h1>
          <p className="text-zinc-500 text-sm">{plan.client?.name} — {getMonthName(plan.month)} {plan.year}</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg"
          style={{ backgroundColor: '#8B0000' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / PDF
        </button>
      </div>

      {/* Report Content */}
      <div className="space-y-5" id="report-content">

        {/* Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#8B0000' }}>PH</div>
                <span className="text-xs text-zinc-500 font-medium">PHMavericks — Reporte Mensual</span>
              </div>
              <h2 className="text-2xl font-bold text-zinc-50">{plan.client?.name}</h2>
              <p className="text-zinc-400">{plan.client?.business}</p>
              <p className="text-zinc-500 text-sm mt-1">{getMonthName(plan.month)} {plan.year}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-zinc-500">Precio del plan</p>
              <p className="text-xl font-bold text-zinc-100">{formatCurrency(plan.monthlyPrice)}</p>
              <p className="text-xs text-zinc-500 mt-1">
                Estado de pago:{' '}
                <span className={plan.paymentStatus === 'PAID' ? 'text-green-400' : plan.paymentStatus === 'PARTIAL' ? 'text-orange-400' : 'text-red-400'}>
                  {plan.paymentStatus === 'PAID' ? 'Pagado' : plan.paymentStatus === 'PARTIAL' ? 'Parcial' : 'Pendiente'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Compliance Summary */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="font-semibold text-zinc-100 mb-4">Resumen de Cumplimiento</h3>
          <div className="grid grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Reels', delivered: compliance.reelsDelivered, total: plan.reelsCount, color: 'text-purple-400' },
              { label: 'Carruseles', delivered: compliance.carouselsDelivered, total: plan.carouselsCount, color: 'text-blue-400' },
              { label: 'Flyers', delivered: compliance.flyersDelivered, total: plan.flyersCount, color: 'text-orange-400' },
              { label: 'Total', delivered: compliance.totalDelivered, total: compliance.totalContracted, color: 'text-zinc-100' },
            ].map((item) => (
              <div key={item.label} className="bg-zinc-800/50 rounded-lg p-4 text-center">
                <p className={`text-2xl font-bold ${item.color}`}>{item.delivered}/{item.total}</p>
                <p className="text-xs text-zinc-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          <ProgressBar value={compliance.compliancePercentage} size="lg" />
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-zinc-400">
              {compliance.totalDelivered} de {compliance.totalContracted} contenidos entregados
            </p>
            <p className={`text-lg font-bold ${compliance.compliancePercentage >= 100 ? 'text-green-400' : compliance.compliancePercentage >= 70 ? 'text-blue-400' : 'text-yellow-400'}`}>
              {compliance.compliancePercentage}% cumplimiento
            </p>
          </div>
          {compliance.compliancePercentage >= 100 && (
            <div className="mt-3 flex items-center gap-2 px-4 py-2 bg-green-950 border border-green-800 rounded-lg">
              <span className="text-green-400 text-sm font-semibold">✓ Plan 100% completado</span>
            </div>
          )}
        </div>

        {/* Global Metrics */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="font-semibold text-zinc-100 mb-4">Métricas Totales del Mes</h3>
          <div className="grid grid-cols-5 gap-3 mb-4">
            {[
              { label: 'Views Totales', value: totalViews, icon: '👁', color: 'text-zinc-200' },
              { label: 'Likes', value: totalLikes, icon: '❤️', color: 'text-red-400' },
              { label: 'Comentarios', value: totalComments, icon: '💬', color: 'text-blue-400' },
              { label: 'Compartidos', value: totalShares, icon: '↗️', color: 'text-green-400' },
              { label: 'Guardados', value: totalSaves, icon: '🔖', color: 'text-yellow-400' },
            ].map((m) => (
              <div key={m.label} className="bg-zinc-800/50 rounded-lg p-4 text-center">
                <p className="text-sm text-zinc-500 mb-1">{m.icon}</p>
                <p className={`text-xl font-bold ${m.color}`}>{formatNumber(m.value)}</p>
                <p className="text-xs text-zinc-500 mt-1">{m.label}</p>
              </div>
            ))}
          </div>
          {totalEngagement > 0 && (
            <div className="bg-zinc-800/30 rounded-lg px-4 py-3">
              <span className="text-sm text-zinc-400">Engagement total del mes: </span>
              <span className="text-sm font-bold text-zinc-100">{formatNumber(totalEngagement)}</span>
            </div>
          )}
        </div>

        {/* Best Content */}
        {(bestReel || bestContent) && (
          <div className="grid md:grid-cols-2 gap-4">
            {bestReel && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-xs text-purple-400 font-semibold mb-2 uppercase tracking-wide">🏆 Mejor Reel del Mes</p>
                <p className="font-semibold text-zinc-100 mb-1">{bestReel.title}</p>
                <p className="text-2xl font-bold text-zinc-50">{formatNumber(bestReel.views)}</p>
                <p className="text-xs text-zinc-500">visualizaciones</p>
                {bestReel.publishedLink && (
                  <a href={bestReel.publishedLink} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline mt-2 block">Ver publicación →</a>
                )}
              </div>
            )}
            {bestContent && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-xs text-yellow-400 font-semibold mb-2 uppercase tracking-wide">⭐ Mejor Engagement</p>
                <p className="font-semibold text-zinc-100 mb-1">{bestContent.title}</p>
                <p className="text-2xl font-bold text-zinc-50">
                  {formatNumber(bestContent.likes + bestContent.comments + bestContent.shares + bestContent.saves)}
                </p>
                <p className="text-xs text-zinc-500">engagement (likes + comentarios + compartidos + guardados)</p>
              </div>
            )}
          </div>
        )}

        {/* Recommendation */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5" style={{ borderColor: '#8B0000', borderWidth: '1px' }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#8B0000' }}>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200 mb-1">Recomendación PHMavericks</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{recommendation}</p>
            </div>
          </div>
        </div>

        {/* Content Detail - Reels */}
        {reels.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <h3 className="font-semibold text-zinc-100">Reels ({reels.length}/{plan.reelsCount})</h3>
            </div>
            <ContentTable contents={reels} />
          </div>
        )}

        {/* Content Detail - Carousels */}
        {carousels.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <h3 className="font-semibold text-zinc-100">Carruseles ({carousels.length}/{plan.carouselsCount})</h3>
            </div>
            <ContentTable contents={carousels} />
          </div>
        )}

        {/* Content Detail - Flyers */}
        {flyers.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
              <h3 className="font-semibold text-zinc-100">Flyers ({flyers.length}/{plan.flyersCount})</h3>
            </div>
            <ContentTable contents={flyers} showMetrics={false} />
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-zinc-600 py-4">
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
          <tr className="border-b border-zinc-800">
            <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Título</th>
            <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Estado</th>
            <th className="text-left text-xs font-medium text-zinc-500 px-5 py-3">Link</th>
            {showMetrics && <>
              <th className="text-right text-xs font-medium text-zinc-500 px-5 py-3">Views</th>
              <th className="text-right text-xs font-medium text-zinc-500 px-5 py-3">Likes</th>
              <th className="text-right text-xs font-medium text-zinc-500 px-5 py-3">Coments.</th>
              <th className="text-right text-xs font-medium text-zinc-500 px-5 py-3">Compartidos</th>
              <th className="text-right text-xs font-medium text-zinc-500 px-5 py-3">Guardados</th>
              <th className="text-right text-xs font-medium text-zinc-500 px-5 py-3">Engagement</th>
            </>}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {contents.map((c) => (
            <tr key={c.id} className="hover:bg-zinc-800/20">
              <td className="px-5 py-3">
                <p className="text-sm text-zinc-200 max-w-xs">{c.title}</p>
              </td>
              <td className="px-5 py-3">{contentStatusBadge(c.status)}</td>
              <td className="px-5 py-3">
                {c.publishedLink ? (
                  <a href={c.publishedLink} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline">publicado</a>
                ) : c.driveLink ? (
                  <a href={c.driveLink} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-zinc-400 hover:underline">drive</a>
                ) : (
                  <span className="text-xs text-zinc-600">sin link</span>
                )}
              </td>
              {showMetrics && <>
                <td className="px-5 py-3 text-right text-sm text-zinc-400">{c.views > 0 ? formatNumber(c.views) : '—'}</td>
                <td className="px-5 py-3 text-right text-sm text-zinc-400">{c.likes > 0 ? formatNumber(c.likes) : '—'}</td>
                <td className="px-5 py-3 text-right text-sm text-zinc-400">{c.comments > 0 ? formatNumber(c.comments) : '—'}</td>
                <td className="px-5 py-3 text-right text-sm text-zinc-400">{c.shares > 0 ? formatNumber(c.shares) : '—'}</td>
                <td className="px-5 py-3 text-right text-sm text-zinc-400">{c.saves > 0 ? formatNumber(c.saves) : '—'}</td>
                <td className="px-5 py-3 text-right text-sm font-medium text-zinc-300">
                  {(c.likes + c.comments + c.shares + c.saves) > 0
                    ? formatNumber(c.likes + c.comments + c.shares + c.saves)
                    : '—'}
                </td>
              </>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

