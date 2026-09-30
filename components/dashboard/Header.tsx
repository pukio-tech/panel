"use client";

import { usePathname } from "next/navigation";
import { getActiveItem, getAppByPath } from "@/lib/apps";
import { MenuIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { Menu } from "@/components/ui";
import { AppSwitcher } from "./AppSwitcher";

/** Acciones del botón «+ Crear» (equivalente a «Create New» de Vercel). */
const CREATE_ITEMS = [
  { label: "Lugar turístico", href: "/dashboard/opendata/lugares/nuevo" },
  { label: "Museo", href: "/dashboard/opendata/museos/nuevo" },
  { label: "Empresa", href: "/dashboard/opendata/empresas/nuevo" },
  { label: "Artículo del blog", href: "/dashboard/opendata/blog/nuevo" },
];

export function Header({
  onMenuClick,
  onSearchClick,
}: {
  onMenuClick: () => void;
  onSearchClick: () => void;
}) {
  const pathname = usePathname();
  const app = getAppByPath(pathname);
  const item = getActiveItem(app, pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 bg-canvas/85 px-4 backdrop-blur-md sm:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="-ml-1 rounded-md p-2 text-ink hover:bg-hover lg:hidden"
        aria-label="Abrir menú"
      >
        <MenuIcon />
      </button>

      <AppSwitcher current={app} />

      {item && item.href !== app.basePath && (
        <>
          <span className="select-none text-lg font-light text-line-strong" aria-hidden="true">
            /
          </span>
          <span className="truncate text-[15px] text-muted max-sm:hidden">{item.label}</span>
        </>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={onSearchClick}
        className="rounded-md p-2 text-ink hover:bg-hover lg:hidden"
        aria-label="Buscar"
      >
        <SearchIcon width={18} height={18} />
      </button>

      <Menu
        label="Crear"
        items={CREATE_ITEMS}
        trigger={
          <>
            <PlusIcon width={16} height={16} />
            <span className="max-sm:hidden">Crear</span>
          </>
        }
      />
    </header>
  );
}
