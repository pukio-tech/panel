"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GymEmpresaResumen } from "@/lib/gym-types";
import { GYM_APP_URL } from "@/lib/gym-api";
import { formatDate, formatInt, formatPEN, formatUso } from "@/lib/gym-utils";
import { useGymData } from "@/lib/hooks/useGymData";
import {
  Alert,
  Button,
  ButtonLink,
  DataTable,
  EmptyState,
  FilterPills,
  Input,
  Menu,
  PageHeader,
  Toolbar,
  type Column,
} from "@/components/ui";
import { DumbbellIcon, PlusIcon, SearchIcon } from "@/components/icons";
import {
  EmpresaLogo,
  EstadoBadge,
  GYM_EMPRESAS,
  PlanBadge,
  useEntrarComoAdmin,
} from "@/components/gym/shared";

type Tab = "todas" | "activas" | "suspendidas";

const sobreLimite = (usados: number, maximo: number | null) => maximo != null && usados >= maximo;

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function GymEmpresasPage() {
  const router = useRouter();
  const { data, error, initialLoading, loading, reload } = useGymData<{ data: GymEmpresaResumen[] }>("empresas");
  const { entrar, pendingId } = useEntrarComoAdmin();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("todas");

  const empresas = useMemo(() => data?.data ?? [], [data]);
  const counts = useMemo(
    () => ({
      todas: empresas.length,
      activas: empresas.filter((e) => e.activo).length,
      suspendidas: empresas.filter((e) => !e.activo).length,
    }),
    [empresas],
  );

  const rows = useMemo(() => {
    const q = normalize(search.trim());
    return empresas.filter((e) => {
      if (tab === "activas" && !e.activo) return false;
      if (tab === "suspendidas" && e.activo) return false;
      if (!q) return true;
      return normalize(`${e.nombre} ${e.slug} ${e.ruc ?? ""} ${e.planNombre}`).includes(q);
    });
  }, [empresas, search, tab]);

  const columns: Column<GymEmpresaResumen>[] = [
    {
      key: "empresa",
      header: "Empresa",
      cell: (e) => (
        <div className="flex min-w-0 items-center gap-3">
          <EmpresaLogo nombre={e.nombre} logoUrl={e.logoUrl} />
          <div className="min-w-0">
            <p className="max-w-[16rem] truncate font-medium text-ink xl:max-w-[20rem]">{e.nombre}</p>
            <p className="truncate font-mono text-xs text-muted">{e.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "ruc",
      header: "RUC",
      hideOnMobile: true,
      cell: (e) => (e.ruc ? <span className="whitespace-nowrap font-mono text-xs">{e.ruc}</span> : <span className="text-subtle">—</span>),
    },
    { key: "plan", header: "Plan", hideOnMobile: true, cell: (e) => <PlanBadge plan={e.plan} nombre={e.planNombre} /> },
    { key: "estado", header: "Estado", cell: (e) => <EstadoBadge activo={e.activo} /> },
    {
      key: "socios",
      header: "Socios activos",
      align: "right",
      hideOnMobile: true,
      className: "tabular-nums",
      cell: (e) => (
        <span className={sobreLimite(e.metricas.sociosActivos, e.limites.maxSocios) ? "text-red-600" : undefined}>
          {formatUso(e.metricas.sociosActivos, e.limites.maxSocios)}
        </span>
      ),
    },
    {
      key: "ingresos",
      header: "Ingresos del mes",
      align: "right",
      className: "whitespace-nowrap tabular-nums",
      cell: (e) => formatPEN(e.metricas.ingresosMes),
    },
    {
      key: "usuarios",
      header: "Usuarios",
      align: "right",
      hideOnMobile: true,
      className: "tabular-nums",
      cell: (e) => (
        <span className={sobreLimite(e.metricas.usuariosActivos, e.limites.maxUsuarios) ? "text-red-600" : undefined}>
          {formatUso(e.metricas.usuariosActivos, e.limites.maxUsuarios)}
        </span>
      ),
    },
    {
      key: "creada",
      header: "Creada",
      hideOnMobile: true,
      className: "whitespace-nowrap text-muted",
      cell: (e) => formatDate(e.fechaCreacion),
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (e) => (
        <Menu
          items={[
            { label: "Ver", href: `${GYM_EMPRESAS}/${e.id}` },
            {
              label: "Entrar como administrador",
              disabled: pendingId === e.id,
              hint: pendingId === e.id ? "Generando acceso…" : undefined,
              onSelect: () => entrar(e),
            },
            {
              label: "Abrir catálogo",
              disabled: !e.activo,
              hint: !e.activo ? "Oculto mientras está suspendida" : undefined,
              onSelect: () => window.open(`${GYM_APP_URL}/catalogo/${e.slug}`, "_blank", "noopener"),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Empresas"
        subtitle={
          <>
            Gimnasios clientes de Gym Manager
            {data && <span>· {formatInt(empresas.length)} registradas</span>}
          </>
        }
        actions={
          <ButtonLink href={`${GYM_EMPRESAS}/nueva`}>
            <PlusIcon width={16} height={16} /> Nueva empresa
          </ButtonLink>
        }
      />

      <Toolbar>
        <FilterPills<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "todas", label: "Todas", count: data ? counts.todas : null },
            { value: "activas", label: "Activas", count: data ? counts.activas : null },
            { value: "suspendidas", label: "Suspendidas", count: data ? counts.suspendidas : null },
          ]}
        />
      </Toolbar>

      <Toolbar>
        <Input
          type="search"
          className="lg:w-96"
          leading={<SearchIcon width={16} height={16} />}
          placeholder="Buscar por nombre, código o RUC…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar empresas"
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
        columns={columns}
        rows={rows}
        rowKey={(e) => e.id}
        loading={initialLoading}
        onRowClick={(e) => router.push(`${GYM_EMPRESAS}/${e.id}`)}
        empty={
          empresas.length === 0 && !error ? (
            <EmptyState
              icon={<DumbbellIcon />}
              title="Aún no hay empresas"
              description="Registra el primer gimnasio con su administrador inicial."
              action={
                <ButtonLink href={`${GYM_EMPRESAS}/nueva`}>
                  <PlusIcon width={16} height={16} /> Nueva empresa
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState
              icon={<DumbbellIcon />}
              title="No hay empresas en esta vista"
              description={search ? "Prueba con otro nombre, código o RUC." : undefined}
            />
          )
        }
      />
    </>
  );
}
