"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GymCotizacion, GymEstadoCotizacion } from "@/lib/gym-types";
import { COTIZACIONES, EstadoCotizacionBadge } from "@/components/gym/cobranza";
import { formatDate, formatPEN } from "@/lib/gym-utils";
import { useGymData } from "@/lib/hooks/useGymData";
import { Alert, Button, ButtonLink, DataTable, EmptyState, FilterPills, PageHeader, Toolbar, type Column } from "@/components/ui";
import { FileIcon, PlusIcon } from "@/components/icons";

type Filtro = "TODAS" | GymEstadoCotizacion;

export default function CotizacionesPage() {
  const router = useRouter();
  const { data, error, initialLoading, loading, reload } = useGymData<{ data: GymCotizacion[] }>("cotizaciones");
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const lista = useMemo(() => data?.data ?? [], [data]);
  const filas = filtro === "TODAS" ? lista : lista.filter((c) => c.estado === filtro);
  const contar = (e: GymEstadoCotizacion) => lista.filter((c) => c.estado === e).length;

  const columnas: Column<GymCotizacion>[] = [
    {
      key: "numero",
      header: "Cotización",
      cell: (c) => (
        <div className="min-w-0">
          <p className="font-mono text-[13px] font-medium text-ink">{c.numero}</p>
          <p className="text-xs text-muted">{formatDate(c.fecha)}</p>
        </div>
      ),
    },
    {
      key: "cliente",
      header: "Cliente",
      cell: (c) => (
        <div className="min-w-0">
          <p className="max-w-[18rem] truncate font-medium text-ink">{c.clienteNombre}</p>
          <p className="truncate text-xs text-muted">
            {c.empresa ? "Cliente" : "Prospecto"}
            {c.plan ? ` · Plan ${c.plan.nombre}` : ""}
          </p>
        </div>
      ),
    },
    { key: "estado", header: "Estado", cell: (c) => <EstadoCotizacionBadge c={c} /> },
    {
      key: "inicial",
      header: "Pago inicial",
      align: "right",
      hideOnMobile: true,
      className: "whitespace-nowrap tabular-nums",
      cell: (c) => formatPEN(c.totales.inicial.total),
    },
    {
      key: "mensual",
      header: "Mensual",
      align: "right",
      className: "whitespace-nowrap font-medium tabular-nums",
      cell: (c) => formatPEN(c.totales.mensual.total),
    },
    {
      key: "anio",
      header: "Año 1",
      align: "right",
      hideOnMobile: true,
      className: "whitespace-nowrap tabular-nums text-muted",
      cell: (c) => formatPEN(c.totales.anio1.total),
    },
  ];

  const nueva = (
    <ButtonLink href={`${COTIZACIONES}/nueva`}>
      <PlusIcon width={16} height={16} /> Nueva cotización
    </ButtonLink>
  );

  return (
    <>
      <PageHeader title="Cotizaciones" subtitle="Propuestas a gimnasios. Al aceptarlas se configura el cobro mensual y se emite el pago inicial." actions={nueva} />

      <Toolbar>
        <FilterPills<Filtro>
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: "TODAS", label: "Todas", count: data ? lista.length : null },
            { value: "BORRADOR", label: "Borradores", count: data ? contar("BORRADOR") : null },
            { value: "ENVIADA", label: "Enviadas", count: data ? contar("ENVIADA") : null },
            { value: "ACEPTADA", label: "Aceptadas", count: data ? contar("ACEPTADA") : null },
            { value: "RECHAZADA", label: "Rechazadas", count: data ? contar("RECHAZADA") : null },
          ]}
        />
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
        rows={filas}
        rowKey={(c) => c.id}
        loading={initialLoading}
        onRowClick={(c) => router.push(`${COTIZACIONES}/${c.id}`)}
        empty={
          <EmptyState
            icon={<FileIcon />}
            title={lista.length ? "No hay cotizaciones en esta vista" : "Aún no hay cotizaciones"}
            description={lista.length ? undefined : "Crea una propuesta con el plan, la implementación y los servicios adicionales."}
            action={lista.length ? undefined : nueva}
          />
        }
      />
    </>
  );
}
