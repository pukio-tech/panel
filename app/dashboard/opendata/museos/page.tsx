"use client";

import { useRouter } from "next/navigation";
import type { Museum, MuseumOptions } from "@/lib/types";
import { numberFmt, titleCase } from "@/lib/utils";
import { usePaginatedList } from "@/lib/hooks/usePaginatedList";
import { useCounts } from "@/lib/hooks/useCounts";
import { useApiData } from "@/lib/hooks/useApiData";
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
  Menu,
  PageHeader,
  Pagination,
  Select,
  SourceBadge,
  StatusBadge,
  Toolbar,
  type Column,
} from "@/components/ui";
import { LandmarkIcon, PlusIcon, SearchIcon } from "@/components/icons";

const ENDPOINT = "/api/admin/museums";
const BASE = "/dashboard/opendata/museos";

type Tab = "all" | "importado" | "manual" | "inactive";

const TAB_FILTERS: Record<Tab, Record<string, string | boolean | undefined>> = {
  all: { source: undefined, isActive: undefined },
  importado: { source: "importado", isActive: undefined },
  manual: { source: "manual", isActive: undefined },
  inactive: { source: undefined, isActive: false },
};

export default function MuseosPage() {
  const router = useRouter();
  const list = usePaginatedList<Museum>(ENDPOINT);
  const counts = useCounts(ENDPOINT, TAB_FILTERS, list.version);
  const { data: options } = useApiData<MuseumOptions>(`${ENDPOINT}/options`);
  const tab =
    (Object.keys(TAB_FILTERS) as Tab[]).find(
      (t) => TAB_FILTERS[t].source === list.filters.source && TAB_FILTERS[t].isActive === list.filters.isActive,
    ) ?? "all";

  const actions = useRowActions<Museum>({
    endpoint: ENDPOINT,
    activeField: "isActive",
    getName: (m) => m.name,
    onDone: list.reload,
  });

  const columns: Column<Museum>[] = [
    {
      key: "name",
      alwaysVisible: true,
      header: "Museo",
      cell: (m) => (
        <CellTitle title={m.name} subtitle={m.administration ?? m.category ?? undefined} image={m.cardImage || m.coverImage || null} />
      ),
    },
    {
      key: "type",
      header: "Tipo",
      hideOnMobile: true,
      cell: (m) => (m.museumType ? <Badge>{m.museumType}</Badge> : "—"),
    },
    {
      key: "location",
      header: "Ubicación",
      hideOnMobile: true,
      cell: (m) =>
        m.department ? (
          <div className="whitespace-nowrap">
            <p className="text-ink">{titleCase(m.department)}</p>
            <p className="text-xs text-muted">{titleCase(m.district)}</p>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "open",
      header: "Atención",
      hideOnMobile: true,
      cell: (m) => (
        <Badge tone={m.status === "Abierto" ? "success" : "danger"} dot>
          {m.status ?? "—"}
        </Badge>
      ),
    },
    { key: "source", defaultHidden: true, header: "Origen", hideOnMobile: true, cell: (m) => <SourceBadge source={m.source} /> },
    { key: "status", header: "Estado", cell: (m) => <StatusBadge active={m.isActive} /> },
    {
      key: "actions",
      alwaysVisible: true,
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (m) => (
        <Menu
          items={[
            { label: "Editar", href: `${BASE}/${m.id}` },
            { label: m.isActive ? "Desactivar" : "Activar", onSelect: () => actions.toggleActive(m, !m.isActive) },
            {
              label: "Eliminar",
              danger: true,
              disabled: m.source !== "manual",
              hint: m.source !== "manual" ? "Solo registros manuales" : undefined,
              onSelect: () => actions.askDelete(m),
            },
          ]}
        />
      ),
    },
  ];
  const { visibleColumns, control: columnsControl } = useColumnVisibility("museos", columns);

  return (
    <>
      <PageHeader
        title="Museos"
        subtitle={
          <>
            Red de museos del Perú
            {counts.all != null && <span>· {numberFmt.format(counts.all)} registros</span>}
          </>
        }
        actions={
          <ButtonLink href={`${BASE}/nuevo`}>
            <PlusIcon width={16} height={16} /> Nuevo museo
          </ButtonLink>
        }
      />

      <Toolbar>
        <FilterPills<Tab>
          value={tab}
          onChange={(t) => {
            list.setFilter("source", TAB_FILTERS[t].source);
            list.setFilter("isActive", TAB_FILTERS[t].isActive);
          }}
          options={[
            { value: "all", label: "Todos", count: counts.all },
            { value: "importado", label: "Importados", count: counts.importado },
            { value: "manual", label: "Manuales", count: counts.manual },
            { value: "inactive", label: "Inactivos", count: counts.inactive },
          ]}
        />
        <div className="flex flex-col gap-3 sm:flex-row lg:ml-auto">
          <Select
            className="sm:w-44"
            aria-label="Filtrar por atención"
            value={String(list.filters.status ?? "")}
            onChange={(e) => list.setFilter("status", e.target.value || undefined)}
          >
            <option value="">Abiertos y cerrados</option>
            {(options?.statuses ?? ["Abierto", "Cerrado"]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Input
            type="search"
            className="sm:w-72"
            leading={<SearchIcon width={16} height={16} />}
            placeholder="Buscar museo o región…"
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            aria-label="Buscar museos"
          />
          {columnsControl}
        </div>
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
        rowKey={(m) => m.id}
        loading={list.loading}
        onRowClick={(m) => router.push(`${BASE}/${m.id}`)}
        empty={<EmptyState icon={<LandmarkIcon />} title="No hay museos en esta vista" />}
        footer={<Pagination pagination={list.pagination} onPageChange={list.goToPage} disabled={list.loading} />}
      />
      {actions.dialog}
    </>
  );
}
