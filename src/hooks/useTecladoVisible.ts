'use client'

import { useEffect, useState } from 'react'

/**
 * Dice si el teclado del teléfono está abierto.
 *
 * No existe un evento para esto, así que se deduce del viewport visual: al
 * aparecer el teclado, `visualViewport.height` se encoge respecto al alto de
 * la ventana, mientras que `innerHeight` no se entera. Se exige una diferencia
 * grande (150px) para no confundirlo con la barra de direcciones del
 * navegador, que al recogerse cambia el alto en bastante menos.
 *
 * Sirve para apartar la barra de navegación inferior, que si no se queda
 * flotando encima del teclado tapando el campo que se está escribiendo.
 */
export function useTecladoVisible(): boolean {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const revisar = () => {
      // El desplazamiento del propio viewport cuenta: en iOS el teclado
      // además empuja la página hacia arriba.
      const oculto = window.innerHeight - vv.height - vv.offsetTop
      setVisible(oculto > 150)
    }

    revisar()
    vv.addEventListener('resize', revisar)
    vv.addEventListener('scroll', revisar)
    return () => {
      vv.removeEventListener('resize', revisar)
      vv.removeEventListener('scroll', revisar)
    }
  }, [])

  return visible
}
