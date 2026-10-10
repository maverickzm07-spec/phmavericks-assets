'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Sparkles, FileBarChart2, Download } from 'lucide-react'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
import PremiumCard from '@/components/ui/PremiumCard'
import { formatCurrency } from '@/lib/utils'

const DONE_STATUSES = ['PUBLISHED', 'COMPLETED', 'ENTREGADO', 'PUBLICADO']

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  EN_EDICION: 'En edición',
  APROBADO: 'Aprobado',
  ENTREGADO: 'Entregado',
  COMPLETADO: 'Completado',
  ATRASADO: 'Atrasado',
}

function avanceEntregables(project: any) {
  const total = project.contents?.length ?? 0
  const done = (project.contents ?? []).filter((item: any) => DONE_STATUSES.includes(item.status)).length
  const pct = total > 0 ? Math.round((done / total) * 100) : project.estado === 'COMPLETADO' ? 100 : 0
  return { total, done, pct }
}

export default function ReportesPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ clientId: '', estado: '' })
  const [showFinancials, setShowFinancials] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((u) => { if (['SUPER_ADMIN', 'ADMIN'].includes(u?.role)) setShowFinancials(true) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/clientes').then((r) => r.ok ? r.json() : []),
      fetch('/api/proyectos').then((r) => r.ok ? r.json() : []),
    ])
      .then(([clientData, projectData]) => {
        setClients(Array.isArray(clientData) ? clientData : [])
        setProjects(Array.isArray(projectData) ? projectData : [])
      })
      .catch(() => {
        setClients([])
        setProjects([])
      })
      .finally(() => setLoading(false))
  }, [])

  const visibles = useMemo(() => projects.filter((p) => {
    if (filters.clientId && p.clientId !== filters.clientId) return false
    if (filters.estado && p.estado !== filters.estado) return false
    return true
  }), [projects, filters])

  const handleFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const exportCSV = () => {
    const encabezado = showFinancials
      ? ['Cliente', 'Proyecto', 'Estado', 'Entregables', 'Avance %', 'Valor contratado', 'Cobrado', 'Saldo pendiente']
      : ['Cliente', 'Proyecto', 'Estado', 'Entregables', 'Avance %']

    const rows = [
      encabezado,
      ...visibles.map((project) => {
        const { total, done, pct } = avanceEntregables(project)
        const base: (string | number)[] = [
          project.client?.name ?? '',
          project.nombre ?? '',
          ESTADO_LABELS[project.estado] ?? project.estado,
          `${done}/${total}`,
          pct,
        ]
        if (showFinancials) {
          base.push(
            project.precioFinal ?? 0,
            project.totalPagado ?? 0,
            project.saldoPendiente ?? 0,
          )
        }
        return base
      }),
    ]
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cierres-proyecto-phm-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectCls = 'px-3 py-2 bg-phm-surface border border-phm-border-soft rounded-lg text-sm text-phm-gray focus:outline-none focus:border-phm-gold/40 transition-colors'

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-phm-gold text-sm font-medium tracking-wide">
          <Sparkles className="w-4 h-4" />
          <span className="text-gold-premium">Análisis</span>
        </div>
        <div className="flex items-start justify-between mt-1 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Reportes y Cierres</h1>
            <p className="text-phm-gray-soft text-sm mt-1">Documentos de finalización por proyecto</p>
          </div>
          {visibles.length > 0 && (
            <button onClick={exportCSV}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-phm-gray border border-phm-border-soft hover:border-phm-gold/40 hover:text-white rounded-lg transition-colors">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          )}
        </div>
      </header>

      <PremiumCard padding="sm">
        <div className="flex gap-3 flex-wrap">
          <select value={filters.clientId} onChange={(e) => handleFilter('clientId', e.target.value)} className={selectCls}>
            <option value="">Todos los clientes</option>
            {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.estado} onChange={(e) => handleFilter('estado', e.target.value)} className={selectCls}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </PremiumCard>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <PremiumCard padding="none">
          <EmptyState
            title="No hay proyectos"
            description="Registra un proyecto para generar su reporte de cierre."
            actionLabel="Nuevo proyecto"
            actionHref="/proyectos/nuevo"
          />
        </PremiumCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibles.map((project: any) => {
            const { total, done, pct } = avanceEntregables(project)
            return (
              <PremiumCard key={project.id} hover padding="md">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">{project.nombre}</p>
                    <p className="text-sm text-phm-gray-soft truncate">{project.client?.name}</p>
                  </div>
                  <span className="text-xs text-phm-gray whitespace-nowrap">{ESTADO_LABELS[project.estado] ?? project.estado}</span>
                </div>

                {showFinancials && project.precioFinal != null && (
                  <div className="flex items-center justify-between mb-3 text-sm">
                    <span className="text-phm-gray font-semibold">{formatCurrency(project.precioFinal)}</span>
                    {project.saldoPendiente != null && project.saldoPendiente > 0 && (
                      <span className="text-amber-400 text-xs">Saldo {formatCurrency(project.saldoPendiente)}</span>
                    )}
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  <ProgressBar value={pct} size="sm" />
                  <div className="flex justify-between text-xs">
                    <span className="text-phm-gray-soft">Entregables: {done}/{total}</span>
                    <span className="font-semibold text-white">{pct}%</span>
                  </div>
                </div>

                <Link href={`/reportes/proyecto/${project.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm font-semibold text-white bg-phm-red hover:bg-phm-red-hover rounded-lg transition-colors">
                  <FileBarChart2 className="w-4 h-4" /> Ver cierre / PDF
                </Link>
              </PremiumCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
