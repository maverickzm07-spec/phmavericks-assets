import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canWriteContents, canViewFinancials } from '@/lib/permissions'
import { ErrorArchivo, guardarArchivo } from '@/lib/storage'

const TIPOS = ['COTIZACION', 'FACTURA_PDF', 'FACTURA_XML', 'COMPROBANTE', 'OTRO'] as const
type Tipo = (typeof TIPOS)[number]

/** Tipos que contienen montos facturados: solo los ve quien tiene acceso financiero. */
const TIPOS_FACTURA: Tipo[] = ['FACTURA_PDF', 'FACTURA_XML']

/** Lista los documentos de un proyecto o de un ingreso. */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const ingresoId = searchParams.get('ingresoId')
  const gastoId = searchParams.get('gastoId')
  // Filtro opcional: ?tipos=COTIZACION,OTRO
  const tiposFiltro = (searchParams.get('tipos') || '')
    .split(',')
    .filter((t): t is Tipo => (TIPOS as readonly string[]).includes(t))

  if (!projectId && !ingresoId && !gastoId) {
    return NextResponse.json({ error: 'Indica projectId, ingresoId o gastoId' }, { status: 400 })
  }

  // Los adjuntos de un ingreso o un gasto son facturas y comprobantes: solo los
  // ve quien tiene acceso financiero. La cotización de un proyecto sí la
  // necesita producción, así que basta con estar autenticado.
  if ((ingresoId || gastoId) && !canViewFinancials(user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const financiero = canViewFinancials(user.role)
  const tiposVisibles = (tiposFiltro.length ? tiposFiltro : [...TIPOS])
    .filter((t) => financiero || !TIPOS_FACTURA.includes(t))

  const documentos = await prisma.documento.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(ingresoId ? { ingresoId } : {}),
      ...(gastoId ? { gastoId } : {}),
      tipo: { in: tiposVisibles },
    },
    select: {
      id: true,
      tipo: true,
      nombreOriginal: true,
      mimeType: true,
      tamanoBytes: true,
      numeroFactura: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(documentos)
}

/** Sube un documento y lo asocia a un proyecto o a un ingreso. */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteContents(user.role)) {
    return NextResponse.json({ error: 'Sin permisos para adjuntar documentos' }, { status: 403 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: 'La solicitud no contiene un archivo válido.' }, { status: 400 })
  }

  const file = form.get('archivo')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Adjunta un archivo en el campo "archivo".' }, { status: 400 })
  }

  let tipo = String(form.get('tipo') || 'OTRO') as Tipo
  if (!TIPOS.includes(tipo)) {
    return NextResponse.json({ error: 'Tipo de documento no reconocido.' }, { status: 400 })
  }
  if (TIPOS_FACTURA.includes(tipo) && !canViewFinancials(user.role)) {
    return NextResponse.json({ error: 'Sin permisos para adjuntar facturas' }, { status: 403 })
  }

  const projectId = (form.get('projectId') as string) || null
  const ingresoId = (form.get('ingresoId') as string) || null
  const gastoId = (form.get('gastoId') as string) || null
  const numeroFactura = ((form.get('numeroFactura') as string) || '').trim().slice(0, 40) || null

  if (!projectId && !ingresoId && !gastoId) {
    return NextResponse.json({ error: 'El documento debe pertenecer a un proyecto, un ingreso o un gasto.' }, { status: 400 })
  }

  // Verificar que el destino existe antes de escribir nada en disco.
  if (projectId) {
    const existe = await prisma.clientProject.findUnique({ where: { id: projectId }, select: { id: true } })
    if (!existe) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  }
  if (ingresoId) {
    const existe = await prisma.ingreso.findUnique({ where: { id: ingresoId }, select: { id: true } })
    if (!existe) return NextResponse.json({ error: 'Ingreso no encontrado' }, { status: 404 })
  }
  if (gastoId) {
    const existe = await prisma.gasto.findUnique({ where: { id: gastoId }, select: { id: true } })
    if (!existe) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
  }

  try {
    const guardado = await guardarArchivo(file)
    // Una factura se sube como PDF o XML desde el mismo panel: el tipo exacto
    // lo decide el formato real del archivo.
    if (TIPOS_FACTURA.includes(tipo)) {
      tipo = guardado.mimeType.includes('xml') ? 'FACTURA_XML' : 'FACTURA_PDF'
    }

    const documento = await prisma.documento.create({
      data: {
        tipo,
        nombreOriginal: file.name.slice(0, 180),
        archivo: guardado.archivo,
        mimeType: guardado.mimeType,
        tamanoBytes: guardado.tamanoBytes,
        numeroFactura,
        projectId,
        ingresoId,
        gastoId,
        subidoPor: user.userId,
      },
      select: {
        id: true,
        tipo: true,
        nombreOriginal: true,
        mimeType: true,
        tamanoBytes: true,
        numeroFactura: true,
        createdAt: true,
      },
    })

    return NextResponse.json(documento, { status: 201 })
  } catch (error) {
    if (error instanceof ErrorArchivo) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[POST /api/documentos]', error)
    return NextResponse.json({ error: 'No se pudo guardar el documento.' }, { status: 500 })
  }
}
