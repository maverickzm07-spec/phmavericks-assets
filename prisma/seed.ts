import { PrismaClient, ClientStatus, PaymentStatus, PlanStatus, ContentType, ContentStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Crear Super Admin solo si no existe ninguno
  const superAdminExists = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } })
  if (!superAdminExists) {
    const hashedPassword = await bcrypt.hash('PHMavericks2026!', 12)
    await prisma.user.create({
      data: {
        email: 'superadmin@phmavericks.com',
        password: hashedPassword,
        name: 'Super Admin PHMavericks',
        role: 'SUPER_ADMIN',
        activo: true,
      },
    })
    console.log('✅ Super Admin creado')
    console.log('   Email:    superadmin@phmavericks.com')
    console.log('   Password: PHMavericks2026!')
    console.log('   ⚠️  Cambia la contraseña después del primer login')
  } else {
    console.log('ℹ️  Super Admin ya existe, omitiendo creación')
  }

  // Limpiar datos de demo solo si no hay clientes reales
  const clientCount = await prisma.client.count()
  if (clientCount > 0) {
    console.log('ℹ️  Ya existen clientes en el sistema, omitiendo seed de datos demo')
    return
  }

  await prisma.content.deleteMany()
  await prisma.monthlyPlan.deleteMany()
  await prisma.client.deleteMany()

  // ── CLIENTES ──────────────────────────────────────────
  const client1 = await prisma.client.create({
    data: {
      name: 'Cafetería La Luna',
      business: 'Cafetería y Repostería Artesanal',
      contact: 'María González',
      whatsapp: '+521234567890',
      email: 'contacto@cafeluna.mx',
      status: ClientStatus.ACTIVE,
      notes: 'Cliente premium. Prefiere contenido cálido y estético.',
    },
  })

  const client2 = await prisma.client.create({
    data: {
      name: 'Boutique Mariel',
      business: 'Moda y Accesorios Femeninos',
      contact: 'Mariel Rodríguez',
      whatsapp: '+529876543210',
      email: 'mariel@boutiquemariel.com',
      status: ClientStatus.ACTIVE,
      notes: 'Enfocada en Instagram. Le gusta contenido de tendencias y lifestyle.',
    },
  })

  const client3 = await prisma.client.create({
    data: {
      name: 'PowerFit Gym',
      business: 'Centro Deportivo y Fitness',
      contact: 'Carlos Mendoza',
      whatsapp: '+521122334455',
      email: 'admin@powerfitgym.com',
      status: ClientStatus.ACTIVE,
      notes: 'Requiere contenido energético. Meta principal: captar nuevos socios.',
    },
  })
  console.log('✅ 3 clientes creados')

  // ── PLANES MENSUALES ───────────────────────────────────
  const plan1 = await prisma.monthlyPlan.create({
    data: {
      clientId: client1.id,
      month: 4,
      year: 2026,
      reelsCount: 4,
      carouselsCount: 6,
      flyersCount: 4,
      monthlyPrice: 8500,
      paymentStatus: PaymentStatus.PAID,
      planStatus: PlanStatus.IN_PROGRESS,
      observations: 'Mes de campaña especial Día de las Madres.',
    },
  })

  const plan2 = await prisma.monthlyPlan.create({
    data: {
      clientId: client2.id,
      month: 4,
      year: 2026,
      reelsCount: 3,
      carouselsCount: 4,
      flyersCount: 3,
      monthlyPrice: 6500,
      paymentStatus: PaymentStatus.PARTIAL,
      planStatus: PlanStatus.IN_PROGRESS,
      observations: 'Lanzamiento nueva colección primavera-verano.',
    },
  })

  const plan3 = await prisma.monthlyPlan.create({
    data: {
      clientId: client3.id,
      month: 3,
      year: 2026,
      reelsCount: 5,
      carouselsCount: 3,
      flyersCount: 2,
      monthlyPrice: 7000,
      paymentStatus: PaymentStatus.PENDING,
      planStatus: PlanStatus.DELAYED,
      observations: 'Cliente aprobó contenidos con retraso. Pendiente liquidación.',
    },
  })
  console.log('✅ 3 planes mensuales creados')

  // ── CONTENIDOS — Cafetería La Luna (plan1) ─────────────
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.REEL, requierePublicacion: true,
      title: 'El ritual del café de la mañana ☕',
      status: ContentStatus.PUBLICADO,
      driveLink: 'https://drive.google.com/file/d/fake-reel-luna-001',
      publishedLink: 'https://www.instagram.com/reel/fake-luna-001',
      publishedAt: new Date('2026-04-03'),
      views: 12400, likes: 890, comments: 134, shares: 67, saves: 312,
      observations: 'Excelente rendimiento. El mejor reel del mes.',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.REEL, requierePublicacion: true,
      title: 'Behind the scenes: preparando pasteles artesanales',
      status: ContentStatus.PUBLICADO,
      driveLink: 'https://drive.google.com/file/d/fake-reel-luna-002',
      publishedLink: 'https://www.instagram.com/reel/fake-luna-002',
      publishedAt: new Date('2026-04-10'),
      views: 8750, likes: 620, comments: 89, shares: 45, saves: 198,
    },
  })
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.REEL, requierePublicacion: true,
      title: 'La receta secreta del capuchino de temporada',
      status: ContentStatus.EN_PROCESO,
      driveLink: 'https://drive.google.com/file/d/fake-reel-luna-003',
      observations: 'En proceso de corrección de color.',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.REEL, requierePublicacion: true,
      title: 'Campaña Día de las Madres - Sorpresa especial',
      status: ContentStatus.PENDIENTE,
      observations: 'Pendiente grabación. Sesión programada para el 28 de abril.',
    },
  })

  // Fotos (antes: Carruseles)
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.FOTO, requierePublicacion: false,
      title: 'Menú de temporada: Primavera 2026',
      status: ContentStatus.ENTREGADO,
      driveLink: 'https://drive.google.com/file/d/fake-foto-luna-001',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.FOTO, requierePublicacion: false,
      title: '5 razones para empezar tu día en La Luna',
      status: ContentStatus.ENTREGADO,
      driveLink: 'https://drive.google.com/file/d/fake-foto-luna-002',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.FOTO, requierePublicacion: false,
      title: 'Historia de La Luna: 10 años de café artesanal',
      status: ContentStatus.EN_PROCESO,
      driveLink: 'https://drive.google.com/file/d/fake-foto-luna-003',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.FOTO, requierePublicacion: false,
      title: 'Tips para elegir el café perfecto según tu mood',
      status: ContentStatus.EN_PROCESO,
      driveLink: 'https://drive.google.com/file/d/fake-foto-luna-004',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.FOTO, requierePublicacion: false,
      title: 'Nuestros clientes favoritos comparten su experiencia',
      status: ContentStatus.PENDIENTE,
    },
  })
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.FOTO, requierePublicacion: false,
      title: 'Gift guide Día de las Madres: regalos desde $150',
      status: ContentStatus.PENDIENTE,
    },
  })

  // Imágenes/Flyers (antes: Flyers)
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.IMAGEN_FLYER, requierePublicacion: false,
      title: 'Promoción: 2x1 en capuchinos los martes',
      status: ContentStatus.ENTREGADO,
      driveLink: 'https://drive.google.com/file/d/fake-flyer-luna-001',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.IMAGEN_FLYER, requierePublicacion: false,
      title: 'Evento: Tarde de jazz en La Luna - 19 de Abril',
      status: ContentStatus.ENTREGADO,
      driveLink: 'https://drive.google.com/file/d/fake-flyer-luna-002',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.IMAGEN_FLYER, requierePublicacion: false,
      title: 'Menú especial Día de las Madres',
      status: ContentStatus.PENDIENTE,
      observations: 'Pendiente diseño final. Fecha límite: 25 de abril.',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client1.id, planId: plan1.id,
      type: ContentType.IMAGEN_FLYER, requierePublicacion: false,
      title: 'Concurso: Gana un brunch para dos personas',
      status: ContentStatus.PENDIENTE,
    },
  })
  console.log('✅ Contenidos de Cafetería La Luna creados')

  // ── CONTENIDOS — Boutique Mariel (plan2) ──────────────
  await prisma.content.create({
    data: {
      clientId: client2.id, planId: plan2.id,
      type: ContentType.REEL, requierePublicacion: true,
      title: 'Outfits primavera: cómo combinar colores pastel',
      status: ContentStatus.PUBLICADO,
      driveLink: 'https://drive.google.com/file/d/fake-reel-mariel-001',
      publishedLink: 'https://www.instagram.com/reel/fake-mariel-001',
      publishedAt: new Date('2026-04-04'),
      views: 18600, likes: 1340, comments: 210, shares: 98, saves: 560,
      observations: 'Reel viral. Mejor rendimiento de la cuenta en el mes.',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client2.id, planId: plan2.id,
      type: ContentType.REEL, requierePublicacion: true,
      title: 'Get ready with me: look para día de oficina',
      status: ContentStatus.PUBLICADO,
      driveLink: 'https://drive.google.com/file/d/fake-reel-mariel-002',
      publishedLink: 'https://www.instagram.com/reel/fake-mariel-002',
      publishedAt: new Date('2026-04-11'),
      views: 9200, likes: 780, comments: 125, shares: 52, saves: 290,
    },
  })
  await prisma.content.create({
    data: {
      clientId: client2.id, planId: plan2.id,
      type: ContentType.REEL, requierePublicacion: true,
      title: 'Haul nueva colección: lo que no puedes perderte',
      status: ContentStatus.EN_PROCESO,
      driveLink: 'https://drive.google.com/file/d/fake-reel-mariel-003',
    },
  })

  await prisma.content.create({
    data: {
      clientId: client2.id, planId: plan2.id,
      type: ContentType.FOTO, requierePublicacion: false,
      title: 'Nueva colección primavera-verano 2026',
      status: ContentStatus.ENTREGADO,
      driveLink: 'https://drive.google.com/file/d/fake-foto-mariel-001',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client2.id, planId: plan2.id,
      type: ContentType.FOTO, requierePublicacion: false,
      title: 'Guía de tallas: encuentra tu fit perfecto',
      status: ContentStatus.ENTREGADO,
      driveLink: 'https://drive.google.com/file/d/fake-foto-mariel-002',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client2.id, planId: plan2.id,
      type: ContentType.FOTO, requierePublicacion: false,
      title: 'Cómo crear looks con una sola prenda clave',
      status: ContentStatus.PENDIENTE,
    },
  })
  await prisma.content.create({
    data: {
      clientId: client2.id, planId: plan2.id,
      type: ContentType.FOTO, requierePublicacion: false,
      title: 'Colores tendencia para esta temporada',
      status: ContentStatus.PENDIENTE,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client2.id, planId: plan2.id,
      type: ContentType.IMAGEN_FLYER, requierePublicacion: false,
      title: 'Sale 30% off: colección anterior liquidación',
      status: ContentStatus.ENTREGADO,
      driveLink: 'https://drive.google.com/file/d/fake-flyer-mariel-001',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client2.id, planId: plan2.id,
      type: ContentType.IMAGEN_FLYER, requierePublicacion: false,
      title: 'Pedidos personalizados: WhatsApp disponible',
      status: ContentStatus.PENDIENTE,
    },
  })
  await prisma.content.create({
    data: {
      clientId: client2.id, planId: plan2.id,
      type: ContentType.IMAGEN_FLYER, requierePublicacion: false,
      title: 'Evento de moda: open house en tienda',
      status: ContentStatus.PENDIENTE,
    },
  })
  console.log('✅ Contenidos de Boutique Mariel creados')

  // ── CONTENIDOS — PowerFit Gym (plan3) ─────────────────
  await prisma.content.create({
    data: {
      clientId: client3.id, planId: plan3.id,
      type: ContentType.REEL, requierePublicacion: true,
      title: 'Rutina de 20 minutos: cardio sin equipo',
      status: ContentStatus.PUBLICADO,
      driveLink: 'https://drive.google.com/file/d/fake-reel-power-001',
      publishedLink: 'https://www.instagram.com/reel/fake-power-001',
      publishedAt: new Date('2026-03-05'),
      views: 15200, likes: 1100, comments: 178, shares: 89, saves: 445,
    },
  })
  await prisma.content.create({
    data: {
      clientId: client3.id, planId: plan3.id,
      type: ContentType.REEL, requierePublicacion: true,
      title: 'Transformación 30 días: testimonio real',
      status: ContentStatus.PUBLICADO,
      driveLink: 'https://drive.google.com/file/d/fake-reel-power-002',
      publishedLink: 'https://www.instagram.com/reel/fake-power-002',
      publishedAt: new Date('2026-03-15'),
      views: 11800, likes: 920, comments: 145, shares: 76, saves: 380,
    },
  })
  await prisma.content.create({
    data: {
      clientId: client3.id, planId: plan3.id,
      type: ContentType.REEL, requierePublicacion: true,
      title: 'Top 5 errores al hacer sentadilla',
      status: ContentStatus.PENDIENTE,
      observations: 'Aprobaciones retrasadas por el cliente.',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client3.id, planId: plan3.id,
      type: ContentType.REEL, requierePublicacion: true,
      title: 'Entrenamiento de piernas con Trainer Carlos',
      status: ContentStatus.PENDIENTE,
    },
  })
  await prisma.content.create({
    data: {
      clientId: client3.id, planId: plan3.id,
      type: ContentType.REEL, requierePublicacion: true,
      title: 'Nutrición pre y post entrenamiento',
      status: ContentStatus.PENDIENTE,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client3.id, planId: plan3.id,
      type: ContentType.FOTO, requierePublicacion: false,
      title: 'Plan de membresías marzo 2026',
      status: ContentStatus.ENTREGADO,
      driveLink: 'https://drive.google.com/file/d/fake-foto-power-001',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client3.id, planId: plan3.id,
      type: ContentType.FOTO, requierePublicacion: false,
      title: 'Equipamiento nuevo: tour por el gym',
      status: ContentStatus.PENDIENTE,
    },
  })
  await prisma.content.create({
    data: {
      clientId: client3.id, planId: plan3.id,
      type: ContentType.FOTO, requierePublicacion: false,
      title: '7 beneficios del ejercicio de fuerza',
      status: ContentStatus.PENDIENTE,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client3.id, planId: plan3.id,
      type: ContentType.IMAGEN_FLYER, requierePublicacion: false,
      title: 'Promoción: mes gratis con inscripción anual',
      status: ContentStatus.ENTREGADO,
      driveLink: 'https://drive.google.com/file/d/fake-flyer-power-001',
    },
  })
  await prisma.content.create({
    data: {
      clientId: client3.id, planId: plan3.id,
      type: ContentType.IMAGEN_FLYER, requierePublicacion: false,
      title: 'Clases grupales: horario actualizado',
      status: ContentStatus.PENDIENTE,
    },
  })
  console.log('✅ Contenidos de PowerFit Gym creados')
  console.log('🎉 Seed completado exitosamente!')
  console.log('')
  console.log('📋 Datos de acceso Super Admin:')
  console.log('   Email:    superadmin@phmavericks.com')
  console.log('   Password: PHMavericks2026!')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error('❌ Error en seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
