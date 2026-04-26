'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function NuevoContenidoForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [clients, setClients] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    clientId: searchParams.get('clientId') || '',
    planId: searchParams.get('planId') || '',
    type: 'EXTRA' as string,
    title: '',
    status: 'PENDIENTE',
    requierePublicacion: false,
    driveLink: '',
    publishedLink: '',
    observations: '',
  })

  useEffect(() => {
    fetch('/api/clientes').then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => {
    if (!form.clientId) { setPlans([]); return }
    fetch(`/api/planes?clientId=${form.clientId}`)
      .then(r => r.json())
      .then(d => setPlans(Array.isArray(d) ? d : []))
      .catch(() => setPlans([]))
  }, [form.clientId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contenidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, planId: form.planId || null }),
      })
      if (res.ok) {
        router.push('/contenidos')
      } else {
        const data = await res.json()
        setError(data.error || 'Error al crear el contenido')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const TIPOS = [
    { value: 'REEL', label: 'Reel' },
    { value: 'VIDEO_HORIZONTAL', label: 'Video horizontal' },
    { value: 'FOTO', label: 'Foto' },
    { value: 'IMAGEN_FLYER', label: 'Imagen / Flyer' },
    { value: 'EXTRA', label: 'Extra / Manual' },
  ]

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/contenidos" className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Nuevo entregable extra</h1>
          <p className="text-zinc-500 text-sm">Crea un entregable manual o extra</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Cliente *</label>
            <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))} required
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
              <option value="">Selecciona un cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} — {c.business}</option>)}
            </select>
          </div>

          {form.clientId && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Plan mensual (opcional)</label>
              {plans.length === 0 ? (
                <div className="px-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-500">
                  Sin planes para este cliente —{' '}
                  <Link href={`/planes/nuevo?clientId=${form.clientId}`} className="text-red-400 hover:text-red-300 underline">
                    Crear plan primero
                  </Link>
                </div>
              ) : (
                <select value={form.planId} onChange={e => setForm(p => ({ ...p, planId: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                  <option value="">Sin plan asociado</option>
                  {plans.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][p.month - 1]} {p.year}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Tipo *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Estado</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500">
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROCESO">En proceso</option>
                <option value="ENTREGADO">Entregado</option>
                <option value="PUBLICADO">Publicado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Título *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
              placeholder="Ej: Reel de lanzamiento"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Link de Drive</label>
            <input type="url" value={form.driveLink} onChange={e => setForm(p => ({ ...p, driveLink: e.target.value }))}
              placeholder="https://drive.google.com/..."
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
          </div>

          <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
            <input type="checkbox" id="reqPub" checked={form.requierePublicacion}
              onChange={e => setForm(p => ({ ...p, requierePublicacion: e.target.checked }))}
              className="w-4 h-4 accent-red-700" />
            <label htmlFor="reqPub" className="text-sm text-zinc-300 cursor-pointer">Requiere publicación en redes</label>
          </div>

          {form.requierePublicacion && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Link publicado</label>
              <input type="url" value={form.publishedLink} onChange={e => setForm(p => ({ ...p, publishedLink: e.target.value }))}
                placeholder="https://..."
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Observaciones</label>
            <textarea value={form.observations} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))} rows={2}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 resize-none" />
          </div>

          {error && <div className="px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-400">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#8B0000' }}>
              {loading ? 'Guardando...' : 'Crear entregable'}
            </button>
            <Link href="/contenidos"
              className="px-6 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-center">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NuevoContenidoPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500 text-sm py-10 text-center">Cargando...</div>}>
      <NuevoContenidoForm />
    </Suspense>
  )
}
