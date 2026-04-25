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

  // Limpiar datos de demo (clientes, planes, contenidos) solo si no hay clientes reales
  const clientCount = await prisma.client.count()
  if (clientCount > 0) {
    console.log('ℹ️  Ya existen clientes en el sistema, omitiendo seed de datos demo')
    return
  }

  // Limpiar datos demo vacíos
  await prisma.content.deleteMany()
  await prisma.monthlyPlan.deleteMany()
  await prisma.client.deleteMany()

  // Cliente 1: Cafetería La Luna
  const client1 = await prisma.client.create({
    data: {
      name: 'Cafetería La Luna',
      business: 'Cafetería y Repostería Artesanal',
      contact: 'María González',
      whatsapp: '+521234567890',
      email: 'contacto@cafeluna.mx',
      status: ClientStatus.ACTIVE,
      notes: 'Cliente premium, muy activo en redes. Prefiere contenido cálido y estético.',
    },
  })

  // Cliente 2: Boutique Mariel
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

  // Cliente 3: PowerFit Gym
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

  // Plan 1: Cafetería La Luna - Abril 2026
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
      observations: 'Mes de campaña especial Día de las Madres. Priorizar contenido emocional.',
    },
  })

  // Plan 2: Boutique Mariel - Abril 2026
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

  // Plan 3: PowerFit Gym - Marzo 2026 (mes anterior, atrasado)
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

  // =====================
  // CONTENIDOS - Plan 1 (Cafetería La Luna, Abril 2026)
  // =====================

  // Reels Cafetería La Luna
  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.REEL,
      title: 'El ritual del café de la mañana ☕',
      status: ContentStatus.COMPLETED,
      driveLink: 'https://drive.google.com/file/d/fake-reel-luna-001',
      publishedLink: 'https://www.instagram.com/reel/fake-luna-001',
      publishedAt: new Date('2026-04-03'),
      views: 12400,
      likes: 890,
      comments: 134,
      shares: 67,
      saves: 312,
      observations: 'Excelente rendimiento. El mejor reel del mes.',
    },
  })

  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.REEL,
      title: 'Behind the scenes: preparando pasteles artesanales',
      status: ContentStatus.PUBLISHED,
      driveLink: 'https://drive.google.com/file/d/fake-reel-luna-002',
      publishedLink: 'https://www.instagram.com/reel/fake-luna-002',
      publishedAt: new Date('2026-04-10'),
      views: 8750,
      likes: 620,
      comments: 89,
      shares: 45,
      saves: 198,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.REEL,
      title: 'La receta secreta del capuchino de temporada',
      status: ContentStatus.EDITING,
      driveLink: 'https://drive.google.com/file/d/fake-reel-luna-003',
      observations: 'En proceso de corrección de color.',
    },
  })

  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.REEL,
      title: 'Campaña Día de las Madres - Sorpresa especial',
      status: ContentStatus.PENDING,
      observations: 'Pendiente grabación. Sesión programada para el 28 de abril.',
    },
  })

  // Carruseles Cafetería La Luna
  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.CAROUSEL,
      title: 'Menú de temporada: Primavera 2026',
      status: ContentStatus.COMPLETED,
      driveLink: 'https://drive.google.com/file/d/fake-carousel-luna-001',
      publishedLink: 'https://www.instagram.com/p/fake-luna-carousel-001',
      publishedAt: new Date('2026-04-05'),
      views: 5200,
      likes: 340,
      comments: 55,
      shares: 28,
      saves: 180,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.CAROUSEL,
      title: '5 razones para empezar tu día en La Luna',
      status: ContentStatus.COMPLETED,
      driveLink: 'https://drive.google.com/file/d/fake-carousel-luna-002',
      publishedLink: 'https://www.instagram.com/p/fake-luna-carousel-002',
      publishedAt: new Date('2026-04-12'),
      views: 4100,
      likes: 280,
      comments: 42,
      shares: 19,
      saves: 145,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.CAROUSEL,
      title: 'Historia de La Luna: 10 años de café artesanal',
      status: ContentStatus.APPROVED,
      driveLink: 'https://drive.google.com/file/d/fake-carousel-luna-003',
      observations: 'Aprobado por el cliente. Programado para publicar el 20 de abril.',
    },
  })

  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.CAROUSEL,
      title: 'Tips para elegir el café perfecto según tu mood',
      status: ContentStatus.EDITING,
      driveLink: 'https://drive.google.com/file/d/fake-carousel-luna-004',
    },
  })

  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.CAROUSEL,
      title: 'Nuestros clientes favoritos comparten su experiencia',
      status: ContentStatus.PENDING,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.CAROUSEL,
      title: 'Gift guide Día de las Madres: regalos desde $150',
      status: ContentStatus.PENDING,
    },
  })

  // Flyers Cafetería La Luna
  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.FLYER,
      title: 'Promoción: 2x1 en capuchinos los martes',
      status: ContentStatus.PUBLISHED,
      driveLink: 'https://drive.google.com/file/d/fake-flyer-luna-001',
      publishedLink: 'https://www.instagram.com/p/fake-luna-flyer-001',
      publishedAt: new Date('2026-04-01'),
      views: 3800,
      likes: 210,
      comments: 38,
      shares: 55,
      saves: 90,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.FLYER,
      title: 'Evento: Tarde de jazz en La Luna - 19 de Abril',
      status: ContentStatus.COMPLETED,
      driveLink: 'https://drive.google.com/file/d/fake-flyer-luna-002',
      publishedLink: 'https://www.instagram.com/p/fake-luna-flyer-002',
      publishedAt: new Date('2026-04-15'),
      views: 2900,
      likes: 175,
      comments: 29,
      shares: 42,
      saves: 68,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.FLYER,
      title: 'Menú especial Día de las Madres',
      status: ContentStatus.PENDING,
      observations: 'Pendiente diseño final. Fecha límite: 25 de abril.',
    },
  })

  await prisma.content.create({
    data: {
      clientId: client1.id,
      planId: plan1.id,
      type: ContentType.FLYER,
      title: 'Concurso: Gana un brunch para dos personas',
      status: ContentStatus.PENDING,
    },
  })

  console.log('✅ Contenidos de Cafetería La Luna creados')

  // =====================
  // CONTENIDOS - Plan 2 (Boutique Mariel, Abril 2026)
  // =====================

  await prisma.content.create({
    data: {
      clientId: client2.id,
      planId: plan2.id,
      type: ContentType.REEL,
      title: 'Outfits primavera: cómo combinar colores pastel',
      status: ContentStatus.COMPLETED,
      driveLink: 'https://drive.google.com/file/d/fake-reel-mariel-001',
      publishedLink: 'https://www.instagram.com/reel/fake-mariel-001',
      publishedAt: new Date('2026-04-04'),
      views: 18600,
      likes: 1340,
      comments: 210,
      shares: 98,
      saves: 560,
      observations: 'Reel viral. Mejor rendimiento de la cuenta en el mes.',
    },
  })

  await prisma.content.create({
    data: {
      clientId: client2.id,
      planId: plan2.id,
      type: ContentType.REEL,
      title: 'Get ready with me: look para día de oficina',
      status: ContentStatus.PUBLISHED,
      driveLink: 'https://drive.google.com/file/d/fake-reel-mariel-002',
      publishedLink: 'https://www.instagram.com/reel/fake-mariel-002',
      publishedAt: new Date('2026-04-11'),
      views: 9200,
      likes: 780,
      comments: 125,
      shares: 52,
      saves: 290,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client2.id,
      planId: plan2.id,
      type: ContentType.REEL,
      title: 'Haul nueva colección: lo que no puedes perderte',
      status: ContentStatus.EDITING,
      driveLink: 'https://drive.google.com/file/d/fake-reel-mariel-003',
    },
  })

  await prisma.content.create({
    data: {
      clientId: client2.id,
      planId: plan2.id,
      type: ContentType.CAROUSEL,
      title: 'Nueva colección primavera-verano 2026',
      status: ContentStatus.COMPLETED,
      driveLink: 'https://drive.google.com/file/d/fake-carousel-mariel-001',
      publishedLink: 'https://www.instagram.com/p/fake-mariel-carousel-001',
      publishedAt: new Date('2026-04-02'),
      views: 6800,
      likes: 520,
      comments: 88,
      shares: 34,
      saves: 240,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client2.id,
      planId: plan2.id,
      type: ContentType.CAROUSEL,
      title: 'Guía de tallas: encuentra tu fit perfecto',
      status: ContentStatus.PUBLISHED,
      driveLink: 'https://drive.google.com/file/d/fake-carousel-mariel-002',
      publishedLink: 'https://www.instagram.com/p/fake-mariel-carousel-002',
      publishedAt: new Date('2026-04-14'),
      views: 4400,
      likes: 310,
      comments: 67,
      shares: 22,
      saves: 190,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client2.id,
      planId: plan2.id,
      type: ContentType.CAROUSEL,
      title: 'Cómo crear looks con una sola prenda clave',
      status: ContentStatus.PENDING,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client2.id,
      planId: plan2.id,
      type: ContentType.CAROUSEL,
      title: 'Colores tendencia para esta temporada',
      status: ContentStatus.PENDING,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client2.id,
      planId: plan2.id,
      type: ContentType.FLYER,
      title: 'Sale 30% off: colección anterior liquidación',
      status: ContentStatus.COMPLETED,
      driveLink: 'https://drive.google.com/file/d/fake-flyer-mariel-001',
      publishedLink: 'https://www.instagram.com/p/fake-mariel-flyer-001',
      publishedAt: new Date('2026-04-07'),
      views: 7100,
      likes: 420,
      comments: 95,
      shares: 110,
      saves: 180,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client2.id,
      planId: plan2.id,
      type: ContentType.FLYER,
      title: 'Pedidos personalizados: WhatsApp disponible',
      status: ContentStatus.PENDING,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client2.id,
      planId: plan2.id,
      type: ContentType.FLYER,
      title: 'Evento de moda: open house en tienda',
      status: ContentStatus.PENDING,
    },
  })

  console.log('✅ Contenidos de Boutique Mariel creados')

  // =====================
  // CONTENIDOS - Plan 3 (PowerFit Gym, Marzo 2026 - Atrasado)
  // =====================

  await prisma.content.create({
    data: {
      clientId: client3.id,
      planId: plan3.id,
      type: ContentType.REEL,
      title: 'Rutina de 20 minutos: cardio sin equipo',
      status: ContentStatus.COMPLETED,
      driveLink: 'https://drive.google.com/file/d/fake-reel-power-001',
      publishedLink: 'https://www.instagram.com/reel/fake-power-001',
      publishedAt: new Date('2026-03-05'),
      views: 15200,
      likes: 1100,
      comments: 178,
      shares: 89,
      saves: 445,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client3.id,
      planId: plan3.id,
      type: ContentType.REEL,
      title: 'Transformación 30 días: testimonio real',
      status: ContentStatus.PUBLISHED,
      driveLink: 'https://drive.google.com/file/d/fake-reel-power-002',
      publishedLink: 'https://www.instagram.com/reel/fake-power-002',
      publishedAt: new Date('2026-03-15'),
      views: 11800,
      likes: 920,
      comments: 145,
      shares: 76,
      saves: 380,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client3.id,
      planId: plan3.id,
      type: ContentType.REEL,
      title: 'Top 5 errores al hacer sentadilla',
      status: ContentStatus.PENDING,
      observations: 'Aprobaciones retrasadas por el cliente. Sin fecha confirmada.',
    },
  })

  await prisma.content.create({
    data: {
      clientId: client3.id,
      planId: plan3.id,
      type: ContentType.REEL,
      title: 'Entrenamiento de piernas con Trainer Carlos',
      status: ContentStatus.PENDING,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client3.id,
      planId: plan3.id,
      type: ContentType.REEL,
      title: 'Nutrición pre y post entrenamiento',
      status: ContentStatus.PENDING,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client3.id,
      planId: plan3.id,
      type: ContentType.CAROUSEL,
      title: 'Plan de membresías marzo 2026',
      status: ContentStatus.COMPLETED,
      driveLink: 'https://drive.google.com/file/d/fake-carousel-power-001',
      publishedLink: 'https://www.instagram.com/p/fake-power-carousel-001',
      publishedAt: new Date('2026-03-01'),
      views: 3900,
      likes: 245,
      comments: 62,
      shares: 31,
      saves: 120,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client3.id,
      planId: plan3.id,
      type: ContentType.CAROUSEL,
      title: 'Equipamiento nuevo: tour por el gym',
      status: ContentStatus.PENDING,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client3.id,
      planId: plan3.id,
      type: ContentType.CAROUSEL,
      title: '7 beneficios del ejercicio de fuerza',
      status: ContentStatus.PENDING,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client3.id,
      planId: plan3.id,
      type: ContentType.FLYER,
      title: 'Promoción: mes gratis con inscripción anual',
      status: ContentStatus.PUBLISHED,
      driveLink: 'https://drive.google.com/file/d/fake-flyer-power-001',
      publishedLink: 'https://www.instagram.com/p/fake-power-flyer-001',
      publishedAt: new Date('2026-03-08'),
      views: 5600,
      likes: 380,
      comments: 91,
      shares: 145,
      saves: 210,
    },
  })

  await prisma.content.create({
    data: {
      clientId: client3.id,
      planId: plan3.id,
      type: ContentType.FLYER,
      title: 'Clases grupales: horario actualizado',
      status: ContentStatus.PENDING,
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
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error en seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
