"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import type { GymEmpresaDetalle } from "@/lib/gym-types";
import { formatDate, formatInt, formatPEN, formatRelative } from "@/lib/gym-utils";
import { useGymData } from "@/lib/hooks/useGymData";
import {
  Alert,
  Button,
  ButtonLink,
  EmptyState,
  IconButton,
  PageHeader,
  Skeleton,
  StatCard,
  useToast,
} from "@/components/ui";
import { CopyIcon, DumbbellIcon, LogInIcon, RefreshIcon } from "@/components/icons";
import { DatosGeneralesForm } from "@/components/gym/DatosGeneralesForm";
import { EstadoCard } from "@/components/gym/EstadoCard";
import { FacturacionCard } from "@/components/gym/FacturacionCard";
import { UsuariosCard } from "@/components/gym/UsuariosCard";
import {
  copyToClipboard,
  EmpresaLogo,
  EstadoBadge,
  GYM_EMPRESAS,
  GYM_PLANES,
  PlanBadge,
  SectionCard,
  useEntrarComoAdmin,
  UsoLimite,
} from "@/components/gym/shared";

function UrlRow({ label, url }: { label: string; url: string }) {
  const toast = useToast();
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink hover:underline">
          {url}
        </a>
        <IconButton
          label={`Copiar ${label.toLowerCase()}`}
          onClick={async () => {
            const ok = await copyToClipboard(url);
            toast(ok ? "Enlace copiado." : "No se pudo copiar el enlace.", ok ? "success" : "warning");
          }}
        >
          <CopyIcon width={15} height={15} />
        </IconButton>
      </div>
    </div>
  );
}

export default function GymEmpresaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { data, setData, error, initialLoading, loading, reload } = useGymData<{ data: GymEmpresaDetalle }>(
    /^\d+$/.test(id) ? `empresas/${id}` : null,
  );
  const { entrar, pendingId } = useEntrarComoAdmin();
  // Remonta los formularios tras guardar para que tomen los nuevos valores iniciales
  const [version, setVersion] = useState(0);
  const empresa = data?.data;

  function onSaved(e: GymEmpresaDetalle) {
    setData({ data: e });
    setVersion((v) => v + 1);
  }

  if (!/^\d+$/.test(id) || error?.status === 404) {
    return (
      <>
        <PageHeader title="Empresa no encontrada" back={{ href: GYM_EMPRESAS, label: "Empresas" }} />
        <EmptyState
          icon={<DumbbellIcon />}
          title="La empresa no existe"
          description="Puede que el enlace sea incorrecto."
          action={<ButtonLink href={GYM_EMPRESAS}>Ver empresas</ButtonLink>}
        />
      </>
    );
  }

  if (!empresa) {
    return (
      <>
        <PageHeader title={initialLoading ? "Cargando…" : "Empresa"} back={{ href: GYM_EMPRESAS, label: "Empresas" }} />
        {error ? (
          <Alert
            title="No se pudo cargar la empresa"
            action={
              <Button variant="secondary" size="sm" onClick={reload} loading={loading}>
                Reintentar
              </Button>
            }
          >
            {error.message}
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-[420px] w-full rounded-xl" />
          </div>
        )}
      </>
    );
  }

  const m = empresa.metricas;

  return (
    <>
      <PageHeader
        title={empresa.nombre}
        back={{ href: GYM_EMPRESAS, label: "Empresas" }}
        subtitle={
          <>
            <EmpresaLogo nombre={empresa.nombre} logoUrl={empresa.logoUrl} size={24} className="rounded-md" />
            <span className="font-mono">{empresa.slug}</span>
            <EstadoBadge activo={empresa.activo} />
            <PlanBadge plan={empresa.plan} nombre={empresa.planNombre} />
            <span>· Cliente desde {formatDate(empresa.fechaCreacion)}</span>
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={reload} loading={loading}>
              {!loading && <RefreshIcon width={15} height={15} />}
              Actualizar
            </Button>
            <Button
              onClick={() => entrar(empresa)}
              loading={pendingId === empresa.id}
              disabled={!empresa.activo}
              title={empresa.activo ? undefined : "Reactiva la empresa para poder ingresar"}
            >
              {pendingId !== empresa.id && <LogInIcon width={15} height={15} />}
              Entrar como administrador
            </Button>
          </>
        }
      />

      {!empresa.activo && (
        <div className="mb-6">
          <Alert title="Empresa suspendida">
            {empresa.motivoSuspension ?? "Sin motivo registrado."} Sus usuarios no pueden ingresar y su catálogo está oculto.
          </Alert>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ingresos del mes" value={formatPEN(m.ingresosMes)} hint={`${formatInt(m.ventasMes)} ventas · hoy ${formatPEN(m.ingresosHoy)}`} />
        <StatCard
          label="Socios activos"
          value={formatInt(m.sociosActivos)}
          suffix={empresa.limites.maxSocios != null ? `de ${formatInt(empresa.limites.maxSocios)}` : undefined}
          hint={`${formatInt(m.suscripcionesVigentes)} suscripciones vigentes`}
        />
        <StatCard label="Asistencias hoy" value={formatInt(m.asistenciasHoy)} hint={`${formatInt(m.solicitudesPendientes)} solicitudes pendientes`} />
        <StatCard
          label="Última venta"
          value={<span className="text-2xl">{m.ultimaVenta ? formatRelative(m.ultimaVenta) : "Sin ventas"}</span>}
          hint={m.ultimaVenta ? formatDate(m.ultimaVenta) : "Aún no registra ventas"}
        />
      </div>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <DatosGeneralesForm key={`datos-${version}`} empresa={empresa} onSaved={onSaved} />
          <UsuariosCard empresa={empresa} onChanged={reload} />
          <FacturacionCard key={`fact-${version}`} empresa={empresa} onSaved={onSaved} />
        </div>

        <aside className="min-w-0 space-y-6">
          <SectionCard
            title="Plan y uso"
            description={`Plan ${empresa.planNombre}. Al llegar al límite no se pueden crear ni reactivar más registros.`}
            actions={
              <ButtonLink href={GYM_PLANES} variant="ghost" size="sm">
                Ver planes
              </ButtonLink>
            }
          >
            <div className="space-y-4">
              <UsoLimite label="Socios activos" usados={m.sociosActivos} maximo={empresa.limites.maxSocios} />
              <UsoLimite label="Usuarios activos" usados={m.usuariosActivos} maximo={empresa.limites.maxUsuarios} />
            </div>
          </SectionCard>

          <SectionCard title="Accesos" description="Enlaces de la empresa en Gym Manager.">
            <div className="space-y-4">
              <UrlRow label="Login del gimnasio" url={empresa.urls.login} />
              <UrlRow label="Catálogo público" url={empresa.urls.catalogo} />
            </div>
          </SectionCard>

          <EstadoCard empresa={empresa} onSaved={onSaved} />
        </aside>
      </div>
    </>
  );
}
