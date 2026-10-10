'use client'

import { useEffect } from 'react'

/**
 * Congela el scroll de la página mientras hay una capa encima (menú lateral,
 * modal, buscador a pantalla completa).
 *
 * No basta con poner `overflow: hidden` en el body: en iOS Safari eso no
 * detiene el desplazamiento por gesto y, cuando lo detiene, el navegador
 * manda la página al principio, de modo que al cerrar la capa el usuario
 * aparece en otro sitio. La forma que sí aguanta en los dos sistemas es fijar
 * el body a su posición actual y devolverlo exactamente donde estaba.
 *
 * Se compensa además el ancho de la barra de scroll del escritorio: si se
 * retira sin más, el contenido se desplaza unos píxeles a la derecha y toda la
 * interfaz pega un salto lateral justo al abrir el menú.
 */
export function useBloqueoScroll(activo: boolean) {
  useEffect(() => {
    if (!activo) return

    const y = window.scrollY
    const body = document.body
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth

    const previo = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
      overscroll: body.style.overscrollBehavior,
    }

    body.style.position = 'fixed'
    body.style.top = `-${y}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overscrollBehavior = 'contain'
    if (anchoBarra > 0) body.style.paddingRight = `${anchoBarra}px`

    return () => {
      body.style.position = previo.position
      body.style.top = previo.top
      body.style.left = previo.left
      body.style.right = previo.right
      body.style.width = previo.width
      body.style.paddingRight = previo.paddingRight
      body.style.overscrollBehavior = previo.overscroll
      // `instant` y no `smooth`: al cerrar, la vista tiene que estar ya donde
      // estaba, sin que el usuario vea el recorrido de vuelta.
      window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior })
    }
  }, [activo])
}
