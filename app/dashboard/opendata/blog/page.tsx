"use client";

import { useRouter } from "next/navigation";
import type { BlogPost } from "@/lib/types";
import { usePaginatedList } from "@/lib/hooks/usePaginatedList";
import { useCounts } from "@/lib/hooks/useCounts";
import { useRowActions } from "@/lib/hooks/useRowActions";
import { useColumnVisibility } from "@/lib/hooks/useColumnVisibility";
import {
  Alert,
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
  StatusBadge,
  Toolbar,
  type Column,
} from "@/components/ui";
import { FileIcon, PlusIcon, SearchIcon } from "@/components/icons";

const ENDPOINT = "/api/admin/posts";
const BASE = "/dashboard/opendata/blog";
const dateFmt = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" });

type Tab = "all" | "published" | "draft";
const TAB_FILTERS: Record<Tab, Record<string, boolean | undefined>> = {
  all: { isPublished: undefined },
  published: { isPublished: true },
  draft: { isPublished: false },
};

export default function BlogPage() {
  const router = useRouter();
  const list = usePaginatedList<BlogPost>(ENDPOINT);
  const counts = useCounts(ENDPOINT, TAB_FILTERS, list.version);
  const tab =
    (Object.keys(TAB_FILTERS) as Tab[]).find((t) => TAB_FILTERS[t].isPublished === list.filters.isPublished) ?? "all";

  const actions = useRowActions<BlogPost>({
    endpoint: ENDPOINT,
    activeField: "isPublished",
    getName: (p) => p.title,
    onDone: list.reload,
  });

  const columns: Column<BlogPost>[] = [
    {
      key: "title",
      alwaysVisible: true,
      header: "Artículo",
      cell: (p) => <CellTitle title={p.title} subtitle={`/${p.slug}`} image={p.coverImage ?? null} />,
    },
    {
      key: "date",
      header: "Fecha",
      hideOnMobile: true,
      cell: (p) => <span className="whitespace-nowrap">{dateFmt.format(new Date(p.publishedAt ?? p.createdAt))}</span>,
    },
    {
      key: "status",
      header: "Estado",
      cell: (p) => <StatusBadge active={p.isPublished} activeLabel="Publicado" inactiveLabel="Borrador" />,
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
            { label: p.isPublished ? "Pasar a borrador" : "Publicar", onSelect: () => actions.toggleActive(p, !p.isPublished) },
            { label: "Eliminar", danger: true, onSelect: () => actions.askDelete(p) },
          ]}
        />
      ),
    },
  ];
  const { visibleColumns, control: columnsControl } = useColumnVisibility("blog", columns);

  return (
    <>
      <PageHeader
        title="Blog / Artículos"
        subtitle="Publicaciones del blog de OpenData Perú"
        actions={
          <ButtonLink href={`${BASE}/nuevo`}>
            <PlusIcon width={16} height={16} /> Nuevo artículo
          </ButtonLink>
        }
      />

      <Toolbar>
        <FilterPills<Tab>
          value={tab}
          onChange={(t) => list.setFilter("isPublished", TAB_FILTERS[t].isPublished)}
          options={[
            { value: "all", label: "Todos", count: counts.all },
            { value: "published", label: "Publicados", count: counts.published },
            { value: "draft", label: "Borradores", count: counts.draft },
          ]}
        />
        <Input
          type="search"
          className="lg:ml-auto lg:w-80"
          leading={<SearchIcon width={16} height={16} />}
          placeholder="Buscar artículos…"
          value={list.search}
          onChange={(e) => list.setSearch(e.target.value)}
          aria-label="Buscar artículos"
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
            icon={<FileIcon />}
            title="Aún no hay artículos"
            description="Escribe el primero para el blog de OpenData Perú."
            action={
              <ButtonLink href={`${BASE}/nuevo`} variant="secondary">
                <PlusIcon width={16} height={16} /> Nuevo artículo
              </ButtonLink>
            }
          />
        }
        footer={<Pagination pagination={list.pagination} onPageChange={list.goToPage} disabled={list.loading} />}
      />
      {actions.dialog}
    </>
  );
}
