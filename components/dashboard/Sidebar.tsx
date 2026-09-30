"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveItem, getAppByPath } from "@/lib/apps";
import type { SessionUser } from "@/lib/api";
import { cn, titleCase } from "@/lib/utils";
import { LayersIcon, LogoutIcon, SearchIcon } from "@/components/icons";
import { Avatar, Badge, IconButton, Kbd } from "@/components/ui";
import { NAV_ICONS } from "./nav-icons";

export function Sidebar({
  open,
  onClose,
  onLogout,
  onSearch,
  user,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  onSearch: () => void;
  user: SessionUser | null;
}) {
  const pathname = usePathname();
  const app = getAppByPath(pathname);
  const active = getActiveItem(app, pathname);
  const displayName = user?.name || user?.email?.split("@")[0] || "Usuario";

  return (
    <>
      {/* Overlay móvil */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-black/20 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col border-r border-line bg-canvas transition-transform lg:translate-x-0",
          open ? "translate-x-0 shadow-xl" : "-translate-x-full",
        )}
      >
        {/* Organización (equivalente al selector de team de Vercel) */}
        <div className="flex h-16 items-center gap-2.5 px-5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-white">
            <LayersIcon width={13} height={13} />
          </span>
          <span className="truncate text-[15px] font-medium text-ink">Control Center</span>
          {user?.role && <Badge className="h-5 px-2 text-[11px]">{titleCase(user.role)}</Badge>}
        </div>

        {/* Buscar (abre la paleta ⌘K) */}
        <div className="px-3">
          <button
            type="button"
            onClick={onSearch}
            className="flex h-10 w-full items-center gap-2.5 rounded-md border border-line bg-surface px-3 text-sm text-subtle transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus"
          >
            <SearchIcon width={16} height={16} />
            <span className="flex-1 text-left">Buscar…</span>
            <Kbd>Ctrl K</Kbd>
          </button>
        </div>

        {/* Navegación: grupos separados por una línea, sin títulos */}
        <nav className="scroll-thin mt-3 flex-1 overflow-y-auto px-3 pb-4" aria-label={app.name}>
          {app.sections.map((section, i) => (
            <div key={section.title}>
              {i > 0 && <div className="mx-2 my-2.5 border-t border-line" role="separator" />}
              <ul className="space-y-0.5" aria-label={section.title}>
                {section.items.map((item) => {
                  const Icon = NAV_ICONS[item.icon];
                  const isActive = active?.href === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex h-10 items-center gap-3 rounded-md px-3 text-[15px] transition-colors",
                          isActive
                            ? "bg-active font-medium text-ink"
                            : "text-ink-soft hover:bg-hover hover:text-ink",
                        )}
                      >
                        <Icon width={17} height={17} className="shrink-0 text-ink" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Usuario */}
        <div className="flex items-center gap-2.5 border-t border-line px-4 py-3">
          <Avatar name={displayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{displayName}</p>
            <p className="truncate text-xs text-muted">{user?.email ?? "—"}</p>
          </div>
          <IconButton label="Cerrar sesión" onClick={onLogout} className="h-8 w-8">
            <LogoutIcon width={15} height={15} />
          </IconButton>
        </div>
      </aside>
    </>
  );
}
