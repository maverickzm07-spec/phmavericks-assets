import { randomBytes } from 'crypto'
import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import path from 'path'

/**
 * Almacén de documentos adjuntos (cotizaciones, facturas, comprobantes).
 *
 * Los archivos se guardan en disco, NUNCA dentro del directorio del proyecto:
 * `.next` se borra en cada build y un despliegue no debe llevarse los documentos
 * por delante. En producción se define UPLOAD_DIR fuera de /var/www/phm.
 */

const DEFAULT_DIR = path.join(process.cwd(), 'uploads')

export function uploadDir(): string {
  return process.env.UPLOAD_DIR?.trim() || DEFAULT_DIR
}

/**
 * Tipos admitidos: la cotización (PDF, Word, Excel o una foto/captura), la
 * factura del SRI (PDF + XML) y los comprobantes.
 */
export const TIPOS_PERMITIDOS: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
}

/**
 * Respaldo por extensión: algunos navegadores (sobre todo en Windows) envían
 * XML, Word o Excel con tipo vacío o `application/octet-stream`.
 */
const TIPO_POR_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  xml: 'application/xml',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function resolverTipo(file: File): string | null {
  if (TIPOS_PERMITIDOS[file.type]) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return TIPO_POR_EXTENSION[ext] ?? null
}

export const TAMANO_MAXIMO_BYTES = 25 * 1024 * 1024 // 25 MB

export interface ArchivoGuardado {
  archivo: string
  mimeType: string
  tamanoBytes: number
}

export class ErrorArchivo extends Error {}

/**
 * Valida y guarda un archivo subido. Devuelve el nombre interno con el que
 * quedó almacenado; ese nombre lo genera el servidor, nunca el cliente, para
 * que un nombre malicioso no pueda escapar del directorio.
 */
export async function guardarArchivo(file: File): Promise<ArchivoGuardado> {
  const mimeType = resolverTipo(file)
  if (!mimeType) {
    throw new ErrorArchivo('Formato no admitido. Se aceptan PDF, XML, imágenes (JPG, PNG, WEBP), Word y Excel.')
  }
  const extension = TIPOS_PERMITIDOS[mimeType]
  if (file.size <= 0) {
    throw new ErrorArchivo('El archivo está vacío.')
  }
  if (file.size > TAMANO_MAXIMO_BYTES) {
    const mb = (TAMANO_MAXIMO_BYTES / 1024 / 1024).toFixed(0)
    throw new ErrorArchivo(`El archivo supera el máximo de ${mb} MB.`)
  }

  const destino = uploadDir()
  await mkdir(destino, { recursive: true })

  const nombreInterno = `${Date.now()}-${randomBytes(12).toString('hex')}.${extension}`
  const bytes = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(destino, nombreInterno), bytes)

  return { archivo: nombreInterno, mimeType, tamanoBytes: bytes.length }
}

/** Nombres internos válidos: los que genera guardarArchivo y nada más. */
const NOMBRE_VALIDO = /^[0-9]+-[0-9a-f]{24}\.(pdf|xml|jpg|png|webp|doc|docx|xls|xlsx)$/

/** Lee un archivo del almacén. Rechaza cualquier nombre que no haya generado el servidor. */
export async function leerArchivo(nombreInterno: string): Promise<Buffer> {
  if (!NOMBRE_VALIDO.test(nombreInterno)) {
    throw new ErrorArchivo('Referencia de archivo inválida.')
  }
  return readFile(path.join(uploadDir(), nombreInterno))
}

/** Borra un archivo del almacén. No falla si ya no existe. */
export async function borrarArchivo(nombreInterno: string): Promise<void> {
  if (!NOMBRE_VALIDO.test(nombreInterno)) return
  try {
    await unlink(path.join(uploadDir(), nombreInterno))
  } catch {
    // El registro ya se eliminó de la base; que falte el binario no debe romper nada.
  }
}
