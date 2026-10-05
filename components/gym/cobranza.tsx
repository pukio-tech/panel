"use client";

import { useEffect, useState, type FormEvent } from "react";
import type {
  GymCobro,
  GymCobroDetalle,
  GymConceptoCobro,
  GymCotizacion,
  GymEmpresaResumen,
  GymEstadoCotizacion,
  GymMetodoPago,
  GymPaginado,
  GymSituacionCobro,
} from "@/lib/gym-types";
import { gymApi } from "@/lib/gym-api";
import { formatDate, formatDateTime, formatPEN } from "@/lib/gym-utils";
import { useGymData } from "@/lib/hooks/useGymData";
import { cn } from "@/lib/utils";
import {
  Alert,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Field,
  FilterPills,
  Input,
  Menu,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Switch,
  Toolbar,
  useToast,
  type BadgeTone,
  type Column,
} from "@/components/ui";
import { PlusIcon, ReceiptIcon, SearchIcon } from "@/components/icons";
import { errorMessage } from "./shared";

/* ------------------------------------------------------------------ */
/* Etiquetas y formato                                                 */
/* ------------------------------------------------------------------ */

export const CONCEPTO_LABEL: Record<GymConceptoCobro, string> = {
  MENSUALIDAD: "Mensualidad",
  IMPLEMENTACION: "Implementación",
  SERVICIO: "Servicio",
  OTRO: "Otro",
};

