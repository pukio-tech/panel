"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatPEN, formatPENCompact } from "@/lib/gym-utils";

const HEIGHT = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 64 };

const dayFmt = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" });
const longDayFmt = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long" });
const monthFmt = new Intl.DateTimeFormat("es-PE", { month: "short", year: "2-digit" });
const longMonthFmt = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" });

function toDate(fecha: string) {
  if (/^\d{4}-\d{2}$/.test(fecha)) return new Date(`${fecha}-01T00:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? new Date(`${fecha}T00:00:00`) : new Date(fecha);
}

/** Máximo «redondo» del eje Y (1, 2, 2.5, 5 × 10^n) para ticks legibles. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

/** Gráfico de barras de ingresos (diarios o mensuales) en SVG plano (sin dependencias). */
export function RevenueChart({
  data,
  granularidad = "dia",
}: {
  /** fecha: YYYY-MM-DD (por día) o YYYY-MM (por mes) */
  data: { fecha: string; total: number }[];
  granularidad?: "dia" | "mes";
}) {
  const porMes = granularidad === "mes";
  const corto = porMes ? monthFmt : dayFmt;
  const largo = porMes ? longMonthFmt : longDayFmt;
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(Math.floor(entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = data.reduce((s, d) => s + d.total, 0);
  const maxPoint = data.reduce<{ fecha: string; total: number } | null>(
    (m, d) => (!m || d.total > m.total ? d : m),
    null,
  );
  const yMax = niceMax(maxPoint?.total ?? 0);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * yMax);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.max(2, Math.min(28, slot * 0.68));
  const labelEvery = porMes ? (width < 480 ? 3 : width < 800 ? 2 : 1) : width < 480 ? 7 : width < 800 ? 5 : 3;
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

  const active = hover != null ? data[hover] : null;
  const unidad = porMes ? "meses" : "días";
  const summary = `Ingresos de los últimos ${data.length} ${unidad}. Total ${formatPEN(total)}.${
    maxPoint && maxPoint.total > 0 ? ` ${porMes ? "Mes" : "Día"} más alto: ${largo.format(toDate(maxPoint.fecha))} con ${formatPEN(maxPoint.total)}.` : ""
  }`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2" aria-live="polite">
        <p className="text-sm text-muted">
          {active ? (
            <>
              <span className="capitalize">{largo.format(toDate(active.fecha))}</span>
              {" · "}
              <span className="font-medium tabular-nums text-ink">{formatPEN(active.total)}</span>
            </>
          ) : (
            <>
              Total {data.length} {unidad}: <span className="font-medium tabular-nums text-ink">{formatPEN(total)}</span>
            </>
          )}
        </p>
      </div>
      <div ref={ref} className="w-full" style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            role="img"
            aria-labelledby={`${titleId} ${descId}`}
            className="block select-none"
            onMouseLeave={() => setHover(null)}
          >
            <title id={titleId}>{porMes ? "Ingresos mensuales (S/)" : "Ingresos diarios (S/)"}</title>
            <desc id={descId}>{summary}</desc>

            {/* Rejilla y eje Y */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(t)}
                  y2={y(t)}
                  stroke="var(--line)"
                  strokeDasharray={t === 0 ? undefined : "3 3"}
                />
                <text
                  x={PAD.left - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--subtle)"
                  className="tabular-nums"
                >
                  {formatPENCompact(t)}
                </text>
              </g>
            ))}

            {/* Barras */}
            {data.map((d, i) => {
              const cx = PAD.left + slot * i + slot / 2;
              const h = Math.max(d.total > 0 ? 2 : 0, y(0) - y(d.total));
              const isActive = hover === i;
              const label = `${corto.format(toDate(d.fecha))}: ${formatPEN(d.total)}`;
              return (
                <g key={d.fecha} onMouseEnter={() => setHover(i)}>
                  {/* Zona de hover de toda la columna */}
                  <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={plotH} fill="transparent">
                    <title>{label}</title>
                  </rect>
                  <rect
                    x={cx - barW / 2}
                    y={y(0) - h}
                    width={barW}
                    height={h}
                    rx={Math.min(3, barW / 3)}
                    fill="#059669"
                    opacity={hover == null || isActive ? 1 : 0.45}
                    className="transition-opacity"
                    pointerEvents="none"
                  />
                  {/* Etiquetas espaciadas contando desde hoy (la última siempre visible) */}
                  {(data.length - 1 - i) % labelEvery === 0 && (
                    <text
                      x={cx}
                      y={HEIGHT - 8}
                      textAnchor="middle"
                      fontSize="11"
                      fill={isActive ? "var(--ink)" : "var(--subtle)"}
                    >
                      {corto.format(toDate(d.fecha))}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
