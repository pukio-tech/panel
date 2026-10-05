"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { GymCotizacion, GymCotizacionInput, GymCotizacionItem, GymEmpresaResumen } from "@/lib/gym-types";
import { gymApi } from "@/lib/gym-api";
import { formatPEN, totalesCotizacion } from "@/lib/gym-utils";
import { useGymData } from "@/lib/hooks/useGymData";
import { cn } from "@/lib/utils";
import { Alert, Button, Field, Input, Select, Switch, Textarea, useToast } from "@/components/ui";
import { PlusIcon } from "@/components/icons";
import { errorMessage, useGymPlanes } from "./shared";
import { hoyISO } from "./cobranza";

/** Servicios únicos frecuentes (del cotizador), para agregarlos con un clic. */
const EXTRAS: GymCotizacionItem[] = [
  { tipo: "UNICO", descripcion: "Capacitación presencial", cantidad: 1, precioUnitario: 195 },
  { tipo: "UNICO", descripcion: "Migración de datos a la plataforma", cantidad: 1, precioUnitario: 390 },
  { tipo: "MENSUAL", descripcion: "Dominio propio .pe / .com.pe (renovación incluida)", cantidad: 1, precioUnitario: 15 },
];

const VACIA: GymCotizacionInput = {
  fecha: hoyISO(),
  validezDias: 15,
  empresaId: null,
  clienteNombre: "",
  clienteDocumento: null,
  contacto: null,
  telefono: null,
  email: null,
  planId: null,
  aplicaIgv: true,
  primeraMensualidadAlInicio: true,
  descuentoMensualPct: 0,
  descuentoUnicoPct: 0,
  notas: null,
  items: [],
};

const deCotizacion = (c: GymCotizacion): GymCotizacionInput => ({
  fecha: c.fecha,
  validezDias: c.validezDias,
  empresaId: c.empresa?.id ?? null,
  clienteNombre: c.clienteNombre,
  clienteDocumento: c.clienteDocumento,
  contacto: c.contacto,
  telefono: c.telefono,
  email: c.email,
  planId: c.plan?.id ?? null,
  aplicaIgv: c.aplicaIgv,
  primeraMensualidadAlInicio: c.primeraMensualidadAlInicio,
  descuentoMensualPct: c.descuentoMensualPct,
  descuentoUnicoPct: c.descuentoUnicoPct,
  notas: c.notas,
  items: c.items.map(({ tipo, descripcion, cantidad, precioUnitario }) => ({ tipo, descripcion, cantidad, precioUnitario })),
});

