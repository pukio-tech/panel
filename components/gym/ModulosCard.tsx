"use client";

import { useState } from "react";
import type { GymEmpresaDetalle, GymEmpresaModulo } from "@/lib/gym-types";
import { gymApi } from "@/lib/gym-api";
import { cn } from "@/lib/utils";
import { Alert, Badge, useToast } from "@/components/ui";
import { errorMessage, SectionCard } from "./shared";

type Opcion = "plan" | "activar" | "desactivar";

const OPCIONES: { value: Opcion; label: string }[] = [
  { value: "plan", label: "Según plan" },
  { value: "activar", label: "Activado" },
  { value: "desactivar", label: "Desactivado" },
];

const opcionDe = (m: GymEmpresaModulo): Opcion => (m.ajuste === null ? "plan" : m.ajuste ? "activar" : "desactivar");
const ajusteDe = (o: Opcion) => (o === "plan" ? null : o === "activar");

function Estado({ m }: { m: GymEmpresaModulo }) {
  if (m.ajuste === null) {
    return m.activo ? (
      <Badge tone="success" dot>
        Incluido en el plan
      </Badge>
    ) : (
      <Badge tone="neutral">No incluido en el plan</Badge>
    );
  }
  return m.ajuste ? (
    <Badge tone="info" dot>
      Activado para esta empresa
    </Badge>
  ) : (
    <Badge tone="warning" dot>
      Desactivado para esta empresa
    </Badge>
  );
}

/** Control segmentado accesible (radiogroup) con indicador que se desliza entre opciones. */
function Segmentado({
  name,
  value,
  onChange,
  disabled,
  incluidoEnPlan,
}: {
  name: string;
  value: Opcion;
  onChange: (o: Opcion) => void;
  disabled?: boolean;
  incluidoEnPlan: boolean;
}) {
  const indice = OPCIONES.findIndex((o) => o.value === value);
  return (
    <div
      role="radiogroup"
      aria-label={`Estado del módulo ${name}`}
      className={cn("relative grid grid-cols-3 rounded-lg bg-surface-muted p-0.5", disabled && "opacity-60")}
    >
      {/* Indicador: solo transform, curva ease-in-out para movimiento en pantalla */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0.5 left-0.5 w-[calc((100%-4px)/3)] rounded-md bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-[var(--ease-in-out)] motion-reduce:transition-none"
        style={{ transform: `translateX(${indice * 100}%)` }}
      />
      {OPCIONES.map((o) => {
        const activa = o.value === value;
        // Aclara qué significa "Según plan" para este módulo
        const titulo = o.value === "plan" ? (incluidoEnPlan ? "El plan lo incluye" : "El plan no lo incluye") : undefined;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={activa}
            title={titulo}
            disabled={disabled}
            onClick={() => !activa && onChange(o.value)}
            className={cn(
              "relative z-10 h-8 rounded-md px-2 text-[13px] font-medium transition-[color,transform] duration-150 active:scale-[0.97] motion-reduce:active:scale-100",
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus",
              activa ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Módulos opcionales de la empresa. Cada uno sigue a su plan, o se activa / desactiva solo para
 * esta empresa (ej. un plan Básico con catálogo, o un Pro sin facturación). Se guarda al cambiar.
 */
export function ModulosCard({
  empresa,
  onSaved,
}: {
  empresa: GymEmpresaDetalle;
  onSaved: (empresa: GymEmpresaDetalle) => void;
}) {
  const toast = useToast();
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(m: GymEmpresaModulo, opcion: Opcion) {
    setError(null);
    setGuardando(m.codigo);
    try {
      const res = await gymApi.patch<{ data: GymEmpresaDetalle }>(`empresas/${empresa.id}`, {
        modulos: [{ codigo: m.codigo, activo: ajusteDe(opcion) }],
      });
      const nuevo = res.data.modulos.find((x) => x.codigo === m.codigo);
      toast(`${m.nombre}: ${nuevo?.activo ? "activo" : "inactivo"} para ${empresa.nombre}.`);
      onSaved(res.data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo cambiar el módulo."));
    } finally {
      setGuardando(null);
    }
  }

  const activos = empresa.modulos.filter((m) => m.activo).length;

  return (
    <SectionCard
      title="Módulos"
      description={
        <>
          Plan <span className="font-medium text-ink">{empresa.planNombre}</span> · {activos} de {empresa.modulos.length} módulos
          activos. El núcleo (socios, acceso, suscripciones, POS, inventario y caja) siempre está incluido. Los cambios se
          aplican al instante en el gimnasio.
        </>
      }
      flush
    >
      {error && (
        <div className="px-5 pt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <ul className="divide-y divide-line">
        {empresa.modulos.map((m) => (
          <li key={m.codigo} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_320px] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full transition-colors duration-200",
                    m.activo ? "bg-emerald-500" : "bg-line-strong",
                  )}
                />
                <h3 className="text-sm font-medium text-ink">{m.nombre}</h3>
                <Estado m={m} />
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{m.descripcion}</p>
            </div>
            <Segmentado
              name={m.nombre}
              value={opcionDe(m)}
              incluidoEnPlan={m.incluidoEnPlan}
              disabled={guardando !== null}
              onChange={(o) => cambiar(m, o)}
            />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
