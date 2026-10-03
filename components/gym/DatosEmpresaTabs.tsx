"use client";

import { useEffect, useState } from "react";
import type { GymPaginado, GymProducto, GymSocio } from "@/lib/gym-types";
import { gymAsset } from "@/lib/gym-api";
import { formatDate, formatInt, formatPEN } from "@/lib/gym-utils";
import { useGymData } from "@/lib/hooks/useGymData";
import {
  Alert,
  Badge,
  Button,
  CellTitle,
  DataTable,
  EmptyState,
  FilterPills,
  Input,
  Pagination,
  Toolbar,
  type Column,
} from "@/components/ui";
import { SearchIcon } from "@/components/icons";

type Estado = "" | "ACTIVO" | "INACTIVO";

/** Búsqueda con espera (300 ms), filtro de estado y paginación sobre un listado de la API de plataforma. */
function useListado<T>(base: string) {
  const [busqueda, setBusqueda] = useState("");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<Estado>("ACTIVO");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(busqueda.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const params = new URLSearchParams({ page: String(page) });
  if (q) params.set("q", q);
  if (estado) params.set("estado", estado);
  const res = useGymData<GymPaginado<T>>(`${base}?${params}`);
  const p = res.data?.pagination;
  return {
    ...res,
    busqueda,
    setBusqueda,
    estado,
    setEstado: (e: Estado) => {
      setEstado(e);
      setPage(1);
    },
    setPage,
    filas: res.data?.data ?? [],
    paginacion: p ? { total: p.total, page: p.page, limit: p.pageSize, totalPages: p.pages } : null,
  };
}

function Filtros({
  l,
  placeholder,
  etiquetas,
}: {
  l: { busqueda: string; setBusqueda: (v: string) => void; estado: Estado; setEstado: (e: Estado) => void };
  placeholder: string;
  etiquetas: [string, string];
}) {
  return (
    <Toolbar>
      <FilterPills<Estado>
        value={l.estado}
        onChange={l.setEstado}
        options={[
          { value: "ACTIVO", label: etiquetas[0] },
          { value: "INACTIVO", label: etiquetas[1] },
          { value: "", label: "Todos" },
        ]}
      />
      <Input
        type="search"
        className="lg:ml-auto lg:w-80"
        leading={<SearchIcon width={16} height={16} />}
        placeholder={placeholder}
        value={l.busqueda}
        onChange={(e) => l.setBusqueda(e.target.value)}
        aria-label={placeholder}
      />
    </Toolbar>
  );
}

function ErrorListado({ error, reload, loading }: { error: { message: string } | null; reload: () => void; loading: boolean }) {
  if (!error) return null;
  return (
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
  );
}

/** Socios (clientes) del gimnasio, solo lectura. */
export function SociosTab({ empresaId }: { empresaId: number }) {
  const l = useListado<GymSocio>(`empresas/${empresaId}/socios`);
  const columnas: Column<GymSocio>[] = [
    {
      key: "socio",
      header: "Socio",
      cell: (s) => <CellTitle title={s.nombreCompleto} subtitle={<span className="font-mono">DNI {s.dni}</span>} />,
    },
    {
      key: "contacto",
      header: "Contacto",
      hideOnMobile: true,
      cell: (s) => (
        <div className="min-w-0 text-[13px]">
          <p className="truncate">{s.telefono ?? "—"}</p>
          <p className="max-w-[14rem] truncate text-muted">{s.email ?? ""}</p>
        </div>
      ),
    },
    {
      key: "membresia",
      header: "Membresía vigente",
      cell: (s) =>
        s.membresia ? (
          <div className="min-w-0 text-[13px]">
            <p className="flex items-center gap-1.5 truncate font-medium text-ink">
              {s.membresia.nombre}
              {s.membresia.congelada && <Badge tone="info">Congelada</Badge>}
            </p>
            <p className="text-muted">Vence {formatDate(s.membresia.fechaFin)}</p>
          </div>
        ) : (
          <span className="text-[13px] text-subtle">Sin membresía</span>
        ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (s) =>
        s.estado === "ACTIVO" ? (
          <Badge tone="success" dot>
            Activo
          </Badge>
        ) : (
          <Badge tone="neutral" dot>
            Inactivo
          </Badge>
        ),
    },
    {
      key: "alta",
      header: "Registro",
      hideOnMobile: true,
      className: "whitespace-nowrap text-muted",
      cell: (s) => formatDate(s.fechaCreacion),
    },
  ];

  return (
    <>
      <Filtros l={l} placeholder="Buscar por nombre, DNI, teléfono o correo…" etiquetas={["Activos", "Inactivos"]} />
      <ErrorListado error={l.error} reload={l.reload} loading={l.loading} />
      <DataTable
        columns={columnas}
        rows={l.filas}
        rowKey={(s) => s.id}
        loading={l.loading && !l.data}
        footer={<Pagination pagination={l.paginacion} onPageChange={l.setPage} disabled={l.loading} />}
        empty={<EmptyState title="No hay socios en esta vista" description={l.busqueda ? "Prueba con otra búsqueda." : undefined} />}
      />
    </>
  );
}

/** Productos del gimnasio, solo lectura. */
export function ProductosTab({ empresaId }: { empresaId: number }) {
  const l = useListado<GymProducto>(`empresas/${empresaId}/productos`);
  const columnas: Column<GymProducto>[] = [
    {
      key: "producto",
      header: "Producto",
      cell: (p) => <CellTitle title={p.nombre} subtitle={p.categoria ?? "Sin categoría"} image={gymAsset(p.imagenUrl) ?? false} />,
    },
    { key: "precio", header: "Precio", align: "right", className: "whitespace-nowrap tabular-nums", cell: (p) => formatPEN(p.precio) },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      className: "tabular-nums",
      cell: (p) => (
        <span className={p.stock <= p.stockMinimo ? "font-medium text-red-600" : undefined} title={`Mínimo: ${p.stockMinimo}`}>
          {formatInt(p.stock)}
        </span>
      ),
    },
    {
      key: "vence",
      header: "Vencimiento",
      hideOnMobile: true,
      className: "whitespace-nowrap text-muted",
      cell: (p) => (p.fechaVencimiento ? formatDate(p.fechaVencimiento) : "—"),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (p) =>
        p.activo ? (
          <Badge tone="success" dot>
            Activo
          </Badge>
        ) : (
          <Badge tone="neutral" dot>
            Inactivo
          </Badge>
        ),
    },
  ];

  return (
    <>
      <Filtros l={l} placeholder="Buscar producto…" etiquetas={["Activos", "Inactivos"]} />
      <ErrorListado error={l.error} reload={l.reload} loading={l.loading} />
      <DataTable
        columns={columnas}
        rows={l.filas}
        rowKey={(p) => p.id}
        loading={l.loading && !l.data}
        footer={<Pagination pagination={l.paginacion} onPageChange={l.setPage} disabled={l.loading} />}
        empty={<EmptyState title="No hay productos en esta vista" description={l.busqueda ? "Prueba con otra búsqueda." : undefined} />}
      />
    </>
  );
}
