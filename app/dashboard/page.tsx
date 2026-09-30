"use client";

import Link from "next/link";
import { numberFmt } from "@/lib/utils";
import { useCounts } from "@/lib/hooks/useCounts";
import { Card, LiveDot, PageHeader, StatCard } from "@/components/ui";
import { BuildingIcon, ChevronRightIcon, FileIcon, LandmarkIcon, MapPinIcon } from "@/components/icons";

const PLACES = { all: {}, manual: { source: "manual" } } as const;
const MUSEUMS = { all: {}, open: { status: "Abierto" } } as const;
const COMPANIES = { all: {}, manual: { source: "manual" } } as const;
const POSTS = { all: {}, drafts: { isPublished: false } } as const;

const fmt = (n?: number) => (n == null ? "—" : numberFmt.format(n));

const QUICK_ACTIONS = [
  { label: "Nuevo lugar turístico", href: "/dashboard/opendata/lugares/nuevo", Icon: MapPinIcon },
  { label: "Nuevo museo", href: "/dashboard/opendata/museos/nuevo", Icon: LandmarkIcon },
  { label: "Nueva empresa", href: "/dashboard/opendata/empresas/nuevo", Icon: BuildingIcon },
  { label: "Escribir artículo", href: "/dashboard/opendata/blog/nuevo", Icon: FileIcon },
];

export default function DashboardHome() {
  const places = useCounts("/api/admin/places", PLACES);
  const museums = useCounts("/api/admin/museums", MUSEUMS);
  const companies = useCounts("/api/admin/companies", COMPANIES);
  const posts = useCounts("/api/admin/posts", POSTS);

  return (
    <>
      <PageHeader
        title="Resumen"
        subtitle={
          <>
            <LiveDot /> OpenData Perú · datos en vivo desde bk_opendata
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Turismo"
          value={fmt(places.all)}
          loading={places.all == null}
          hint={`${fmt(places.manual)} creados en el panel`}
          href="/dashboard/opendata/lugares"
        />
        <StatCard
          label="Museos"
          value={fmt(museums.all)}
          loading={museums.all == null}
          hint={`${fmt(museums.open)} abiertos al público`}
          href="/dashboard/opendata/museos"
        />
        <StatCard
          label="Empresas"
          value={fmt(companies.all)}
          loading={companies.all == null}
          hint={`${fmt(companies.manual)} registradas manualmente`}
          href="/dashboard/opendata/empresas"
        />
        <StatCard
          label="Artículos del blog"
          value={fmt(posts.all)}
          loading={posts.all == null}
          hint={`${fmt(posts.drafts)} en borrador`}
          href="/dashboard/opendata/blog"
        />
      </div>

      <h2 className="mb-3 mt-10 text-sm font-semibold text-ink">Acciones rápidas</h2>
      <Card padded={false} className="divide-y divide-line">
        {QUICK_ACTIONS.map(({ label, href, Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-5 py-3.5 text-sm text-ink-soft transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-hover hover:text-ink"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface-muted text-muted">
              <Icon width={16} height={16} />
            </span>
            <span className="flex-1 font-medium">{label}</span>
            <ChevronRightIcon width={16} height={16} className="text-subtle" />
          </Link>
        ))}
      </Card>
    </>
  );
}
