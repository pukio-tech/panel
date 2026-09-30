"use client";

import { useRouter } from "next/navigation";
import type { TouristPlace } from "@/lib/types";
import { numberFmt, titleCase } from "@/lib/utils";
import { usePaginatedList } from "@/lib/hooks/usePaginatedList";
import { useCounts } from "@/lib/hooks/useCounts";
import { useRowActions } from "@/lib/hooks/useRowActions";
import { useColumnVisibility } from "@/lib/hooks/useColumnVisibility";
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  CellTitle,
  DataTable,
  EmptyState,
  FilterPills,
  Input,
  LiveDot,
  Menu,
  PageHeader,
  Pagination,
  SourceBadge,
  StatusBadge,
  Toolbar,
  type Column,
} from "@/components/ui";
import { MapPinIcon, PlusIcon, SearchIcon } from "@/components/icons";

const ENDPOINT = "/api/admin/places";
const BASE = "/dashboard/opendata/lugares";

type Tab = "all" | "mincetur" | "manual" | "inactive";

const TAB_FILTERS: Record<Tab, Record<string, string | boolean | undefined>> = {
  all: { source: undefined, isPublished: undefined },
  mincetur: { source: "mincetur", isPublished: undefined },
  manual: { source: "manual", isPublished: undefined },
  inactive: { source: undefined, isPublished: false },
};

export default function LugaresPage() {
  const router = useRouter();
  const list = usePaginatedList<TouristPlace>(ENDPOINT);
  const counts = useCounts(ENDPOINT, TAB_FILTERS, list.version);
  const tab = (Object.keys(TAB_FILTERS) as Tab[]).find(
    (t) =>
      TAB_FILTERS[t].source === list.filters.source &&
      TAB_FILTERS[t].isPublished === list.filters.isPublished,
  ) ?? "all";

  const actions = useRowActions<TouristPlace>({
    endpoint: ENDPOINT,
    activeField: "isPublished",
    getName: (p) => p.name,
    onDone: list.reload,
  });

  const columns: Column<TouristPlace>[] = [
    {
      key: "name",
      alwaysVisible: true,
      header: "Nombre",
      cell: (p) => <CellTitle title={p.name} subtitle={`#${p.id} · /${p.slug ?? ""}`} image={p.imageUrl ?? null} />,
    },
    {
      key: "category",
      header: "Categoría",
      hideOnMobile: true,
      cell: (p) => (p.category ? <Badge>{titleCase(p.category)}</Badge> : "—"),
    },
    {
      key: "region",
      header: "Región",
      hideOnMobile: true,
      cell: (p) => (
        <div className="whitespace-nowrap">
          <p className="text-ink">{titleCase(p.department)}</p>
          <p className="text-xs text-muted">{titleCase(p.province)}</p>
        </div>
      ),
    },
    {
      key: "coords",
      defaultHidden: true,
      header: "Coordenadas",
      hideOnMobile: true,
      cell: (p) =>
        p.latitude != null && p.longitude != null ? (
          <a
            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="whitespace-nowrap font-mono text-xs hover:text-ink hover:underline"
          >
            {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
          </a>
        ) : (
          <Badge tone="warning">Sin coordenadas</Badge>
        ),
    },
    { key: "source", defaultHidden: true, header: "Origen", hideOnMobile: true, cell: (p) => <SourceBadge source={p.source} importedLabel="MINCETUR" /> },
    {
      key: "status",
      header: "Estado",
      cell: (p) => <StatusBadge active={p.isPublished} />,
    },
    {
      key: "actions",
      alwaysVisible: true,
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (p) => (
        <Menu
          items={[
            { label: "Editar", href: `${BASE}/${p.id}` },
            {
              label: p.isPublished ? "Desactivar" : "Activar",
              onSelect: () => actions.toggleActive(p, !p.isPublished),
              hint: p.source === "mincetur" ? "El scraper lo reactivará" : undefined,
            },
            {
              label: "Eliminar",
              danger: true,
              disabled: p.source !== "manual",
              hint: p.source !== "manual" ? "Solo registros manuales" : undefined,
              onSelect: () => actions.askDelete(p),
            },
          ]}
        />
      ),
    },
  ];
  const { visibleColumns, control: columnsControl } = useColumnVisibility("turismo", columns);

  return (
    <>
      <PageHeader
        title="Turismo"
        subtitle={
          <>
            <LiveDot />
            Inventario MINCETUR
            {list.pagination && <span>· {numberFmt.format(counts.all ?? list.pagination.total)} registros</span>}
          </>
        }
        actions={
          <ButtonLink href={`${BASE}/nuevo`}>
            <PlusIcon width={16} height={16} /> Nuevo lugar
          </ButtonLink>
        }
      />

      <Toolbar>
        <FilterPills<Tab>
          value={tab}
          onChange={(t) => {
            list.setFilter("source", TAB_FILTERS[t].source);
            list.setFilter("isPublished", TAB_FILTERS[t].isPublished);
          }}
          options={[
            { value: "all", label: "Todos", count: counts.all },
            { value: "mincetur", label: "MINCETUR", count: counts.mincetur },
            { value: "manual", label: "Manuales", count: counts.manual },
            { value: "inactive", label: "Inactivos", count: counts.inactive },
          ]}
        />
        <Input
          type="search"
          className="lg:ml-auto lg:w-80"
          leading={<SearchIcon width={16} height={16} />}
          placeholder="Buscar por nombre, región, provincia…"
          value={list.search}
          onChange={(e) => list.setSearch(e.target.value)}
          aria-label="Buscar lugares"
        />
        {columnsControl}
      </Toolbar>

      {list.error && (
        <div className="mb-4">
          <Alert action={<Button variant="secondary" size="sm" onClick={list.reload}>Reintentar</Button>}>
            {list.error}
          </Alert>
        </div>
      )}

      <DataTable
        columns={visibleColumns}
        rows={list.items}
        rowKey={(p) => p.id}
        loading={list.loading}
        onRowClick={(p) => router.push(`${BASE}/${p.id}`)}
        empty={
          <EmptyState
            icon={<MapPinIcon />}
            title={list.search ? "Sin resultados" : "No hay lugares en esta vista"}
            description={list.search ? "Prueba con otro término de búsqueda." : undefined}
          />
        }
        footer={<Pagination pagination={list.pagination} onPageChange={list.goToPage} disabled={list.loading} />}
      />
      {actions.dialog}
    </>
  );
}
