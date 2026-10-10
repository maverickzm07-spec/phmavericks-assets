import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * Mantiene el calendario al día con las fechas de un proyecto.
 *
 * Un proyecto genera como mucho dos eventos: la grabación o sesión y la
 * entrega. Esta función los crea, los actualiza o los retira según las fechas
 * que tenga el proyecto en ese momento, de modo que editar el proyecto no deje
 * el calendario desfasado.
 *
 * Los eventos ya sincronizados con Google se marcan como PENDING para que la
 * próxima sincronización lleve el cambio; los que nunca llegaron a Google se
 * eliminan sin más.
 */

/** Duración por defecto de cada tipo de evento, en horas. */
const DURACION_HORAS = { GRABACION: 2, ENTREGA: 1 } as const

type TipoEvento = keyof typeof DURACION_HORAS

interface FechasProyecto {
  fechaGrabacion?: Date | null
  fechaEntrega?: Date | null
}

function definicionEventos(nombre: string, fechas: FechasProyecto) {
  return [
    { tipo: 'GRABACION' as TipoEvento, titulo: `Grabación · ${nombre}`, fecha: fechas.fechaGrabacion ?? null },
    { tipo: 'ENTREGA' as TipoEvento, titulo: `Entrega · ${nombre}`, fecha: fechas.fechaEntrega ?? null },
  ]
}

/**
 * @param tx cliente de Prisma; se pasa el de la transacción cuando corresponde,
 *           para que el proyecto y sus eventos se guarden juntos o no se guarden.
 */
export async function sincronizarEventosProyecto(
  projectId: string,
  nombre: string,
  clientId: string,
  fechas: FechasProyecto,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  const cliente = await tx.client.findUnique({ where: { id: clientId }, select: { name: true } })
  const existentes = await tx.calendarEvent.findMany({ where: { projectId } })

  for (const def of definicionEventos(nombre, fechas)) {
    const actual = existentes.find((e) => e.type === def.tipo)

    // Sin fecha: el evento ya no corresponde.
    if (!def.fecha) {
      if (actual) {
        if (actual.googleEventId) {
          // Existe en Google: se marca cancelado para que la sync lo retire allí.
          await tx.calendarEvent.update({
            where: { id: actual.id },
            data: { status: 'CANCELADO', syncStatus: 'PENDING' },
          })
        } else {
          await tx.calendarEvent.delete({ where: { id: actual.id } })
        }
      }
      continue
    }

    const inicio = def.fecha
    const fin = new Date(inicio.getTime() + DURACION_HORAS[def.tipo] * 60 * 60 * 1000)

    if (actual) {
      const sinCambios =
        actual.title === def.titulo &&
        actual.startDateTime.getTime() === inicio.getTime() &&
        actual.status !== 'CANCELADO'
      if (sinCambios) continue

      await tx.calendarEvent.update({
        where: { id: actual.id },
        data: {
          title: def.titulo,
          startDateTime: inicio,
          endDateTime: fin,
          status: 'AGENDADO',
          clientName: cliente?.name ?? null,
          // Hay cambios que Google todavía no conoce.
          syncStatus: 'PENDING',
        },
      })
    } else {
      await tx.calendarEvent.create({
        data: {
          title: def.titulo,
          type: def.tipo,
          startDateTime: inicio,
          endDateTime: fin,
          clientId,
          clientName: cliente?.name ?? null,
          projectId,
          notes: `Proyecto: ${nombre}`,
          status: 'AGENDADO',
          source: 'PHM',
          syncStatus: 'PENDING',
        },
      })
    }
  }
}
