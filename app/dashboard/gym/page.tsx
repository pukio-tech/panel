"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { GymEmpresaResumen, GymResumen } from "@/lib/gym-types";
import { formatInt, formatPEN, formatRelative } from "@/lib/gym-utils";
import { useGymData } from "@/lib/hooks/useGymData";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  DataTable,
  EmptyState,
  LiveDot,
  PageHeader,
  Skeleton,
  StatCard,
  type Column,
} from "@/components/ui";
import { DumbbellIcon, PlusIcon } from "@/components/icons";
import { RevenueChart } from "@/components/gym/RevenueChart";
import { EmpresaLogo, EstadoBadge, GYM_EMPRESAS, PlanBadge } from "@/components/gym/shared";

export default function GymResumenPage() {
  const router = useRouter();
  const { data, error, initialLoading, loading, reload } = useGymData<GymResumen>("resumen");
  const t = data?.totales;

  const ranking = useMemo(
    () => [...(data?.empresas ?? [])].sort((a, b) => b.metricas.ingresosMes - a.metricas.ingresosMes),
    [data],
  );

  const columns: Column<GymEmpresaResumen & { pos: number }>[] = [
    {
      key: "pos",
      header: "#",
      className: "w-10 tabular-nums text-muted",
      cell: (e) => e.pos,
    },
    {
      key: "empresa",
      header: "Empresa",
      cell: (e) => (
        <div className="flex min-w-0 items-center gap-3">
          <EmpresaLogo nombre={e.nombre} logoUrl={e.logoUrl} />
          <div className="min-w-0">
            <p className="max-w-[16rem] truncate font-medium text-ink">{e.nombre}</p>
            <p className="truncate font-mono text-xs text-muted">{e.slug}</p>
          </div>
        </div>
      ),
    },
    { key: "plan", header: "Plan", hideOnMobile: true, cell: (e) => <PlanBadge plan={e.plan} nombre={e.planNombre} /> },
    { key: "estado", header: "Estado", cell: (e) => <EstadoBadge activo={e.activo} /> },
    {
      key: "socios",
      header: "Socios activos",
      align: "right",
      hideOnMobile: true,
      className: "tabular-nums",
      cell: (e) => formatInt(e.metricas.sociosActivos),
    },
    {
      key: "ingresos",
      header: "Ingresos del mes",
      align: "right",
      className: "whitespace-nowrap font-medium tabular-nums",
      cell: (e) => formatPEN(e.metricas.ingresosMes),
    },
    {
      key: "ultima",
      header: "Última venta",
      align: "right",
      hideOnMobile: true,
      className: "whitespace-nowrap text-muted",
      cell: (e) => (
        <span title={e.metricas.ultimaVenta ?? undefined}>
          {e.metricas.ultimaVenta ? formatRelative(e.metricas.ultimaVenta) : "Sin ventas"}
        </span>
      ),
    },
  ];

  const newButton = (
    <ButtonLink href={`${GYM_EMPRESAS}/nueva`}>
      <PlusIcon width={16} height={16} /> Nueva empresa
    </ButtonLink>
  );

  return (
    <>
      <PageHeader
        title="Gym Manager"
        subtitle={
          <>
            <LiveDot /> Resumen de todas las empresas (gimnasios) de la plataforma
          </>
        }
        actions={newButton}
      />

      {error && (
        <div className="mb-6">
          <Alert
            title="No se pudo cargar el resumen"
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

      {!error || data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Empresas activas"
              value={formatInt(t?.empresasActivas)}
              loading={initialLoading}
              suffix={t ? `de ${formatInt(t.empresas)}` : undefined}
              hint={
                t
                  ? t.empresasSuspendidas > 0
                    ? `${formatInt(t.empresasSuspendidas)} suspendida${t.empresasSuspendidas === 1 ? "" : "s"}`
                    : "Ninguna suspendida"
                  : undefined
              }
              href={GYM_EMPRESAS}
            />
            <StatCard
              label="Socios activos"
              value={formatInt(t?.sociosActivos)}
              loading={initialLoading}
              hint={t ? `${formatInt(t.asistenciasHoy)} asistencias hoy` : undefined}
            />
            <StatCard
              label="Suscripciones vigentes"
              value={formatInt(t?.suscripcionesVigentes)}
              loading={initialLoading}
              hint="Membresías activas en todas las sedes"
            />
            <StatCard
              label="Ingresos hoy"
              value={formatPEN(t?.ingresosHoy)}
              loading={initialLoading}
              hint="Ventas registradas hoy"
            />
            <StatCard
              label="Ingresos del mes"
              value={formatPEN(t?.ingresosMes)}
              loading={initialLoading}
              hint="Mes calendario en curso"
            />
            <StatCard
              label="Solicitudes pendientes"
              value={formatInt(t?.solicitudesPendientes)}
              loading={initialLoading}
              hint="Solicitudes del catálogo por atender"
            />
          </div>

          <h2 className="mb-3 mt-10 text-sm font-semibold text-ink">Ingresos de los últimos 30 días</h2>
          <Card>
            {initialLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-[220px] w-full" />
              </div>
            ) : data && data.ingresosDiarios.length > 0 ? (
              <RevenueChart data={data.ingresosDiarios} />
            ) : (
              <EmptyState title="Sin datos de ingresos" description="Aún no hay ventas registradas en los últimos 30 días." />
            )}
          </Card>

          <h2 className="mb-3 mt-10 text-sm font-semibold text-ink">Ranking por ingresos del mes</h2>
          <DataTable
            columns={columns}
            rows={ranking.map((e, i) => ({ ...e, pos: i + 1 }))}
            rowKey={(e) => e.id}
            loading={initialLoading}
            skeletonRows={5}
            onRowClick={(e) => router.push(`${GYM_EMPRESAS}/${e.id}`)}
            empty={
              <EmptyState
                icon={<DumbbellIcon />}
                title="Aún no hay empresas"
                description="Crea la primera empresa (gimnasio) con su administrador inicial para empezar."
                action={newButton}
              />
            }
          />
        </>
      ) : null}
    </>
  );
}
