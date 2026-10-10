import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canViewIngresos, canWriteIngresos, canDeleteIngresos } from '@/lib/permissions'
import { borrarArchivo } from '@/lib/storage'
import { logAudit } from '@/lib/auditLog'
import { z } from 'zod'

const updateSchema = z.object({
  fecha: z.string().optional(),
  concepto: z.string().min(1).max(200).optional(),
  categoriaId: z.string().optional(),
  monto: z.number().positive().optional(),
  proveedor: z.string().max(120).nullable().optional(),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'DEPOSITO', 'TARJETA', 'OTRO']).nullable().optional(),
  estado: z.enum(['PAGADO', 'PENDIENTE']).optional(),
  projectId: z.string().nullable().optional(),
  observaciones: z.string().max(500).nullable().optional(),
})

function normalizarFecha(valor?: string): Date | undefined {
  if (!valor) return undefined
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor)
  const fecha = new Date(soloFecha ? `${valor}T12:00:00` : valor)
  return isNaN(fecha.getTime()) ? undefined : fecha
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canViewIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const gasto = await prisma.gasto.findUnique({
    where: { id: params.id },
    include: {
      categoria: true,
      project: { select: { id: true, nombre: true, client: { select: { name: true } } } },
      creadoPorUser: { select: { name: true } },
      documentos: { select: { id: true, tipo: true, nombreOriginal: true, tamanoBytes: true, createdAt: true } },
    },
  })
  if (!gasto) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })

  return NextResponse.json(gasto)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const data = updateSchema.parse(await request.json())

    const existe = await prisma.gasto.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!existe) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })

    if (data.categoriaId) {
      const cat = await prisma.categoriaGasto.findUnique({ where: { id: data.categoriaId }, select: { id: true } })
      if (!cat) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }
    if (data.projectId) {
      const proyecto = await prisma.clientProject.findUnique({ where: { id: data.projectId }, select: { id: true } })
      if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const gasto = await prisma.gasto.update({
      where: { id: params.id },
      data: {
        ...data,
        fecha: normalizarFecha(data.fecha),
        concepto: data.concepto?.trim(),
        proveedor: data.proveedor === undefined ? undefined : (data.proveedor?.trim() || null),
        observaciones: data.observaciones === undefined ? undefined : (data.observaciones?.trim() || null),
        projectId: data.projectId === undefined ? undefined : (data.projectId || null),
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        project: { select: { id: true, nombre: true } },
      },
    })

    return NextResponse.json(gasto)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[PUT /api/gastos/[id]]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canDeleteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const gasto = await prisma.gasto.findUnique({
    where: { id: params.id },
    include: { documentos: { select: { archivo: true } } },
  })
  if (!gasto) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })

  // Los documentos se borran en cascada; sus archivos hay que quitarlos del disco.
  await prisma.gasto.delete({ where: { id: params.id } })
  for (const doc of gasto.documentos) await borrarArchivo(doc.archivo)

  // Borrar un gasto cambia el resultado del período: queda registrado.
  await logAudit({
    userId: user.userId,
    userEmail: user.email,
    action: 'GASTO_ELIMINADO',
    entity: 'Gasto',
    entityId: params.id,
    before: { concepto: gasto.concepto, monto: gasto.monto, fecha: gasto.fecha.toISOString(), estado: gasto.estado },
  })

  return NextResponse.json({ success: true })
}
