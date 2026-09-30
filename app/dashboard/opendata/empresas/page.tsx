"use client";

import { useRouter } from "next/navigation";
import type { Company, CompanyOptions } from "@/lib/types";
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
  type BadgeTone,
  type Column,
} from "@/components/ui";
import { BuildingIcon, PlusIcon, SearchIcon } from "@/components/icons";

const ENDPOINT = "/api/admin/companies";
const BASE = "/dashboard/opendata/empresas";

type Tab = "all" | "importado" | "manual" | "inactive";

const TAB_FILTERS: Record<Tab, Record<string, string | boolean | undefined>> = {
  all: { source: undefined, isActive: undefined },
  importado: { source: "importado", isActive: undefined },
  manual: { source: "manual", isActive: undefined },
  inactive: { source: undefined, isActive: false },
};

function conditionTone(condition?: string | null): BadgeTone {
  if (condition === "HABIDO") return "success";
  if (condition === "NO HABIDO" || condition === "NO HALLADO") return "danger";
  return "warning";
}

export default function EmpresasPage() {
  const router = useRouter();
  const list = usePaginatedList<Company>(ENDPOINT);
  const counts = useCounts(ENDPOINT, TAB_FILTERS, list.version);
  const { data: options } = useApiData<CompanyOptions>(`${ENDPOINT}/options`);
  const tab =
    (Object.keys(TAB_FILTERS) as Tab[]).find(
      (t) => TAB_FILTERS[t].source === list.filters.source && TAB_FILTERS[t].isActive === list.filters.isActive,
    ) ?? "all";

  const actions = useRowActions<Company>({
    endpoint: ENDPOINT,
    activeField: "isActive",
    getName: (c) => c.businessName,
    onDone: list.reload,
  });

  const columns: Column<Company>[] = [
    {
      key: "name",
      alwaysVisible: true,
      header: "Razón social",
      cell: (c) => (
        <CellTitle
          title={c.businessName}
          subtitle={c.tradeName && c.tradeName !== "-" ? c.tradeName : undefined}
        />
      ),
    },
    {
      key: "ruc",
      header: "RUC",
      cell: (c) => <span className="whitespace-nowrap font-mono text-xs text-ink">{c.ruc}</span>,
    },
    {
      key: "activity",
      header: "Actividad",
      hideOnMobile: true,
      cell: (c) =>
        c.economicActivity ? (
          <p className="max-w-[16rem] truncate text-[13px]" title={c.economicActivity}>
            {c.ciiuCode && <span className="mr-1.5 font-mono text-xs text-subtle">{c.ciiuCode}</span>}
            {titleCase(c.economicActivity)}
          </p>
        ) : (
          "—"
        ),
    },
    {
      key: "location",
      header: "Ubicación",
      hideOnMobile: true,
      cell: (c) =>
        c.department ? (
          <div className="whitespace-nowrap">
            <p className="text-ink">{titleCase(c.department)}</p>
            <p className="text-xs text-muted">{titleCase(c.district)}</p>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "condition",
      defaultHidden: true,
      header: "Condición",
      hideOnMobile: true,
      cell: (c) => <Badge tone={conditionTone(c.domicileCondition)}>{titleCase(c.domicileCondition) || "—"}</Badge>,
    },
    { key: "source", defaultHidden: true, header: "Origen", hideOnMobile: true, cell: (c) => <SourceBadge source={c.source} /> },
    { key: "status", header: "Estado", cell: (c) => <StatusBadge active={c.isActive} /> },
    {
      key: "actions",
      alwaysVisible: true,
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (c) => (
        <Menu
          items={[
            { label: "Editar", href: `${BASE}/${c.id}` },
            { label: c.isActive ? "Desactivar" : "Activar", onSelect: () => actions.toggleActive(c, !c.isActive) },
            {
              label: "Eliminar",
              danger: true,
              disabled: c.source !== "manual",
              hint: c.source !== "manual" ? "Solo registros manuales" : undefined,
              onSelect: () => actions.askDelete(c),
            },
          ]}
        />
      ),
    },
  ];
  const { visibleColumns, control: columnsControl } = useColumnVisibility("empresas", columns);

  return (
    <>
      <PageHeader
        title="Empresas"
        subtitle={
          <>
            Directorio de contribuyentes
            {counts.all != null && <span>· {numberFmt.format(counts.all)} registros</span>}
          </>
        }
        actions={
          <ButtonLink href={`${BASE}/nuevo`}>
            <PlusIcon width={16} height={16} /> Nueva empresa
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
            { value: "all", label: "Todas", count: counts.all },
            { value: "importado", label: "Importadas", count: counts.importado },
            { value: "manual", label: "Manuales", count: counts.manual },
            { value: "inactive", label: "Inactivos", count: counts.inactive },
          ]}
        />
      </Toolbar>

      <Toolbar>
        <Input
          type="search"
          className="lg:w-96"
          leading={<SearchIcon width={16} height={16} />}
          placeholder="Buscar por razón social, nombre comercial o RUC…"
          value={list.search}
          onChange={(e) => list.setSearch(e.target.value)}
          aria-label="Buscar empresas"
        />
        <Select
          className="lg:w-52"
          aria-label="Filtrar por región"
          value={String(list.filters.department ?? "")}
          onChange={(e) => list.setFilter("department", e.target.value || undefined)}
        >
          <option value="">Todas las regiones</option>
          {options?.departments.map((d) => (
            <option key={d.id} value={d.name}>
              {titleCase(d.name)}
            </option>
          ))}
        </Select>
        <Select
          className="lg:w-52"
          aria-label="Filtrar por condición"
          value={String(list.filters.domicileCondition ?? "")}
          onChange={(e) => list.setFilter("domicileCondition", e.target.value || undefined)}
        >
          <option value="">Toda condición</option>
          {options?.domicileConditions.map((c) => (
            <option key={c} value={c}>
              {titleCase(c)}
            </option>
          ))}
        </Select>
        <div className="lg:ml-auto">{columnsControl}</div>
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
        rowKey={(c) => c.id}
        loading={list.loading}
        onRowClick={(c) => router.push(`${BASE}/${c.id}`)}
        empty={
          <EmptyState
            icon={<BuildingIcon />}
            title="No hay empresas en esta vista"
            description={list.search ? "Prueba con otro término o RUC." : undefined}
          />
        }
        footer={<Pagination pagination={list.pagination} onPageChange={list.goToPage} disabled={list.loading} />}
      />
      {actions.dialog}
    </>
  );
}
