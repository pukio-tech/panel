"use client";

import { useState, type FormEvent } from "react";
import type { GymEmpresaDetalle, GymSuscripcion } from "@/lib/gym-types";
import { gymApi } from "@/lib/gym-api";
import { formatDate, formatPEN } from "@/lib/gym-utils";
import { useGymData } from "@/lib/hooks/useGymData";
import { Alert, Badge, Button, Field, Input, Skeleton, Switch, useToast } from "@/components/ui";
import { CobrosTabla, NuevoCobroBoton, nombreMes } from "./cobranza";
import { errorMessage, SectionCard } from "./shared";

function SuscripcionForm({ empresa, s, onSaved }: { empresa: GymEmpresaDetalle; s: GymSuscripcion; onSaved: (s: GymSuscripcion) => void }) {
  const toast = useToast();
  const [precio, setPrecio] = useState(String(s.precioMensual));
  const [aplicaIgv, setAplicaIgv] = useState(s.aplicaIgv);
  const [diaCobro, setDiaCobro] = useState(String(s.diaCobro));
  const [diasCredito, setDiasCredito] = useState(String(s.diasCredito));
  const [inicio, setInicio] = useState(s.fechaInicio.slice(0, 7));
  const [activo, setActivo] = useState(s.configurada ? s.activo : true);
  const [notas, setNotas] = useState(s.notas ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monto = Number(precio);
  const total = monto > 0 ? Math.round(monto * (aplicaIgv ? 1.18 : 1) * 100) / 100 : 0;
  const precioError = precio === "" || !(monto >= 0) ? "Monto inválido." : undefined;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (precioError) return;
    setSaving(true);
    setError(null);
    try {
      const res = await gymApi.patch<{ data: GymSuscripcion }>(`empresas/${empresa.id}/suscripcion`, {
        precioMensual: monto,
        aplicaIgv,
        diaCobro: Number(diaCobro),
        diasCredito: Number(diasCredito),
        fechaInicio: `${inicio}-01`,
        activo,
        notas: notas.trim() || null,
      });
      toast(activo ? `Cobro mensual de ${formatPEN(res.data.totalMensual)} activo para ${empresa.nombre}.` : "Cobro mensual pausado.");
      onSaved(res.data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo guardar el cobro mensual."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate>
      <SectionCard
        title="Cobro mensual"
        description={
          s.configurada ? (
            <>
              Plan {s.plan} · {s.activo ? <Badge tone="success" dot>Activo</Badge> : <Badge tone="neutral">Pausado</Badge>}
              {s.fechaModificacion && <span className="ml-2 text-xs">Actualizado {formatDate(s.fechaModificacion)}</span>}
            </>
          ) : (
            `Aún no se le cobra a ${empresa.nombre}. Sugerido según su plan ${s.plan}.`
          )
        }
        footer={
          <Button type="submit" loading={saving}>
            {s.configurada ? "Guardar cambios" : "Activar cobro mensual"}
          </Button>
        }
      >
        <div className="space-y-5">
          {error && <Alert>{error}</Alert>}
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Mensualidad sin IGV (S/)" htmlFor="sus-precio" required error={precioError} hint={total > 0 ? `Total ${formatPEN(total)} al mes` : undefined}>
              <Input
                id="sus-precio"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                className="tabular-nums"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </Field>
            <Field label="Día de cobro (1-28)" htmlFor="sus-dia" hint="Día en que se emite la mensualidad.">
              <Input
                id="sus-dia"
                inputMode="numeric"
                className="tabular-nums"
                value={diaCobro}
                onChange={(e) => setDiaCobro(String(Math.min(28, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))))}
              />
            </Field>
            <Field label="Días para pagar" htmlFor="sus-credito" hint="Desde la emisión.">
              <Input
                id="sus-credito"
                inputMode="numeric"
                className="tabular-nums"
                value={diasCredito}
                onChange={(e) => setDiasCredito(String(Math.min(60, Number(e.target.value.replace(/\D/g, "")) || 0)))}
              />
            </Field>
            <Field label="Primer mes que se cobra" htmlFor="sus-inicio" hint={nombreMes(inicio)}>
              <Input id="sus-inicio" type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </Field>
            <Field label="Notas" htmlFor="sus-notas" className="sm:col-span-2">
              <Input id="sus-notas" maxLength={255} value={notas} placeholder="Ej. Precio especial por 12 meses" onChange={(e) => setNotas(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Switch id="sus-igv" checked={aplicaIgv} onChange={setAplicaIgv} label="Aplicar IGV (18 %)" />
            <Switch
              id="sus-activo"
              checked={activo}
              onChange={setActivo}
              label="Emitir mensualidades"
              description="Al activarlo se emite la del mes en curso si corresponde."
            />
          </div>
        </div>
      </SectionCard>
    </form>
  );
}

/** Pestaña Cobranza del detalle de la empresa: cobro mensual y sus cobros con trazabilidad. */
export function CobranzaEmpresa({ empresa }: { empresa: GymEmpresaDetalle }) {
  const [version, setVersion] = useState(0);
  const { data, setData, error, initialLoading } = useGymData<{ data: GymSuscripcion }>(`empresas/${empresa.id}/suscripcion`);

  return (
    <div className="space-y-6">
      {error && <Alert>{error.message}</Alert>}
      {initialLoading && !data ? (
        <Skeleton className="h-[300px] w-full rounded-xl" />
      ) : data ? (
        <SuscripcionForm
          key={`${data.data.configurada}-${data.data.fechaModificacion}`}
          empresa={empresa}
          s={data.data}
          onSaved={(s) => {
            setData({ data: s });
            setVersion((v) => v + 1);
          }}
        />
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Cobros de {empresa.nombre}</h2>
          <NuevoCobroBoton empresaId={empresa.id} onCreated={() => setVersion((v) => v + 1)} />
        </div>
        <CobrosTabla empresaId={empresa.id} version={version} />
      </section>
    </div>
  );
}
