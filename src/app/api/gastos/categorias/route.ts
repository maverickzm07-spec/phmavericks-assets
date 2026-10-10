import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canViewIngresos, canWriteIngresos } from '@/lib/permissions'
import { z } from 'zod'

/**
 * Categorías de gasto. Viven en la base para poder ampliarlas desde la
 * aplicación: agregar una categoría nueva no exige tocar el código.
 */

const CATEGORIAS_BASE = [
  { nombre: 'Transporte y combustible', descripcion: 'Movilización, gasolina, peajes y fletes', orden: 1 },
  { nombre: 'Personal contratado', descripcion: 'Asistentes, editores y equipo externo por proyecto', orden: 2 },
  { nombre: 'Otros gastos', descripcion: 'Egresos que no encajan en las demás categorías', orden: 3 },
]

/** Siembra las categorías base la primera vez que se consultan. */
async function asegurarCategoriasBase() {
  const existentes = await prisma.categoriaGasto.count()
  if (existentes > 0) return
  await prisma.categoriaGasto.createMany({
    data: CATEGORIAS_BASE.map((c) => ({ ...c, esDefault: true })),
    skipDuplicates: true,
  })
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canViewIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  await asegurarCategoriasBase()

  const { searchParams } = new URL(request.url)
  const incluirInactivas = searchParams.get('todas') === '1'

  const categorias = await prisma.categoriaGasto.findMany({
    where: incluirInactivas ? {} : { activa: true },
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    include: { _count: { select: { gastos: true } } },
  })

  return NextResponse.json(categorias)
}

const crearSchema = z.object({
  nombre: z.string().min(1, 'El nombre de la categoría es obligatorio').max(60),
  descripcion: z.string().max(200).optional().nullable(),
})

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canWriteIngresos(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const data = crearSchema.parse(await request.json())

    const duplicada = await prisma.categoriaGasto.findFirst({
      where: { nombre: { equals: data.nombre.trim(), mode: 'insensitive' } },
    })
    if (duplicada) {
      return NextResponse.json({ error: 'Ya existe una categoría con ese nombre' }, { status: 409 })
    }

    const ultima = await prisma.categoriaGasto.findFirst({ orderBy: { orden: 'desc' }, select: { orden: true } })

    const categoria = await prisma.categoriaGasto.create({
      data: {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion?.trim() || null,
        orden: (ultima?.orden ?? 0) + 1,
      },
    })

    return NextResponse.json(categoria, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('[POST /api/gastos/categorias]', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
