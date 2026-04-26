import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { canManageServices } from '@/lib/permissions'
import { z } from 'zod'

const DEFAULT_PLANS = [
  {
    nombre: 'Presencia Inicial',
    tipo: 'CONTENIDO' as const,
    precio: 300,
    cantidadReels: 6,
    cantidadFotos: 0,
    jornadasGrabacion: 1,
    caracteristicas: ['3 videos principales', '3 videos hook', 'Guiones base', 'Dirección en cámara', 'Edición profesional', 'Subtítulos estilizados'],
    esDefault: true,
  },
  {
    nombre: 'Presencia Pro',
    tipo: 'CONTENIDO' as const,
    precio: 600,
    cantidadReels: 12,
    cantidadFotos: 0,
    jornadasGrabacion: 3,
    caracteristicas: ['6 videos principales', '6 videos hook', 'Guiones personalizados', 'Dirección avanzada', 'Edición profesional avanzada', 'Subtítulos estilizados'],
    esDefault: true,
  },
  {
    nombre: 'Impulso IA',
    tipo: 'IA' as const,
    precio: 200,
    cantidadReels: 8,
    cantidadFotos: 0,
    jornadasGrabacion: 1,
    caracteristicas: ['Avatar profesional 1080p', 'Guiones base', 'Edición básica', 'Subtítulos'],
    esDefault: true,
  },
  {
    nombre: 'Crecimiento IA',
    tipo: 'IA' as const,
    precio: 330,
    cantidadReels: 16,
    cantidadFotos: 0,
    jornadasGrabacion: 2,
    caracteristicas: ['Avatar premium', 'Voces en múltiples idiomas', 'Edición avanzada', 'Estrategia básica'],
    esDefault: true,
  },
  {
    nombre: 'Dominio IA',
    tipo: 'IA' as const,
    precio: 500,
    cantidadReels: 30,
    cantidadFotos: 0,
    jornadasGrabacion: 4,
    caracteristicas: ['Avatares ilimitados', 'Voces clonadas (opcional)', 'Estrategia completa', 'Calendario de contenido', 'Asesoría mensual'],
    esDefault: true,
  },
  {
    nombre: 'Sesión Flash',
    tipo: 'FOTOGRAFIA' as const,
    precio: 50,
    cantidadReels: 0,
    cantidadFotos: 6,
    jornadasGrabacion: 0,
    caracteristicas: ['Solo miércoles', 'Fotos editadas'],
    esDefault: true,
  },
  {
    nombre: 'Sesión Estándar',
    tipo: 'FOTOGRAFIA' as const,
    precio: 100,
    cantidadReels: 0,
    cantidadFotos: 12,
    jornadasGrabacion: 0,
    duracion: '1h 30min',
    vestuarios: 2,
    caracteristicas: ['Fotos editadas', 'Fotos sin editar'],
    esDefault: true,
  },
  {
    nombre: 'Sesión Pro',
    tipo: 'FOTOGRAFIA' as const,
    precio: 120,
    cantidadReels: 0,
    cantidadFotos: 15,
    jornadasGrabacion: 0,
    duracion: '1h 30min',
    vestuarios: 2,
    caracteristicas: ['Fotos editadas', 'Sesión completa', 'Entrega digital o pendrive'],
    esDefault: true,
  },
  {
    nombre: 'Sesión Premium',
    tipo: 'FOTOGRAFIA' as const,
    precio: 150,
    cantidadReels: 0,
    cantidadFotos: 0,
    jornadasGrabacion: 0,
    caracteristicas: ['Fotos según acuerdo', 'Dirección completa', 'Entrega digital o pendrive'],
    esDefault: true,
  },
]

async function seedDefaults() {
  const count = await prisma.servicePlan.count({ where: { esDefault: true } })
  if (count === 0) {
    await prisma.servicePlan.createMany({ data: DEFAULT_PLANS })
  }
}

const createSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(['CONTENIDO', 'IA', 'FOTOGRAFIA', 'PERSONALIZADO']),
  precio: z.number().positive(),
  cantidadReels: z.number().int().min(0).default(0),
  cantidadFotos: z.number().int().min(0).default(0),
  jornadasGrabacion: z.number().int().min(0).default(0),
  duracion: z.string().optional(),
  vestuarios: z.number().int().min(0).default(0),
  descripcion: z.string().optional(),
  caracteristicas: z.array(z.string()).default([]),
})

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  await seedDefaults()

  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo')
  const soloActivos = searchParams.get('activo') !== 'false'

  const plans = await prisma.servicePlan.findMany({
    where: {
      ...(tipo && { tipo: tipo as any }),
      ...(soloActivos && { activo: true }),
    },
    include: { _count: { select: { clients: true } } },
    orderBy: [{ tipo: 'asc' }, { precio: 'asc' }],
  })

  return NextResponse.json(plans)
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (!canManageServices(user.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const body = await request.json()
    const data = createSchema.parse(body)

    const plan = await prisma.servicePlan.create({
      data: { ...data, esDefault: false, activo: true },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
