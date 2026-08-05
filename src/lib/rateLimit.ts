// Rate limiter simple en memoria (por proceso). Adecuado para un despliegue
// single-instance (VPS). Para escalado horizontal habría que migrar a Redis.

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/**
 * Registra un intento para `key` y devuelve si está permitido.
 * @param key     Identificador del cliente (p. ej. `login:<ip>:<email>`)
 * @param limit   Máximo de intentos permitidos dentro de la ventana
 * @param windowMs Duración de la ventana en milisegundos
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now()

  // Purga oportunista de entradas expiradas para no crecer sin control
  if (buckets.size > 5000) {
    buckets.forEach((b, k) => {
      if (now > b.resetAt) buckets.delete(k)
    })
  }

  const bucket = buckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count++
  return { ok: true, retryAfter: 0 }
}

/** Reinicia el contador de una clave (p. ej. tras un login exitoso). */
export function resetRateLimit(key: string): void {
  buckets.delete(key)
}

/** Extrae una IP identificable del request (best-effort detrás de proxy). */
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}
