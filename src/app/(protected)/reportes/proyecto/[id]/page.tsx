'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import PremiumCard from '@/components/ui/PremiumCard'
import ProgressBar from '@/components/ui/ProgressBar'
import { formatCurrency, getContentTypeLabel, getStatusLabel } from '@/lib/utils'

export default function ReporteProyectoPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/proyectos/${id}/reporte`)
      .then((r) => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="text-phm-gray-soft text-sm py-12 text-center">Generando cierre del proyecto...</div>
  }

  if (!data?.project) {
    return <div className="text-red-400 text-sm py-12 text-center">No se pudo cargar el reporte del proyecto.</div>
  }

  const { project, resumen } = data
  const showFinancials = typeof resumen.precioFinal === 'number'
  const fechaCierre = project.fechaEntrega ? new Date(project.fechaEntrega) : new Date(project.updatedAt)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="no-print flex items-center gap-3">
        <Link href={`/proyectos/${id}`} className="p-2 text-phm-gray-soft hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Cierre de proyecto</h1>
          <p className="text-sm text-phm-gray-soft">Documento final de servicio y entregables</p>
        </div>
        <button onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors">
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
      </div>

      <div id="project-close-report" className="space-y-5">
        <PremiumCard padding="md">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-phm-gold font-semibold">PHMavericks · Cierre de servicio</p>
              <h2 className="text-3xl font-bold text-white mt-2">{project.nombre}</h2>
              <p className="text-phm-gray mt-1">{project.client?.name} · {project.client?.business}</p>
              <p className="text-xs text-phm-gray-soft mt-3">
                Cierre: {fechaCierre.toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-900/40">
                {getStatusLabel(project.estado, 'project')}
              </span>
              {project.service?.nombre && <p className="text-sm text-phm-gray mt-3">{project.service.nombre}</p>}
            </div>
          </div>
        </PremiumCard>

        <div className="grid md:grid-cols-3 gap-4">
          <PremiumCard padding="md">
            <p className="text-xs text-phm-gray-soft">Entregables completados</p>
            <p className="text-2xl font-bold text-white mt-1">{resumen.entregablesCompletados}/{resumen.totalEntregables}</p>
          </PremiumCard>
          <PremiumCard padding="md">
            <p className="text-xs text-phm-gray-soft">Cumplimiento de entrega</p>
            <p className="text-2xl font-bold text-phm-gold mt-1">{resumen.porcentajeEntrega}%</p>
          </PremiumCard>
          <PremiumCard padding="md">
            <p className="text-xs text-phm-gray-soft">Estado del cierre</p>
            <div className="mt-2 flex items-center gap-2">
              {resumen.listoParaCerrar
                ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                : <AlertCircle className="w-5 h-5 text-amber-400" />}
              <span className={resumen.listoParaCerrar ? 'text-emerald-300 font-semibold' : 'text-amber-300 font-semibold'}>
                {resumen.listoParaCerrar ? 'Listo' : 'Pendiente'}
              </span>
            </div>
          </PremiumCard>
        </div>

        <PremiumCard padding="md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white">Cumplimiento</h3>
            <span className="text-sm font-semibold text-phm-gold">{resumen.porcentajeEntrega}%</span>
          </div>
          <ProgressBar value={resumen.porcentajeEntrega} size="md" />
        </PremiumCard>

        <PremiumCard padding="none">
          <div className="px-5 py-4 border-b border-phm-border-soft">
            <h3 className="font-semibold text-white">Entregables</h3>
            <p className="text-xs text-phm-gray-soft mt-0.5">Detalle de lo producido y entregado</p>
          </div>
          {project.contents?.length ? (
            <div className="divide-y divide-phm-border-soft">
              {project.contents.map((c: any) => (
                <div key={c.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{c.title}</p>
                    <p className="text-xs text-phm-gray-soft mt-0.5">{getContentTypeLabel(c.type)}</p>
                  </div>
                  <span className="text-xs text-phm-gray">{getStatusLabel(c.status, 'content')}</span>
                  {(c.driveLink || c.publishedLink) && (
                    <a href={c.publishedLink || c.driveLink} target="_blank" rel="noopener noreferrer"
                      className="no-print inline-flex items-center gap-1 text-xs text-phm-gold hover:text-phm-gold-bright">
                      Abrir <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-phm-gray-soft">No hay entregables registrados.</div>
          )}
        </PremiumCard>

        {showFinancials && (
          <PremiumCard padding="md">
            <h3 className="font-semibold text-white mb-4">Resumen económico</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-phm-gray-soft">Valor acordado</p>
                <p className="text-lg font-bold text-white mt-1">{formatCurrency(resumen.precioFinal)}</p>
              </div>
              <div>
                <p className="text-xs text-phm-gray-soft">Pagado</p>
                <p className="text-lg font-bold text-emerald-400 mt-1">{formatCurrency(resumen.totalPagado)}</p>
              </div>
              <div>
                <p className="text-xs text-phm-gray-soft">Saldo pendiente</p>
                <p className={`text-lg font-bold mt-1 ${resumen.saldoPendiente > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatCurrency(resumen.saldoPendiente)}
                </p>
              </div>
            </div>
          </PremiumCard>
        )}

        {(project.linkEntrega || project.observaciones) && (
          <PremiumCard padding="md">
            <h3 className="font-semibold text-white mb-3">Cierre y entrega</h3>
            {project.linkEntrega && (
              <div className="mb-3">
                <p className="text-xs text-phm-gray-soft mb-1">Carpeta / enlace de entrega</p>
                <a href={project.linkEntrega} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-phm-gold break-all hover:underline">{project.linkEntrega}</a>
              </div>
            )}
            {project.observaciones && (
              <div>
                <p className="text-xs text-phm-gray-soft mb-1">Observaciones finales</p>
                <p className="text-sm text-phm-gray leading-relaxed whitespace-pre-wrap">{project.observaciones}</p>
              </div>
            )}
          </PremiumCard>
        )}

        <div className="text-center text-xs text-phm-gray-soft py-4">
          Generado por PHM Sistema · PHMavericks © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}
