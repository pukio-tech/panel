"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import type { GymCotizacion, GymEmpresaResumen } from "@/lib/gym-types";
import { gymApi } from "@/lib/gym-api";
import { formatDate, formatPEN, PUKIO_EMISOR } from "@/lib/gym-utils";
import { useGymData } from "@/lib/hooks/useGymData";
import { Alert, Button, ConfirmDialog, EmptyState, Field, Input, Menu, Modal, PageHeader, Select, Skeleton, Switch, useToast } from "@/components/ui";
import { CotizacionForm } from "@/components/gym/CotizacionForm";
import { COTIZACIONES, CONCEPTO_LABEL, EstadoCotizacionBadge, hoyISO } from "@/components/gym/cobranza";
import { errorMessage, GYM_EMPRESAS, useGymPlanes } from "@/components/gym/shared";

/* ------------------------------------------------------------------ */
/* Documento (lo que se imprime / guarda como PDF)                     */
/* ------------------------------------------------------------------ */

function Tabla({ filas, pie }: { filas: { descripcion: string; cantidad: number; precio: number }[]; pie: [string, number, boolean?][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs text-muted">
          <th className="py-2 font-medium">Descripción</th>
          <th className="w-16 py-2 text-right font-medium">Cant.</th>
          <th className="w-28 py-2 text-right font-medium">P. unitario</th>
          <th className="w-28 py-2 text-right font-medium">Importe</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={i} className="border-b border-line/70">
            <td className="py-2 pr-3 text-ink">{f.descripcion}</td>
            <td className="py-2 text-right tabular-nums">{f.cantidad}</td>
            <td className="py-2 text-right tabular-nums">{formatPEN(f.precio)}</td>
            <td className="py-2 text-right tabular-nums">{formatPEN(f.cantidad * f.precio)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        {pie.map(([l, v, fuerte]) => (
          <tr key={l}>
            <td colSpan={3} className={`pt-2 text-right ${fuerte ? "font-semibold text-ink" : "text-muted"}`}>
              {l}
            </td>
            <td className={`pt-2 text-right tabular-nums ${fuerte ? "font-semibold text-ink" : "text-muted"}`}>{formatPEN(v)}</td>
          </tr>
        ))}
      </tfoot>
    </table>
  );
}

function Documento({ c, caracteristicas }: { c: GymCotizacion; caracteristicas: string[] }) {
  const t = c.totales;
  const unicos = c.items.filter((i) => i.tipo === "UNICO").map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, precio: i.precioUnitario }));
  const mensuales = c.items.filter((i) => i.tipo === "MENSUAL").map((i) => ({ descripcion: i.descripcion, cantidad: i.cantidad, precio: i.precioUnitario }));
  const planNombre = c.plan ? `Plan ${c.plan.nombre}` : "Gym Manager";
  const inicial = [...unicos];
  if (c.primeraMensualidadAlInicio && t.mensual.subtotal > 0) {
    inicial.push({ descripcion: `Primera mensualidad – ${planNombre}`, cantidad: 1, precio: t.mensual.subtotal });
  }
  const igvL = (m: { igv: number }): [string, number][] => (c.aplicaIgv ? [["IGV (18%)", m.igv]] : []);

  return (
    <article className="print-area rounded-xl border border-line bg-surface p-8 text-ink sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
        <div>
          <p className="text-xl font-semibold tracking-tight">{PUKIO_EMISOR.nombre}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            {PUKIO_EMISOR.telefono} · {PUKIO_EMISOR.email}
            <br />
            {PUKIO_EMISOR.web}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Cotización</p>
          <p className="mt-1 font-mono text-lg font-semibold">{c.numero}</p>
          <p className="mt-1 text-[13px] text-muted">
            Fecha {formatDate(c.fecha)} · válida hasta {formatDate(c.venceEl)}
          </p>
        </div>
      </header>

      <section className="grid gap-1 border-b border-line py-5 text-sm sm:grid-cols-2">
        <p>
          <span className="text-muted">Cliente:</span> <span className="font-medium">{c.clienteNombre}</span>
        </p>
        {c.clienteDocumento && (
          <p>
            <span className="text-muted">{c.clienteDocumento.length === 11 ? "RUC" : "DNI"}:</span> {c.clienteDocumento}
          </p>
        )}
        {(c.contacto || c.telefono || c.email) && (
          <p className="sm:col-span-2">
            <span className="text-muted">Contacto:</span> {[c.contacto, c.telefono, c.email].filter(Boolean).join(" · ")}
          </p>
        )}
        {c.plan && (
          <p>
            <span className="text-muted">Plan propuesto:</span> <span className="font-medium">{planNombre}</span>
          </p>
        )}
      </section>

      {inicial.length > 0 && (
        <section className="pt-6">
          <h2 className="mb-2 text-sm font-semibold">1. Pago inicial (único)</h2>
          <Tabla
            filas={inicial}
            pie={[
              ...(t.descuentoUnico > 0 ? ([[`Descuento ${c.descuentoUnicoPct}%`, -t.descuentoUnico]] as [string, number][]) : []),
              ["Subtotal", t.inicial.subtotal],
              ...igvL(t.inicial),
              ["Total a pagar al inicio", t.inicial.total, true],
            ]}
          />
        </section>
      )}

      {mensuales.length > 0 && (
        <section className="pt-8">
          <h2 className="mb-2 text-sm font-semibold">2. Suscripción mensual</h2>
          <Tabla
            filas={mensuales}
            pie={[
              ...(t.descuentoMensual > 0 ? ([[`Descuento ${c.descuentoMensualPct}%`, -t.descuentoMensual]] as [string, number][]) : []),
              ["Subtotal", t.mensual.subtotal],
              ...igvL(t.mensual),
              ["Mensualidad", t.mensual.total, true],
            ]}
          />
          {caracteristicas.length > 0 && (
            <div className="mt-4">
              <p className="text-[13px] font-medium">Incluye:</p>
              <ul className="mt-1.5 grid gap-1 text-[13px] text-ink-soft sm:grid-cols-2">
                {caracteristicas.map((x) => (
                  <li key={x}>• {x}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="mt-8 rounded-lg bg-canvas p-4 text-sm">
        <h2 className="mb-2 font-semibold">Resumen de pagos</h2>
        <div className="grid gap-1.5">
          <p className="flex justify-between">
            <span className="text-muted">Pago inicial (único)</span>
            <span className="font-medium tabular-nums">{formatPEN(t.inicial.total)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-muted">Mensualidad {c.primeraMensualidadAlInicio ? "a partir del mes 2" : "desde el mes 1"}</span>
            <span className="font-medium tabular-nums">{formatPEN(t.mensual.total)}</span>
          </p>
          <p className="flex justify-between border-t border-line pt-1.5 font-semibold">
            <span>Total primer año</span>
            <span className="tabular-nums">{formatPEN(t.anio1.total)}</span>
          </p>
        </div>
        <p className="mt-2 text-xs text-muted">{c.aplicaIgv ? "Montos con IGV incluido." : "Montos sin IGV."}</p>
      </section>

      <section className="mt-6 text-[13px] leading-relaxed text-muted">
        <h2 className="mb-1 font-semibold text-ink">Condiciones</h2>
        <ul className="space-y-0.5">
          <li>• Precios en soles (S/). Cotización válida por {c.validezDias} días desde su emisión.</li>
          <li>• El pago inicial se realiza antes de la implementación. La mensualidad se paga por adelantado cada mes.</li>
          <li>• Medios de pago: {PUKIO_EMISOR.mediosPago}.</li>
          <li>• Incluye actualizaciones del software y mantenimiento de la plataforma sin costo adicional.</li>
        </ul>
        {c.notas && <p className="mt-3 whitespace-pre-line text-ink-soft">{c.notas}</p>}
      </section>

      <footer className="mt-14 grid grid-cols-2 gap-10 text-center text-[13px] text-muted">
        <div className="border-t border-line-strong pt-2">{PUKIO_EMISOR.nombre}</div>
        <div className="border-t border-line-strong pt-2">Conformidad del cliente</div>
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Aceptar                                                             */
/* ------------------------------------------------------------------ */

function AceptarModal({ c, open, onClose, onDone }: { c: GymCotizacion; open: boolean; onClose: () => void; onDone: (c: GymCotizacion) => void }) {
  const toast = useToast();
  const empresas = useGymData<{ data: GymEmpresaResumen[] }>(open ? "empresas" : null);
  const [empresaId, setEmpresaId] = useState(c.empresa ? String(c.empresa.id) : "");
  const [diaCobro, setDiaCobro] = useState("1");
  const [diasCredito, setDiasCredito] = useState("5");
  const [inicio, setInicio] = useState(hoyISO().slice(0, 7));
  const [aplicarPlan, setAplicarPlan] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function aceptar(e: FormEvent) {
    e.preventDefault();
    if (!empresaId) return setError("Elige la empresa (gimnasio). Si es nuevo, créalo primero en Empresas.");
    setSaving(true);
    setError(null);
    try {
      const res = await gymApi.post<{ data: GymCotizacion }>(`cotizaciones/${c.id}/aceptar`, {
        empresaId: Number(empresaId),
        diaCobro: Number(diaCobro),
        diasCredito: Number(diasCredito),
        inicio,
        aplicarPlan,
      });
      toast(`Cotización ${c.numero} aceptada: se configuró el cobro mensual y se emitió el pago inicial.`);
      onDone(res.data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo aceptar la cotización."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={`Aceptar ${c.numero}`}
      description={`Se configurará la mensualidad de ${formatPEN(c.totales.mensual.total)} y se emitirá el cobro inicial de ${formatPEN(c.totales.inicial.total)}${c.primeraMensualidadAlInicio ? " (incluye la 1ra mensualidad)" : ""}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="aceptar-cot" loading={saving}>
            Aceptar y generar cobros
          </Button>
        </>
      }
    >
      <form id="aceptar-cot" onSubmit={aceptar} noValidate className="grid gap-4 sm:grid-cols-2">
        {error && (
          <div className="sm:col-span-2">
            <Alert>{error}</Alert>
          </div>
        )}
        <Field label="Empresa (gimnasio)" htmlFor="ac-empresa" required className="sm:col-span-2">
          <Select id="ac-empresa" value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="">{empresas.initialLoading ? "Cargando…" : "Elige la empresa…"}</option>
            {(empresas.data?.data ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Primer mes" htmlFor="ac-inicio" required>
          <Input id="ac-inicio" type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </Field>
        <Field label="Día de cobro (1-28)" htmlFor="ac-dia" hint="Día en que se emite cada mensualidad.">
          <Input id="ac-dia" inputMode="numeric" value={diaCobro} onChange={(e) => setDiaCobro(String(Math.min(28, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1))))} />
        </Field>
        <Field label="Días para pagar" htmlFor="ac-credito">
          <Input id="ac-credito" inputMode="numeric" value={diasCredito} onChange={(e) => setDiasCredito(String(Math.min(60, Number(e.target.value.replace(/\D/g, "")) || 0)))} />
        </Field>
        {c.plan && (
          <div className="flex items-end pb-2">
            <Switch id="ac-plan" checked={aplicarPlan} onChange={setAplicarPlan} label={`Cambiar al plan ${c.plan.nombre}`} description="Ajusta límites y módulos." />
          </div>
        )}
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function CotizacionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data, setData, error, initialLoading } = useGymData<{ data: GymCotizacion }>(/^\d+$/.test(id) ? `cotizaciones/${id}` : null);
  const { planes } = useGymPlanes();
  const [editando, setEditando] = useState(false);
  const [aceptar, setAceptar] = useState(false);
  const [eliminar, setEliminar] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const c = data?.data;

  async function cambiarEstado(estado: "ENVIADA" | "RECHAZADA" | "BORRADOR") {
    if (!c) return;
    setTrabajando(true);
    try {
      const res = await gymApi.patch<{ data: GymCotizacion }>(`cotizaciones/${c.id}`, { estado });
      setData({ data: res.data });
      toast(estado === "ENVIADA" ? "Marcada como enviada." : estado === "RECHAZADA" ? "Marcada como rechazada." : "Vuelve a borrador.");
    } catch (err) {
      toast(errorMessage(err, "No se pudo cambiar el estado."), "error");
    } finally {
      setTrabajando(false);
    }
  }

  async function borrar() {
    if (!c) return;
    setTrabajando(true);
    try {
      await gymApi.delete(`cotizaciones/${c.id}`);
      toast(`Cotización ${c.numero} eliminada.`);
      router.replace(COTIZACIONES);
    } catch (err) {
      toast(errorMessage(err, "No se pudo eliminar."), "error");
      setTrabajando(false);
    }
  }

  if (error?.status === 404 || !/^\d+$/.test(id)) {
    return (
      <>
        <PageHeader title="Cotización no encontrada" back={{ href: COTIZACIONES, label: "Cotizaciones" }} />
        <EmptyState title="La cotización no existe" action={<Link href={COTIZACIONES}>Ver cotizaciones</Link>} />
      </>
    );
  }

  if (!c) {
    return (
      <>
        <PageHeader title={initialLoading ? "Cargando…" : "Cotización"} back={{ href: COTIZACIONES, label: "Cotizaciones" }} />
        {error ? <Alert>{error.message}</Alert> : <Skeleton className="h-[640px] w-full rounded-xl" />}
      </>
    );
  }

  const caracteristicas = planes.find((p) => p.id === c.plan?.id)?.caracteristicas ?? [];
  const aceptada = c.estado === "ACEPTADA";

  if (editando) {
    return (
      <>
        <PageHeader title={`Editar ${c.numero}`} back={{ href: COTIZACIONES, label: "Cotizaciones" }} />
        <CotizacionForm
          cotizacion={c}
          onSaved={(nueva) => {
            setData({ data: nueva });
            setEditando(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={c.numero}
        back={{ href: COTIZACIONES, label: "Cotizaciones" }}
        subtitle={
          <>
            <EstadoCotizacionBadge c={c} />
            <span>
              {c.clienteNombre} · {formatPEN(c.totales.inicial.total)} al inicio · {formatPEN(c.totales.mensual.total)}/mes
            </span>
          </>
        }
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              Imprimir / PDF
            </Button>
            {!aceptada && (
              <>
                <Button variant="secondary" onClick={() => setEditando(true)}>
                  Editar
                </Button>
                {c.estado !== "RECHAZADA" && <Button onClick={() => setAceptar(true)}>Aceptar</Button>}
                <Menu
                  label="Más acciones"
                  items={[
                    ...(c.estado === "BORRADOR" ? [{ label: "Marcar como enviada", onSelect: () => cambiarEstado("ENVIADA"), disabled: trabajando }] : []),
                    ...(c.estado !== "RECHAZADA"
                      ? [{ label: "Marcar como rechazada", onSelect: () => cambiarEstado("RECHAZADA"), disabled: trabajando }]
                      : [{ label: "Volver a borrador", onSelect: () => cambiarEstado("BORRADOR"), disabled: trabajando }]),
                    { label: "Eliminar", danger: true, onSelect: () => setEliminar(true) },
                  ]}
                />
              </>
            )}
          </div>
        }
      />

      {aceptada && (
        <div className="no-print mb-6">
          <Alert title="Cotización aceptada">
            {c.empresa ? (
              <>
                Vinculada a{" "}
                <Link href={`${GYM_EMPRESAS}/${c.empresa.id}?tab=cobranza`} className="font-medium underline underline-offset-2">
                  {c.empresa.nombre}
                </Link>
                .{" "}
              </>
            ) : null}
            Cobros generados:{" "}
            {c.cobros.length
              ? c.cobros.map((x) => `${CONCEPTO_LABEL[x.concepto]} ${formatPEN(x.total)}${x.estado === "PAGADO" ? " (pagado)" : ""}`).join(" · ")
              : "ninguno"}
            .
          </Alert>
        </div>
      )}

      <Documento c={c} caracteristicas={caracteristicas} />

      <AceptarModal
        key={c.id}
        c={c}
        open={aceptar}
        onClose={() => setAceptar(false)}
        onDone={(x) => {
          setAceptar(false);
          setData({ data: x });
        }}
      />
      <ConfirmDialog
        open={eliminar}
        onCancel={() => setEliminar(false)}
        onConfirm={borrar}
        loading={trabajando}
        danger
        title={`Eliminar ${c.numero}`}
        description="La cotización se borra definitivamente."
        confirmLabel="Eliminar"
      />
    </>
  );
}
