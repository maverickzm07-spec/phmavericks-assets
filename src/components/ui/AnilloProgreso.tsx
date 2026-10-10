'use client'

/**
 * Anillo de medición.
 *
 * El arco dibuja el porcentaje y el centro lleva la cifra que importa. Cuando
 * no hay dato que medir (todavía no hay historial, no hay entregas
 * comprometidas) el anillo no finge un 0 %: se muestra apagado y lo dice.
 */

interface Props {
  /** 0 a 100. null cuando aún no hay nada que medir. */
  valor: number | null
  etiqueta: string
  /** Texto grande del centro. Si se omite, se usa el porcentaje. */
  centro?: string
  pie?: string
  tono?: 'rojo' | 'ok' | 'aviso' | 'neutro'
  tamano?: number
}

const TONOS = {
  rojo: { trazo: '#C41E1E', halo: 'rgba(196,30,30,.35)' },
  ok: { trazo: '#3FB97F', halo: 'rgba(63,185,127,.3)' },
  aviso: { trazo: '#E0A33C', halo: 'rgba(224,163,60,.3)' },
  neutro: { trazo: '#FFFFFF', halo: 'rgba(255,255,255,.2)' },
}

export default function AnilloProgreso({
  valor,
  etiqueta,
  centro,
  pie,
  tono = 'rojo',
  tamano = 112,
}: Props) {
  const grosor = 9
  const radio = (tamano - grosor) / 2
  const circunferencia = 2 * Math.PI * radio
  const sinDato = valor === null
  const pct = sinDato ? 0 : Math.max(0, Math.min(100, valor))
  const avance = circunferencia * (1 - pct / 100)
  const { trazo, halo } = TONOS[tono]
  // Una cifra larga ($1.433,33) no cabe a 19px junto al pie: se reduce el
  // cuerpo en vez de recortar el numero, que es el dato que importa.
  const textoCentro = centro ?? `${pct}%`
  const cuerpoCentro = textoCentro.length > 8 ? 15 : textoCentro.length > 6 ? 17 : 19

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative" style={{ width: tamano, height: tamano }}>
        <svg
          width={tamano}
          height={tamano}
          viewBox={`0 0 ${tamano} ${tamano}`}
          role="img"
          aria-label={sinDato ? `${etiqueta}: sin datos` : `${etiqueta}: ${pct}%`}
          // Se gira para que el arco arranque arriba y no a la derecha.
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={tamano / 2}
            cy={tamano / 2}
            r={radio}
            fill="none"
            stroke="rgba(255,255,255,.07)"
            strokeWidth={grosor}
          />
          {!sinDato && (
            <circle
              cx={tamano / 2}
              cy={tamano / 2}
              r={radio}
              fill="none"
              stroke={trazo}
              strokeWidth={grosor}
              strokeLinecap="round"
              strokeDasharray={circunferencia}
              strokeDashoffset={avance}
              style={{
                filter: `drop-shadow(0 0 5px ${halo})`,
                transition: 'stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)',
              }}
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {sinDato ? (
            <span className="text-[11px] font-semibold text-phm-gray-soft">Sin datos</span>
          ) : (
            <>
              <span
                className="tabular font-extrabold leading-none tracking-tight text-white"
                style={{ fontSize: cuerpoCentro }}
              >
                {textoCentro}
              </span>
              {pie && (
                <span className="mt-1.5 max-w-[80%] text-center text-[9.5px] leading-tight text-phm-gray-soft">
                  {pie}
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <p className="text-center text-[11.5px] font-medium leading-tight text-phm-gray">{etiqueta}</p>
    </div>
  )
}