export const METODO_LABEL: Record<GymMetodoPago, string> = {
  TRANSFERENCIA: "Transferencia",
  YAPE: "Yape",
  PLIN: "Plin",
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

const SITUACION: Record<GymSituacionCobro, { label: string; tone: BadgeTone }> = {
  PENDIENTE: { label: "Pendiente", tone: "warning" },
  VENCIDO: { label: "Vencido", tone: "danger" },
  PAGADO: { label: "Pagado", tone: "success" },
  ANULADO: { label: "Anulado", tone: "neutral" },
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-10" o "2026-10-01" → "octubre 2026" */
export function nombreMes(valor: string | null | undefined) {
  if (!valor) return "—";
  const [a, m] = valor.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
}

export const hoyISO = () => {
  // Fecha calendario de Lima (UTC-5)
  return new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
};

export function SituacionBadge({ cobro }: { cobro: Pick<GymCobro, "situacion" | "saldo" | "pagado" | "diasVencido"> }) {
  const s = SITUACION[cobro.situacion];
  const parcial = cobro.situacion !== "PAGADO" && cobro.situacion !== "ANULADO" && cobro.pagado > 0;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone={s.tone} dot>
        {s.label}
        {cobro.situacion === "VENCIDO" && cobro.diasVencido > 0 ? ` · ${cobro.diasVencido} d` : ""}
      </Badge>
      {parcial && <Badge tone="info">Pago parcial</Badge>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Registrar pago                                                      */
/* ------------------------------------------------------------------ */

export function RegistrarPagoModal({
  cobro,
  onClose,
  onSaved,
}: {
  cobro: GymCobro | null;
  onClose: () => void;
  onSaved: (c: GymCobroDetalle) => void;
}) {
  const toast = useToast();
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [metodo, setMetodo] = useState<GymMetodoPago>("TRANSFERENCIA");
  const [referencia, setReferencia] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrir: monto = saldo pendiente
  const [abiertoPara, setAbiertoPara] = useState<number | null>(null);
  if (cobro && abiertoPara !== cobro.id) {
    setAbiertoPara(cobro.id);
    setMonto(cobro.saldo.toFixed(2));
    setFecha(hoyISO());
    setMetodo("TRANSFERENCIA");
    setReferencia("");
    setNotas("");
    setError(null);
  }
  if (!cobro && abiertoPara !== null) setAbiertoPara(null);

  const valor = Number(monto);
  const montoError =
    !cobro || monto === "" ? undefined : !(valor > 0) ? "Monto mayor a cero." : valor > cobro.saldo + 0.005 ? `Máximo ${formatPEN(cobro.saldo)}.` : undefined;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!cobro || montoError || !(valor > 0)) return;
    setError(null);
    setSaving(true);
    try {
      const res = await gymApi.post<{ data: GymCobroDetalle }>(`cobranza/cobros/${cobro.id}/pagos`, {
        fecha,
        monto: valor,
        metodo,
        referencia: referencia.trim() || null,
        notas: notas.trim() || null,
      });
      toast(res.data.estado === "PAGADO" ? `Cobro #${cobro.id} pagado por completo.` : `Pago parcial registrado. Saldo: ${formatPEN(res.data.saldo)}.`);
      onSaved(res.data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo registrar el pago."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={cobro !== null}
      onClose={() => !saving && onClose()}
      title="Registrar pago"
      description={cobro ? `${cobro.empresa.nombre} · ${cobro.descripcion}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="pago-form" loading={saving} disabled={!!montoError || !(valor > 0)}>
            Registrar {valor > 0 ? formatPEN(valor) : "pago"}
          </Button>
        </>
      }
    >
      {cobro && (
        <form id="pago-form" onSubmit={guardar} noValidate className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <div className="grid grid-cols-3 gap-3 rounded-lg bg-canvas px-3 py-2.5 text-center">
            {[
              ["Total", cobro.total],
              ["Pagado", cobro.pagado],
              ["Saldo", cobro.saldo],
            ].map(([l, v]) => (
              <div key={l as string}>
                <p className="text-xs text-muted">{l}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{formatPEN(v as number)}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Monto (S/)" htmlFor="pago-monto" required error={montoError}>
              <div className="flex gap-2">
                <Input
                  id="pago-monto"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  className="min-w-0 flex-1 tabular-nums"
                  value={monto}
                  autoFocus
                  aria-invalid={Boolean(montoError) || undefined}
                  onChange={(e) => setMonto(e.target.value)}
                />
                {valor !== cobro.saldo && (
                  <Button variant="ghost" size="sm" className="h-10" onClick={() => setMonto(cobro.saldo.toFixed(2))}>
                    Saldo
                  </Button>
                )}
              </div>
            </Field>
            <Field label="Fecha de pago" htmlFor="pago-fecha" required>
              <Input id="pago-fecha" type="date" max={hoyISO()} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </Field>
            <Field label="Método" htmlFor="pago-metodo" required>
              <Select id="pago-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value as GymMetodoPago)}>
                {Object.entries(METODO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="N° de operación" htmlFor="pago-ref" hint="Voucher, código Yape o transferencia.">
              <Input id="pago-ref" maxLength={100} autoComplete="off" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
            </Field>
            <Field label="Notas" htmlFor="pago-notas" className="sm:col-span-2">
              <Input id="pago-notas" maxLength={255} value={notas} onChange={(e) => setNotas(e.target.value)} />
            </Field>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Detalle con trazabilidad                                            */
/* ------------------------------------------------------------------ */

const EVENTO: Record<string, { label: string; color: string }> = {
  CREADO: { label: "Emitido", color: "bg-[#0072f5]" },
  PAGO: { label: "Pago", color: "bg-emerald-500" },
  PAGO_ANULADO: { label: "Pago anulado", color: "bg-amber-500" },
  ANULADO: { label: "Anulado", color: "bg-red-500" },
  VENCIMIENTO: { label: "Vencimiento", color: "bg-violet-500" },
};

export function CobroDetalleModal({
  cobroId,
  onClose,
  onChanged,
}: {
  cobroId: number | null;
  onClose: () => void;
  /** Se llama tras cualquier cambio para refrescar listas */
  onChanged: () => void;
}) {
  const toast = useToast();
  const { data, setData, error, initialLoading } = useGymData<{ data: GymCobroDetalle }>(cobroId ? `cobranza/cobros/${cobroId}` : null);
  const c = data?.data && data.data.id === cobroId ? data.data : null;
  const [pagar, setPagar] = useState(false);
  const [accion, setAccion] = useState<"vencimiento" | "anular" | { pagoId: number } | null>(null);
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [accionError, setAccionError] = useState<string | null>(null);

  function actualizado(d: GymCobroDetalle) {
    setData({ data: d });
    onChanged();
  }

  function abrirAccion(a: NonNullable<typeof accion>) {
    setAccion(a);
    setValor(a === "vencimiento" && c ? c.fechaVencimiento : "");
    setMotivo("");
    setAccionError(null);
  }

  async function ejecutarAccion(e: FormEvent) {
    e.preventDefault();
    if (!c || !accion) return;
    if ((accion === "anular" || typeof accion === "object") && motivo.trim().length < 3) {
      setAccionError("Indica el motivo.");
      return;
    }
    setSaving(true);
    setAccionError(null);
    try {
      const res =
        typeof accion === "object"
          ? await gymApi.patch<{ data: GymCobroDetalle }>(`cobranza/cobros/${c.id}/pagos/${accion.pagoId}`, { motivo: motivo.trim() })
          : await gymApi.patch<{ data: GymCobroDetalle }>(
              `cobranza/cobros/${c.id}`,
              accion === "anular" ? { anular: true, motivo: motivo.trim() } : { fechaVencimiento: valor, motivo: motivo.trim() || undefined },
            );
      toast(typeof accion === "object" ? "Pago anulado." : accion === "anular" ? "Cobro anulado." : "Vencimiento actualizado.");
      setAccion(null);
      actualizado(res.data);
    } catch (err) {
      setAccionError(errorMessage(err, "No se pudo completar la acción."));
    } finally {
      setSaving(false);
    }
  }

  const activo = c && c.estado !== "ANULADO";

  return (
    <>
      <Modal
        open={cobroId !== null && !pagar}
        onClose={() => !saving && onClose()}
        size="lg"
        title={c ? `Cobro #${c.id} · ${c.empresa.nombre}` : "Cobro"}
        description={c?.descripcion}
        footer={
          <>
            {activo && c.pagos.every((p) => p.anulado) && (
              <Button variant="ghost" className="mr-auto text-[#e5484d]" onClick={() => abrirAccion("anular")}>
                Anular cobro
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            {activo && c.saldo > 0 && <Button onClick={() => setPagar(true)}>Registrar pago</Button>}
          </>
        }
      >
        {error && <Alert>{error.message}</Alert>}
        {!c && initialLoading && <Skeleton className="h-64 w-full" />}
        {c && (
          <div className="max-h-[62vh] space-y-6 overflow-y-auto pr-1 scroll-thin">
            <div className="flex flex-wrap items-center gap-2">
              <SituacionBadge cobro={c} />
              <Badge tone="outline">{CONCEPTO_LABEL[c.concepto]}</Badge>
              {c.periodo && <Badge tone="outline">{nombreMes(c.periodo)}</Badge>}
              {c.cotizacion && <Badge tone="violet">{c.cotizacion.numero}</Badge>}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              {[
                ["Subtotal", formatPEN(c.subtotal)],
                ["IGV", formatPEN(c.igv)],
                ["Total", formatPEN(c.total)],
                ["Saldo", formatPEN(c.saldo)],
                ["Emisión", formatDate(c.fechaEmision)],
                ["Vence", formatDate(c.fechaVencimiento)],
                ["Pagado", formatPEN(c.pagado)],
                ["Emitido por", c.creadoPor],
              ].map(([l, v]) => (
                <div key={l} className="min-w-0">
                  <dt className="text-xs text-muted">{l}</dt>
                  <dd className="mt-0.5 truncate font-medium tabular-nums text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {activo && c.saldo > 0 && (
              <button
                type="button"
                onClick={() => abrirAccion("vencimiento")}
                className="-mt-3 rounded text-[13px] font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus"
              >
                Cambiar fecha de vencimiento
              </button>
            )}

            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Pagos</h3>
              {c.pagos.length === 0 ? (
                <p className="text-sm text-muted">Aún no se registran pagos.</p>
              ) : (
                <ul className="divide-y divide-line rounded-lg border border-line">
                  {c.pagos.map((p) => (
                    <li key={p.id} className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", p.anulado && "opacity-60")}>
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-medium tabular-nums text-ink", p.anulado && "line-through")}>
                          {formatPEN(p.monto)} <span className="font-normal text-muted">· {METODO_LABEL[p.metodo]}</span>
                        </p>
                        <p className="truncate text-xs text-muted">
                          {formatDate(p.fecha)}
                          {p.referencia ? ` · op. ${p.referencia}` : ""} · {p.registradoPor}
                          {p.notas ? ` · ${p.notas}` : ""}
                        </p>
                      </div>
                      {p.anulado ? (
                        <Badge tone="neutral">Anulado</Badge>
                      ) : (
                        activo && (
                          <Button variant="ghost" size="sm" onClick={() => abrirAccion({ pagoId: p.id })}>
                            Anular
                          </Button>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Trazabilidad</h3>
              <ol className="relative space-y-4 border-l border-line pl-5">
                {c.eventos.map((ev) => {
                  const e = EVENTO[ev.tipo] ?? { label: ev.tipo, color: "bg-muted" };
                  return (
                    <li key={ev.id} className="relative">
                      <span aria-hidden="true" className={cn("absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface", e.color)} />
                      <p className="text-sm text-ink">
                        <span className="font-medium">{e.label}</span> · {ev.detalle}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDateTime(ev.fecha)} · {ev.usuario}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
          </div>
        )}
      </Modal>

      {/* Acciones con confirmación (vencimiento, anular cobro, anular pago) */}
      <Modal
        open={accion !== null}
        onClose={() => !saving && setAccion(null)}
        size="sm"
        title={accion === "vencimiento" ? "Cambiar vencimiento" : accion === "anular" ? "Anular cobro" : "Anular pago"}
        description={
          accion === "anular"
            ? "El cobro dejará de contar como deuda. Queda registrado en la trazabilidad."
            : typeof accion === "object" && accion
              ? "El pago se conserva marcado como anulado y el saldo vuelve a estar pendiente."
              : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setAccion(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="accion-cobro" variant={accion === "vencimiento" ? "primary" : "danger"} loading={saving}>
              Confirmar
            </Button>
          </>
        }
      >
        <form id="accion-cobro" onSubmit={ejecutarAccion} noValidate className="space-y-4">
          {accionError && <Alert>{accionError}</Alert>}
          {accion === "vencimiento" && (
            <Field label="Nueva fecha de vencimiento" htmlFor="acc-fecha" required>
              <Input id="acc-fecha" type="date" value={valor} onChange={(e) => setValor(e.target.value)} />
            </Field>
          )}
          <Field label="Motivo" htmlFor="acc-motivo" required={accion !== "vencimiento"}>
            <Input id="acc-motivo" maxLength={200} value={motivo} autoFocus onChange={(e) => setMotivo(e.target.value)} />
          </Field>
        </form>
      </Modal>

      <RegistrarPagoModal
        cobro={pagar ? c : null}
        onClose={() => setPagar(false)}
        onSaved={(d) => {
          setPagar(false);
          actualizado(d);
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Cobro manual                                                        */
/* ------------------------------------------------------------------ */

export function NuevoCobroModal({
  open,
  empresaId,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** Fija la empresa (desde su detalle) */
  empresaId?: number;
  onClose: () => void;
  onSaved: (c: GymCobroDetalle) => void;
}) {
  const toast = useToast();
  const empresas = useGymData<{ data: GymEmpresaResumen[] }>(open && !empresaId ? "empresas" : null);
  const [empresa, setEmpresa] = useState<string>("");
  const [concepto, setConcepto] = useState<GymConceptoCobro>("IMPLEMENTACION");
  const [descripcion, setDescripcion] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [aplicaIgv, setAplicaIgv] = useState(true);
  const [emision, setEmision] = useState(hoyISO());
  const [vence, setVence] = useState(hoyISO());
  const [periodo, setPeriodo] = useState(hoyISO().slice(0, 7));
  const [enviado, setEnviado] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Reinicia el formulario al abrir
    /* eslint-disable react-hooks/set-state-in-effect */
    setEmpresa(empresaId ? String(empresaId) : "");
    setConcepto("IMPLEMENTACION");
    setDescripcion("");
    setSubtotal("");
    setAplicaIgv(true);
    setEmision(hoyISO());
    setVence(hoyISO());
    setPeriodo(hoyISO().slice(0, 7));
    setEnviado(false);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, empresaId]);

  const monto = Number(subtotal);
  const errores = enviado
    ? {
        empresa: empresa ? undefined : "Elige la empresa.",
        descripcion: descripcion.trim().length >= 3 ? undefined : "Describe el cobro.",
        subtotal: monto > 0 ? undefined : "Monto mayor a cero.",
        vence: vence >= emision ? undefined : "No puede ser antes de la emisión.",
      }
    : {};
  const total = monto > 0 ? monto * (aplicaIgv ? 1.18 : 1) : 0;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setEnviado(true);
    if (!empresa || descripcion.trim().length < 3 || !(monto > 0) || vence < emision) return;
    setSaving(true);
    setError(null);
    try {
      const res = await gymApi.post<{ data: GymCobroDetalle }>("cobranza/cobros", {
        empresaId: Number(empresa),
        concepto,
        descripcion: descripcion.trim(),
        subtotal: monto,
        aplicaIgv,
        fechaEmision: emision,
        fechaVencimiento: vence,
        periodo: concepto === "MENSUALIDAD" ? periodo : undefined,
      });
      toast(`Cobro #${res.data.id} emitido por ${formatPEN(res.data.total)}.`);
      onSaved(res.data);
    } catch (err) {
      setError(errorMessage(err, "No se pudo emitir el cobro."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      size="lg"
      title="Nuevo cobro"
      description="Implementación, servicios adicionales u otros cargos. Las mensualidades se emiten solas según la suscripción de cada empresa."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="nuevo-cobro" loading={saving}>
            Emitir {total > 0 ? formatPEN(total) : "cobro"}
          </Button>
        </>
      }
    >
      <form id="nuevo-cobro" onSubmit={guardar} noValidate className="grid gap-4 sm:grid-cols-2">
        {error && (
          <div className="sm:col-span-2">
            <Alert>{error}</Alert>
          </div>
        )}
        {!empresaId && (
          <Field label="Empresa" htmlFor="nc-empresa" required error={errores.empresa} className="sm:col-span-2">
            <Select id="nc-empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
              <option value="">{empresas.initialLoading ? "Cargando…" : "Elige la empresa…"}</option>
              {(empresas.data?.data ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Concepto" htmlFor="nc-concepto" required>
          <Select id="nc-concepto" value={concepto} onChange={(e) => setConcepto(e.target.value as GymConceptoCobro)}>
            {Object.entries(CONCEPTO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        {concepto === "MENSUALIDAD" ? (
          <Field label="Mes" htmlFor="nc-periodo" required hint="Una mensualidad por empresa y mes.">
            <Input id="nc-periodo" type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Field label="Descripción" htmlFor="nc-desc" required error={errores.descripcion} className="sm:col-span-2">
          <Input
            id="nc-desc"
            maxLength={255}
            value={descripcion}
            placeholder="Ej. Capacitación presencial"
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </Field>
        <Field label="Monto sin IGV (S/)" htmlFor="nc-monto" required error={errores.subtotal}>
          <Input
            id="nc-monto"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className="tabular-nums"
            value={subtotal}
            onChange={(e) => setSubtotal(e.target.value)}
          />
        </Field>
        <div className="flex items-end pb-2">
          <Switch id="nc-igv" checked={aplicaIgv} onChange={setAplicaIgv} label="Aplicar IGV (18 %)" description={total > 0 ? `Total ${formatPEN(total)}` : undefined} />
        </div>
        <Field label="Emisión" htmlFor="nc-emision" required>
          <Input id="nc-emision" type="date" value={emision} onChange={(e) => setEmision(e.target.value)} />
        </Field>
        <Field label="Vencimiento" htmlFor="nc-vence" required error={errores.vence}>
          <Input id="nc-vence" type="date" min={emision} value={vence} onChange={(e) => setVence(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Tabla de cobros (página Cobros y pestaña de la empresa)             */
/* ------------------------------------------------------------------ */

type FiltroEstado = "TODOS" | "PENDIENTE" | "VENCIDO" | "PAGADO" | "ANULADO";

export function CobrosTabla({ empresaId, version = 0 }: { empresaId?: number; version?: number }) {
  const [estado, setEstado] = useState<FiltroEstado>(empresaId ? "TODOS" : "PENDIENTE");
  const [mes, setMes] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [detalle, setDetalle] = useState<number | null>(null);
  const [pagar, setPagar] = useState<GymCobro | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busqueda.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const params = new URLSearchParams({ estado, page: String(page), v: String(version + recarga) });
  if (empresaId) params.set("empresaId", String(empresaId));
  if (mes) params.set("mes", mes);
  if (q) params.set("q", q);
  const { data, error, loading, reload } = useGymData<GymPaginado<GymCobro>>(`cobranza/cobros?${params}`);
  const p = data?.pagination;
  const refrescar = () => setRecarga((v) => v + 1);

  const columnas: Column<GymCobro>[] = [
    {
      key: "cobro",
      header: "Cobro",
      cell: (c) => (
        <div className="min-w-0">
          <p className="max-w-[22rem] truncate font-medium text-ink">{c.descripcion}</p>
          <p className="truncate text-xs text-muted">
            #{c.id} · {CONCEPTO_LABEL[c.concepto]}
            {!empresaId && ` · ${c.empresa.nombre}`}
          </p>
        </div>
      ),
    },
    {
      key: "vence",
      header: "Vence",
      hideOnMobile: true,
      className: "whitespace-nowrap text-muted",
      cell: (c) => formatDate(c.fechaVencimiento),
    },
    { key: "estado", header: "Estado", cell: (c) => <SituacionBadge cobro={c} /> },
    {
      key: "total",
      header: "Total",
      align: "right",
      className: "whitespace-nowrap tabular-nums",
      cell: (c) => formatPEN(c.total),
    },
    {
      key: "saldo",
      header: "Saldo",
      align: "right",
      className: "whitespace-nowrap font-medium tabular-nums",
      cell: (c) => (c.saldo > 0 ? formatPEN(c.saldo) : <span className="font-normal text-subtle">—</span>),
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (c) => (
        <Menu
          label={`Acciones del cobro ${c.id}`}
          items={[
            { label: "Ver detalle y trazabilidad", onSelect: () => setDetalle(c.id) },
            { label: "Registrar pago", disabled: c.saldo <= 0 || c.estado === "ANULADO", onSelect: () => setPagar(c) },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <Toolbar>
        <FilterPills<FiltroEstado>
          value={estado}
          onChange={(e) => {
            setEstado(e);
            setPage(1);
          }}
          options={[
            { value: "PENDIENTE", label: "Por vencer" },
            { value: "VENCIDO", label: "Vencidos" },
            { value: "PAGADO", label: "Pagados" },
            { value: "ANULADO", label: "Anulados" },
            { value: "TODOS", label: "Todos" },
          ]}
        />
        <div className="flex flex-col gap-3 sm:flex-row lg:ml-auto">
          <Input
            type="month"
            aria-label="Mes de emisión"
            className="sm:w-44"
            value={mes}
            onChange={(e) => {
              setMes(e.target.value);
              setPage(1);
            }}
          />
          {!empresaId && (
            <Input
              type="search"
              className="sm:w-64"
              leading={<SearchIcon width={16} height={16} />}
              placeholder="Buscar empresa o concepto…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar cobros"
            />
          )}
        </div>
      </Toolbar>

      {error && (
        <div className="mb-4">
          <Alert
            action={
              <Button variant="secondary" size="sm" onClick={reload} loading={loading}>
                Reintentar
              </Button>
            }
          >
            {error.message}
          </Alert>
        </div>
      )}

      <DataTable
        columns={columnas}
        rows={data?.data ?? []}
        rowKey={(c) => c.id}
        loading={loading && !data}
        onRowClick={(c) => setDetalle(c.id)}
        footer={
          <Pagination
            pagination={p ? { total: p.total, page: p.page, limit: p.pageSize, totalPages: p.pages } : null}
            onPageChange={setPage}
            disabled={loading}
          />
        }
        empty={<EmptyState icon={<ReceiptIcon />} title="No hay cobros en esta vista" description={mes ? `Sin cobros emitidos en ${nombreMes(mes)}.` : undefined} />}
      />

      <CobroDetalleModal cobroId={detalle} onClose={() => setDetalle(null)} onChanged={refrescar} />
      <RegistrarPagoModal
        cobro={pagar}
        onClose={() => setPagar(null)}
        onSaved={() => {
          setPagar(null);
          refrescar();
        }}
      />
    </>
  );
}

/** Botón «Nuevo cobro» con su modal. */
export function NuevoCobroBoton({ empresaId, onCreated }: { empresaId?: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={empresaId ? "secondary" : "primary"} size={empresaId ? "sm" : "md"} onClick={() => setOpen(true)}>
        <PlusIcon width={empresaId ? 14 : 16} height={empresaId ? 14 : 16} /> Nuevo cobro
      </Button>
      <NuevoCobroModal
        open={open}
        empresaId={empresaId}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          onCreated();
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Cotizaciones                                                        */
/* ------------------------------------------------------------------ */

export const COTIZACIONES = "/dashboard/gym/cobranza/cotizaciones";

export const ESTADO_COTIZACION: Record<GymEstadoCotizacion, { label: string; tone: BadgeTone }> = {
  BORRADOR: { label: "Borrador", tone: "neutral" },
  ENVIADA: { label: "Enviada", tone: "info" },
  ACEPTADA: { label: "Aceptada", tone: "success" },
  RECHAZADA: { label: "Rechazada", tone: "danger" },
};

export function EstadoCotizacionBadge({ c }: { c: Pick<GymCotizacion, "estado" | "vencida"> }) {
  if (c.vencida) return <Badge tone="warning">Vencida</Badge>;
  const e = ESTADO_COTIZACION[c.estado];
  return (
    <Badge tone={e.tone} dot={c.estado === "ACEPTADA"}>
      {e.label}
    </Badge>
  );
}
