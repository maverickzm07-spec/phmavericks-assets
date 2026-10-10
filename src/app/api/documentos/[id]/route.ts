import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canDeleteContents, canViewFinancials } from '@/lib/permissions'
import { borrarArchivo, ErrorArchivo, leerArchivo } from '@/lib/storage'

/** Descarga el documento. Requiere sesión: los adjuntos no son públicos. */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const documento = await prisma.documento.findUnique({ where: { id: params.id } })
  if (!documento) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  // Facturas y comprobantes de dinero: solo con acceso financiero.
  if ((documento.ingresoId || documento.gastoId) && !canViewFinancials(user.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const contenido = await leerArchivo(documento.archivo)
    // El nombre original puede traer comillas o acentos; se expone saneado y
    // además en la forma UTF-8 que entienden los navegadores.
    const seguro = documento.nombreOriginal.replace(/["\\\r\n]/g, '_')
    return new NextResponse(new Uint8Array(contenido), {
      status: 200,
      headers: {
        'Content-Type': documento.mimeType,
        'Content-Length': String(contenido.length),
        'Content-Disposition': `inline; filename="${seguro}"; filename*=UTF-8''${encodeURIComponent(documento.nombreOriginal)}`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    if (error instanceof ErrorArchivo) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[GET /api/documentos/[id]]', error)
    return NextResponse.json(
      { error: 'El archivo no está disponible en el servidor. El registro existe, pero el documento no se encuentra.' },
      { status: 404 },
    )
  }
}

/** Elimina el documento y su archivo en disco. */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canDeleteContents(user.role)) {
    return NextResponse.json({ error: 'Sin permisos para eliminar documentos' }, { status: 403 })
  }

  const documento = await prisma.documento.findUnique({ where: { id: params.id } })
  if (!documento) return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })

  await prisma.documento.delete({ where: { id: params.id } })
  await borrarArchivo(documento.archivo)

  return NextResponse.json({ success: true })
}
