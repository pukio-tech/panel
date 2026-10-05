"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { GymCobro, GymResumenCobranza } from "@/lib/gym-types";
import { formatDate, formatDateTime, formatInt, formatPEN } from "@/lib/gym-utils";
import { useGymData } from "@/lib/hooks/useGymData";
import { cn } from "@/lib/utils";
import { Alert, Badge, Button, ButtonLink, Card, EmptyState, PageHeader, Skeleton, StatCard, useToast } from "@/components/ui";
import { ReceiptIcon } from "@/components/icons";
import { RevenueChart } from "@/components/gym/RevenueChart";
import { CobroDetalleModal, METODO_LABEL, NuevoCobroBoton, nombreMes, RegistrarPagoModal, SituacionBadge, hoyISO } from "@/components/gym/cobranza";
import { errorMessage, GYM_EMPRESAS } from "@/components/gym/shared";
import { gymApi } from "@/lib/gym-api";

const COBROS = "/dashboard/gym/cobranza/cobros";

function Lista({ titulo, accion, vacio, children }: { titulo: string; accion?: ReactNode; vacio: string; children: ReactNode[] }) {
  return (
    <Card padded={false}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <h2 className="text-sm font-semibold text-ink">{titulo}</h2>
        {accion}
      </div>
      {children.length === 0 ? <p className="px-5 py-6 text-sm text-muted">{vacio}</p> : <ul className="divide-y divide-line">{children}</ul>}
    </Card>
  );
}

function FilaCobro({ c, onVer, onPagar }: { c: GymCobro; onVer: () => void; onPagar: () => void }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <button
        type="button"
        onClick={onVer}
        className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus"
      >
        <p className="truncate text-sm font-medium text-ink">{c.empresa.nombre}</p>
        <p className="truncate text-xs text-muted">
          {c.descripcion} · vence {formatDate(c.fechaVencimiento)}
        </p>
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm font-semibold tabular-nums text-ink">{formatPEN(c.saldo)}</span>
        <SituacionBadge cobro={c} />
      </div>
      <Button variant="secondary" size="sm" onClick={onPagar} className="max-sm:hidden">
        Cobrar
      </Button>
    </li>
  );
}

/** "YYYY-MM" del mes siguiente (hora de Lima). */
function mesSiguiente() {
  const [a, m] = hoyISO().slice(0, 7).split("-").map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, "0")}`;
}

const variacion = (actual: number, anterior: number) => {
  if (anterior <= 0) return actual > 0 ? "Sin cobros el mes anterior" : "Sin cobros aún";
  const pct = Math.round(((actual - anterior) / anterior) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}% vs. mes anterior (${formatPEN(anterior)})`;
};