/** Sección del formulario con el título arriba (deja todo el ancho a la tabla de ítems). */
function Bloque({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Linea({ label, valor, fuerte, negativo }: { label: string; valor: number; fuerte?: boolean; negativo?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 text-sm", fuerte ? "font-semibold text-ink" : "text-muted")}>
      <span>{label}</span>
      <span className="tabular-nums">{negativo ? `− ${formatPEN(valor)}` : formatPEN(valor)}</span>
    </div>
  );
}

/** Formulario de cotización con totales en vivo (mismo cálculo que el Excel y el servidor). */
export function CotizacionForm({ cotizacion, onSaved }: { cotizacion?: GymCotizacion; onSaved: (c: GymCotizacion) => void }) {
  const toast = useToast();
  const { planes } = useGymPlanes();
  const empresas = useGymData<{ data: GymEmpresaResumen[] }>("empresas");
  const [v, setV] = useState<GymCotizacionInput>(() => (cotizacion ? deCotizacion(cotizacion) : VACIA));
  const [enviado, setEnviado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof GymCotizacionInput>(k: K, valor: GymCotizacionInput[K]) => setV((x) => ({ ...x, [k]: valor }));
  const setItem = (i: number, cambio: Partial<GymCotizacionItem>) =>
    setV((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, ...cambio } : it)) }));
  const t = totalesCotizacion(v);
  const plan = planes.find((p) => p.id === v.planId);

  const errores = enviado
    ? {
        clienteNombre: v.clienteNombre.trim().length >= 2 ? undefined : "Ingresa el nombre del cliente.",
        clienteDocumento: !v.clienteDocumento || /^(\d{8}|\d{11})$/.test(v.clienteDocumento) ? undefined : "DNI (8) o RUC (11) dígitos.",
        items: v.items.length && v.items.every((i) => i.descripcion.trim().length >= 2 && i.cantidad >= 1 && i.precioUnitario >= 0)
          ? undefined
          : "Agrega al menos un ítem con descripción, cantidad y precio.",
      }
    : {};

  /** Elegir un cliente existente rellena sus datos. */
  function elegirEmpresa(id: string) {
    const e = empresas.data?.data.find((x) => String(x.id) === id);
    setV((x) => ({
      ...x,
      empresaId: e ? e.id : null,
      clienteNombre: e ? e.nombre : x.clienteNombre,
      clienteDocumento: e?.ruc ?? x.clienteDocumento,
      planId: x.planId ?? (e ? (planes.find((p) => p.codigo === e.plan)?.id ?? null) : null),
    }));
  }

  /** Carga la mensualidad y la implementación del plan (reemplaza los ítems del plan anterior). */
  function cargarPlan() {
    if (!plan) return;
    const delPlan: GymCotizacionItem[] = [
      { tipo: "MENSUAL", descripcion: `Suscripción mensual Gym Manager – Plan ${plan.nombre}`, cantidad: 1, precioUnitario: plan.precioMensual },
    ];
    if (plan.precioImplementacion > 0) {
      delPlan.push({
        tipo: "UNICO",
        descripcion: `Implementación, configuración inicial y puesta en marcha – Plan ${plan.nombre}`,
        cantidad: 1,
        precioUnitario: plan.precioImplementacion,
      });
    }
    setV((x) => ({ ...x, items: [...delPlan, ...x.items.filter((i) => !/– Plan /.test(i.descripcion))] }));
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setEnviado(true);
    if (v.clienteNombre.trim().length < 2 || !v.items.length || v.items.some((i) => i.descripcion.trim().length < 2)) {
      toast("Revisa los campos marcados.", "error");
      return;
    }
    setSaving(true);
    setError(null);
    const body: GymCotizacionInput = {
      ...v,
      clienteNombre: v.clienteNombre.trim(),
      items: v.items.map((i) => ({ ...i, descripcion: i.descripcion.trim(), precioUnitario: Number(i.precioUnitario) || 0 })),
    };
    try {
      const res = cotizacion
        ? await gymApi.patch<{ data: GymCotizacion }>(`cotizaciones/${cotizacion.id}`, body)
        : await gymApi.post<{ data: GymCotizacion }>("cotizaciones", body);
      toast(cotizacion ? `Cotización ${res.data.numero} actualizada.` : `Cotización ${res.data.numero} creada.`);
      onSaved(res.data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo guardar la cotización."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        {error && <Alert title="No se pudo guardar">{error}</Alert>}

        <Bloque title="Cliente" description="Un gimnasio existente o un prospecto (se vincula a una empresa al aceptarla).">
          <Field label="Cliente existente" htmlFor="ct-empresa" className="sm:col-span-2" hint="Opcional: rellena sus datos.">
            <Select id="ct-empresa" value={v.empresaId ?? ""} onChange={(e) => elegirEmpresa(e.target.value)}>
              <option value="">Prospecto (aún no es cliente)</option>
              {(empresas.data?.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Razón social / nombre" htmlFor="ct-nombre" required error={errores.clienteNombre} className="sm:col-span-2">
            <Input id="ct-nombre" maxLength={150} value={v.clienteNombre} onChange={(e) => set("clienteNombre", e.target.value)} />
          </Field>
          <Field label="RUC / DNI" htmlFor="ct-doc" error={errores.clienteDocumento}>
            <Input
              id="ct-doc"
              inputMode="numeric"
              maxLength={11}
              className="font-mono"
              value={v.clienteDocumento ?? ""}
              onChange={(e) => set("clienteDocumento", e.target.value.replace(/\D/g, "") || null)}
            />
          </Field>
          <Field label="Contacto" htmlFor="ct-contacto">
            <Input id="ct-contacto" maxLength={150} value={v.contacto ?? ""} placeholder="Nombre del encargado" onChange={(e) => set("contacto", e.target.value || null)} />
          </Field>
          <Field label="Teléfono" htmlFor="ct-tel">
            <Input id="ct-tel" type="tel" maxLength={30} value={v.telefono ?? ""} onChange={(e) => set("telefono", e.target.value || null)} />
          </Field>
          <Field label="Correo" htmlFor="ct-email">
            <Input id="ct-email" type="email" maxLength={150} value={v.email ?? ""} onChange={(e) => set("email", e.target.value || null)} />
          </Field>
        </Bloque>

        <Bloque title="Plan y ítems" description="Elige el plan para cargar su mensualidad e implementación, y agrega servicios adicionales.">
          <Field label="Plan propuesto" htmlFor="ct-plan">
            <Select id="ct-plan" value={v.planId ?? ""} onChange={(e) => set("planId", e.target.value ? Number(e.target.value) : null)}>
              <option value="">Sin plan</option>
              {planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} · {formatPEN(p.precioMensual)}/mes
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button variant="secondary" onClick={cargarPlan} disabled={!plan}>
              Cargar precios del plan
            </Button>
          </div>

          <div className="sm:col-span-2">
            <div className="overflow-hidden rounded-lg border border-line">
              <div className="hidden grid-cols-[110px_minmax(0,1fr)_70px_110px_100px_36px] gap-2 bg-canvas px-3 py-2 text-xs font-medium text-muted sm:grid">
                <span>Tipo</span>
                <span>Descripción</span>
                <span className="text-right">Cant.</span>
                <span className="text-right">P. unitario</span>
                <span className="text-right">Importe</span>
                <span />
              </div>
              {v.items.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Aún no hay ítems. Carga el plan o agrega uno.</p>}
              <ul className="divide-y divide-line">
                {v.items.map((it, i) => (
                  <li key={i} className="grid grid-cols-2 gap-2 px-3 py-2.5 sm:grid-cols-[110px_minmax(0,1fr)_70px_110px_100px_36px] sm:items-center">
                    <Select aria-label="Tipo" value={it.tipo} onChange={(e) => setItem(i, { tipo: e.target.value as GymCotizacionItem["tipo"] })}>
                      <option value="MENSUAL">Mensual</option>
                      <option value="UNICO">Único</option>
                    </Select>
                    <Input
                      aria-label="Descripción"
                      className="col-span-2 sm:col-span-1"
                      maxLength={255}
                      value={it.descripcion}
                      onChange={(e) => setItem(i, { descripcion: e.target.value })}
                    />
                    <Input
                      aria-label="Cantidad"
                      inputMode="numeric"
                      className="text-right tabular-nums"
                      value={String(it.cantidad)}
                      onChange={(e) => setItem(i, { cantidad: Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1) })}
                    />
                    <Input
                      aria-label="Precio unitario"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      className="text-right tabular-nums"
                      value={String(it.precioUnitario)}
                      onChange={(e) => setItem(i, { precioUnitario: Number(e.target.value) })}
                    />
                    <span className="self-center text-right text-sm font-medium tabular-nums text-ink">{formatPEN(it.cantidad * (it.precioUnitario || 0))}</span>
                    <button
                      type="button"
                      aria-label={`Quitar ${it.descripcion || "ítem"}`}
                      onClick={() => setV((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))}
                      className="justify-self-end rounded-md p-1.5 text-subtle transition-[color,transform] duration-150 hover:text-[#e5484d] active:scale-95"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {errores.items && <p className="mt-1.5 text-xs text-red-600">{errores.items}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setV((x) => ({ ...x, items: [...x.items, { tipo: "UNICO", descripcion: "", cantidad: 1, precioUnitario: 0 }] }))}
              >
                <PlusIcon width={14} height={14} /> Agregar ítem
              </Button>
              {EXTRAS.filter((x) => !v.items.some((i) => i.descripcion === x.descripcion)).map((x) => (
                <Button key={x.descripcion} variant="ghost" size="sm" onClick={() => setV((y) => ({ ...y, items: [...y.items, { ...x }] }))}>
                  + {x.descripcion.split(" (")[0]}
                </Button>
              ))}
            </div>
          </div>
        </Bloque>

        <Bloque title="Condiciones" description="Descuentos, IGV, cobro de la primera mensualidad y validez.">
          <Field label="Descuento mensual (%)" htmlFor="ct-dm">
            <Input
              id="ct-dm"
              type="number"
              min={0}
              max={100}
              step="0.5"
              className="tabular-nums"
              value={String(v.descuentoMensualPct)}
              onChange={(e) => set("descuentoMensualPct", Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            />
          </Field>
          <Field label="Descuento pagos únicos (%)" htmlFor="ct-du">
            <Input
              id="ct-du"
              type="number"
              min={0}
              max={100}
              step="0.5"
              className="tabular-nums"
              value={String(v.descuentoUnicoPct)}
              onChange={(e) => set("descuentoUnicoPct", Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
            />
          </Field>
          <Field label="Fecha" htmlFor="ct-fecha">
            <Input id="ct-fecha" type="date" value={v.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </Field>
          <Field label="Validez (días)" htmlFor="ct-validez">
            <Input
              id="ct-validez"
              inputMode="numeric"
              className="tabular-nums"
              value={String(v.validezDias)}
              onChange={(e) => set("validezDias", Math.min(180, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)))}
            />
          </Field>
          <div className="space-y-4 sm:col-span-2">
            <Switch id="ct-igv" checked={v.aplicaIgv} onChange={(x) => set("aplicaIgv", x)} label="Aplicar IGV (18 %)" />
            <Switch
              id="ct-primera"
              checked={v.primeraMensualidadAlInicio}
              onChange={(x) => set("primeraMensualidadAlInicio", x)}
              label="Cobrar la 1ra mensualidad al inicio"
              description="Se suma al pago inicial; el primer año queda en inicial + 11 mensualidades."
            />
          </div>
          <Field label="Notas" htmlFor="ct-notas" className="sm:col-span-2" hint="Aparecen en la cotización.">
            <Textarea id="ct-notas" rows={3} maxLength={1000} value={v.notas ?? ""} onChange={(e) => set("notas", e.target.value || null)} />
          </Field>
        </Bloque>
      </div>

      {/* Totales en vivo */}
      <aside className="min-w-0 xl:sticky xl:top-20">
        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Resumen</h2>
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Pago inicial</p>
            <Linea label="Pagos únicos" valor={t.unicoBruto} />
            {t.descuentoUnico > 0 && <Linea label={`Descuento ${v.descuentoUnicoPct}%`} valor={t.descuentoUnico} negativo />}
            {v.primeraMensualidadAlInicio && <Linea label="1ra mensualidad" valor={t.mensual.subtotal} />}
            {v.aplicaIgv && <Linea label="IGV 18%" valor={t.inicial.igv} />}
            <Linea label="Total al inicio" valor={t.inicial.total} fuerte />
          </div>
          <div className="mt-5 space-y-1.5 border-t border-line pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Mensualidad</p>
            <Linea label="Servicios mensuales" valor={t.mensualBruto} />
            {t.descuentoMensual > 0 && <Linea label={`Descuento ${v.descuentoMensualPct}%`} valor={t.descuentoMensual} negativo />}
            {v.aplicaIgv && <Linea label="IGV 18%" valor={t.mensual.igv} />}
            <Linea label={v.primeraMensualidadAlInicio ? "Desde el mes 2" : "Cada mes"} valor={t.mensual.total} fuerte />
          </div>
          <div className="mt-5 rounded-lg bg-canvas px-3 py-3">
            <Linea label="Total primer año" valor={t.anio1.total} fuerte />
            <p className="mt-1 text-xs text-muted">{v.aplicaIgv ? "Montos con IGV incluido." : "Montos sin IGV."}</p>
          </div>
          <Button type="submit" className="mt-5 w-full" loading={saving}>
            {cotizacion ? "Guardar cambios" : "Crear cotización"}
          </Button>
        </div>
      </aside>
    </form>
  );
}
