'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ROLE_LABELS } from '@/lib/permissions'

type Step = 'form' | 'verify'

const ROLES_OPTIONS = [
  { value: 'ADMIN', desc: 'Gestión completa de clientes, planes y servicios' },
  { value: 'VENTAS', desc: 'Crear clientes, asignar planes y ver estados comerciales' },
  { value: 'PRODUCCION', desc: 'Ver y actualizar estado de contenidos' },
  { value: 'SOLO_LECTURA', desc: 'Solo visualización, sin edición' },
]

export default function NuevoUsuarioPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [devMode, setDevMode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [verificationCode, setVerificationCode] = useState('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [form, setForm] = useState({
    name: '',
    cedula: '',
    email: '',
    password: '',
    role: 'VENTAS',
    activo: true,
  })

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const startTimer = () => {
    setSecondsLeft(15 * 60)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(timerRef.current!); return 0 }
        return s - 1
      })
    }, 1000)
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.cedula && !/^\d{10}$/.test(form.cedula)) {
      setError('La cédula debe tener exactamente 10 dígitos numéricos')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/usuarios/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, name: form.name }),
      })
      const data = await res.json()
      if (res.ok) {
        setDevMode(data.devMode ?? false)
        setStep('verify')
        startTimer()
      } else {
        setError(data.error || 'No se pudo enviar el código')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setLoading(true)
    setError('')
    setVerificationCode('')
    try {
      const res = await fetch('/api/usuarios/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, name: form.name }),
      })
      const data = await res.json()
      if (res.ok) { setDevMode(data.devMode ?? false); startTimer() }
      else setError(data.error || 'No se pudo reenviar el código')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          cedula: form.cedula || undefined,
          verificationCode,
        }),
      })
      if (res.ok) {
        router.push('/usuarios')
      } else {
        const data = await res.json()
        setError(data.error || 'Error al crear el usuario')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            if (step === 'verify') { setStep('form'); setError(''); setVerificationCode(''); if (timerRef.current) clearInterval(timerRef.current) }
            else router.push('/usuarios')
          }}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Nuevo Usuario</h1>
          <p className="text-zinc-500 text-sm">
            {step === 'form' ? 'Solo el Super Admin puede crear usuarios' : 'Ingresa el código enviado al correo'}
          </p>
        </div>
      </div>

      {/* Pasos */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`flex items-center gap-2 text-xs font-medium ${step === 'form' ? 'text-white' : 'text-zinc-500'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: step === 'form' ? '#8B0000' : '#27272a', color: '#fff' }}>
            {step === 'verify' ? '✓' : '1'}
          </span>
          Datos
        </div>
        <div className="flex-1 h-px bg-zinc-700" />
        <div className={`flex items-center gap-2 text-xs font-medium ${step === 'verify' ? 'text-white' : 'text-zinc-600'}`}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: step === 'verify' ? '#8B0000' : '#27272a', color: step === 'verify' ? '#fff' : '#71717a' }}>
            2
          </span>
          Verificación
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        {step === 'form' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nombre completo *</label>
                <input name="name" value={form.name} onChange={handleChange} required
                  placeholder="Ej: María González"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Cédula</label>
                <input name="cedula" value={form.cedula} onChange={handleChange}
                  placeholder="10 dígitos" maxLength={10}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Estado</label>
                <select name="activo" value={form.activo ? 'true' : 'false'}
                  onChange={(e) => setForm((p) => ({ ...p, activo: e.target.value === 'true' }))}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 text-sm focus:outline-none focus:border-zinc-500 transition-all">
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Correo electrónico *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required
                placeholder="usuario@phmavericks.com"
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Contraseña temporal * (mín. 6 caracteres)</label>
              <div className="relative">
                <input name="password" type={showPassword ? 'text' : 'password'} value={form.password}
                  onChange={handleChange} required minLength={6} placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-all pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {showPassword
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Rol *</label>
              <div className="space-y-2">
                {ROLES_OPTIONS.map((r) => (
                  <label key={r.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    form.role === r.value ? 'border-red-800 bg-red-950/30' : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }`}>
                    <input type="radio" name="role" value={r.value} checked={form.role === r.value}
                      onChange={handleChange} className="mt-0.5 accent-red-700" />
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{ROLE_LABELS[r.value]}</p>
                      <p className="text-xs text-zinc-500">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-950 border border-red-800 rounded-lg">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50"
                style={{ backgroundColor: '#8B0000' }}>
                {loading ? 'Enviando...' : 'Enviar código de verificación'}
              </button>
              <Link href="/usuarios"
                className="px-6 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all text-center">
                Cancelar
              </Link>
            </div>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleCreateUser} className="space-y-5">
            <div className="text-center pb-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 mb-3">
                <svg className="w-6 h-6 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-zinc-300 text-sm">
                Código enviado a <strong className="text-zinc-100">{form.email}</strong>
              </p>
            </div>

            {devMode && (
              <div className="flex items-start gap-2 px-4 py-3 bg-amber-950/50 border border-amber-800/50 rounded-lg">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xs text-amber-400 leading-relaxed">
                  <strong>Modo desarrollo:</strong> Sin SMTP configurado. Revisa la consola del servidor para ver el código.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Código de verificación *</label>
              <input
                type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required autoFocus placeholder="000000"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-2xl font-mono tracking-[0.5em] text-center placeholder-zinc-700 focus:outline-none focus:border-zinc-500 transition-all"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-zinc-600">
                  {secondsLeft > 0 ? `Expira en ${formatTime(secondsLeft)}` : <span className="text-red-500">El código expiró</span>}
                </p>
                <button type="button" onClick={handleResendCode}
                  disabled={loading || secondsLeft > 14 * 60}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  Reenviar código
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 bg-red-950 border border-red-800 rounded-lg">
                <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit"
                disabled={loading || verificationCode.length !== 6 || secondsLeft === 0}
                className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50"
                style={{ backgroundColor: '#8B0000' }}>
                {loading ? 'Creando...' : 'Crear Usuario'}
              </button>
              <button type="button"
                onClick={() => { setStep('form'); setError(''); setVerificationCode(''); if (timerRef.current) clearInterval(timerRef.current) }}
                className="px-6 py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
                Volver
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