export default function CobranzaResumenPage() {
  const toast = useToast();
  const [version, setVersion] = useState(0);
  const { data, error, initialLoading, loading, reload } = useGymData<{ data: GymResumenCobranza }>(`cobranza/resumen?v=${version}`);
  const r = data?.data;
  const t = r?.totales;
  const [detalle, setDetalle] = useState<number | null>(null);
  const [pagar, setPagar] = useState<GymCobro | null>(null);
  const [generando, setGenerando] = useState(false);
  const refrescar = () => setVersion((v) => v + 1);

  async function generarMes() {
    setGenerando(true);
    try {
      const mes = hoyISO().slice(0, 7);
      const res = await gymApi.post<{ data: { creados: number } }>("cobranza/cobros/generar", { periodo: mes });
      toast(res.data.creados ? `${res.data.creados} mensualidad(es) de ${nombreMes(mes)} emitida(s).` : `Las mensualidades de ${nombreMes(mes)} ya estaban emitidas.`);
      refrescar();
    } catch (err) {
      toast(errorMessage(err, "No se pudieron generar las mensualidades."), "error");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Ingresos"
        subtitle="Cobranza de Gym Manager: lo que cobras a cada gimnasio, lo pendiente y lo vencido."
        actions={
          <>
            <Button variant="secondary" onClick={generarMes} loading={generando}>
              Emitir mensualidades del mes
            </Button>
            <NuevoCobroBoton onCreated={refrescar} />
          </>
        }
      />

      {error && (
        <div className="mb-6">
          <Alert
            title="No se pudo cargar la cobranza"
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

      {r && r.sinSuscripcion.length > 0 && (
        <div className="mb-6">
          <Alert title={`${r.sinSuscripcion.length} empresa${r.sinSuscripcion.length === 1 ? "" : "s"} activa${r.sinSuscripcion.length === 1 ? "" : "s"} sin cobro mensual`}>
            Configura su suscripción para que se emitan sus mensualidades:{" "}
            {r.sinSuscripcion.map((e, i) => (
              <span key={e.id}>
                {i > 0 && ", "}
                <Link href={`${GYM_EMPRESAS}/${e.id}?tab=cobranza`} className="font-medium underline underline-offset-2">
                  {e.nombre}
                </Link>
              </span>
            ))}
            .
          </Alert>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Cobrado este mes" value={formatPEN(t?.cobradoMes)} loading={initialLoading} hint={t ? variacion(t.cobradoMes, t.cobradoMesAnterior) : undefined} />
        <StatCard
          label="Ingreso mensual recurrente"
          value={formatPEN(t?.mrr)}
          loading={initialLoading}
          hint={t ? `${formatInt(t.suscripcionesActivas)} suscripción${t.suscripcionesActivas === 1 ? "" : "es"} activa${t.suscripcionesActivas === 1 ? "" : "s"} · con IGV` : undefined}
        />
        <StatCard label="Cobrado en el año" value={formatPEN(t?.cobradoAnio)} loading={initialLoading} hint="Pagos registrados desde enero" />
        <StatCard
          label="Por cobrar"
          value={formatPEN(t?.porCobrar)}
          loading={initialLoading}
          hint={t ? `${formatInt(t.porCobrarCantidad)} cobro${t.porCobrarCantidad === 1 ? "" : "s"} pendiente${t.porCobrarCantidad === 1 ? "" : "s"}` : undefined}
          href={COBROS}
        />
        <StatCard
          label="Vencido"
          value={<span className={cn(t && t.vencido > 0 && "text-[#e5484d]")}>{formatPEN(t?.vencido)}</span>}
          loading={initialLoading}
          hint={t ? (t.vencidoCantidad ? `${formatInt(t.vencidoCantidad)} cobro${t.vencidoCantidad === 1 ? "" : "s"} vencido${t.vencidoCantidad === 1 ? "" : "s"}` : "Todo al día") : undefined}
          href={COBROS}
        />
        <StatCard label="Vence en 30 días" value={formatPEN(t?.proximos30)} loading={initialLoading} hint="Pendientes aún no vencidos" />
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold text-ink">Ingresos de los últimos 12 meses</h2>
      <Card>
        {initialLoading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : r && r.ingresosMensuales.some((m) => m.total > 0) ? (
          <RevenueChart granularidad="mes" data={r.ingresosMensuales.map((m) => ({ fecha: m.mes, total: m.total }))} />
        ) : (
          <EmptyState icon={<ReceiptIcon />} title="Aún no hay pagos registrados" description="Registra los pagos de tus clientes para ver la evolución de tus ingresos." />
        )}
      </Card>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
        <Lista
          titulo="Vencidos"
          vacio="No hay cobros vencidos."
          accion={
            <ButtonLink href={COBROS} variant="ghost" size="sm">
              Ver todos
            </ButtonLink>
          }
        >
          {(r?.vencidos ?? []).map((c) => (
            <FilaCobro key={c.id} c={c} onVer={() => setDetalle(c.id)} onPagar={() => setPagar(c)} />
          ))}
        </Lista>

        <Lista titulo="Próximos a vencer" vacio="No hay cobros pendientes por vencer.">
          {(r?.proximos ?? []).map((c) => (
            <FilaCobro key={c.id} c={c} onVer={() => setDetalle(c.id)} onPagar={() => setPagar(c)} />
          ))}
        </Lista>

        <Lista titulo="Pagos recibidos" vacio="Aún no se registran pagos.">
          {(r?.ultimosPagos ?? []).map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-3">
              <button
                type="button"
                onClick={() => setDetalle(p.cobro.id)}
                className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus"
              >
                <p className="truncate text-sm font-medium text-ink">{p.cobro.empresa.nombre}</p>
                <p className="truncate text-xs text-muted">
                  {formatDate(p.fecha)} · {METODO_LABEL[p.metodo]}
                  {p.referencia ? ` · op. ${p.referencia}` : ""} · {p.cobro.descripcion}
                </p>
              </button>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700">+{formatPEN(p.monto)}</span>
            </li>
          ))}
        </Lista>

        <Lista titulo={`Mensualidades de ${nombreMes(mesSiguiente())} (estimadas)`} vacio="No hay suscripciones activas.">
          {(r?.proyectadas ?? []).map((p) => (
            <li key={p.empresa.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{p.empresa.nombre}</p>
                <p className="truncate text-xs text-muted">
                  Se emite el {formatDate(p.fechaEmision)} · vence {formatDate(p.fechaVencimiento)}
                </p>
              </div>
              <span className="shrink-0 text-sm tabular-nums text-muted">{formatPEN(p.total)}</span>
            </li>
          ))}
        </Lista>
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold text-ink">Actividad reciente</h2>
      <Card>
        {(r?.actividad ?? []).length === 0 ? (
          <p className="text-sm text-muted">Sin movimientos todavía.</p>
        ) : (
          <ol className="space-y-3">
            {r!.actividad.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <Badge
                  tone={a.tipo === "PAGO" ? "success" : a.tipo === "CREADO" ? "info" : a.tipo === "ANULADO" || a.tipo === "PAGO_ANULADO" ? "danger" : "neutral"}
                  className="shrink-0"
                >
                  {a.tipo === "CREADO" ? "Emitido" : a.tipo === "PAGO" ? "Pago" : a.tipo === "PAGO_ANULADO" ? "Pago anulado" : a.tipo === "ANULADO" ? "Anulado" : "Cambio"}
                </Badge>
                <button
                  type="button"
                  onClick={() => setDetalle(a.cobroId)}
                  className="min-w-0 flex-1 rounded text-left hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus"
                >
                  <span className="font-medium text-ink">{a.empresa}</span> · <span className="text-ink-soft">{a.detalle}</span>
                </button>
                <span className="shrink-0 text-xs text-muted max-sm:hidden">
                  {formatDateTime(a.fecha)} · {a.usuario}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>

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
