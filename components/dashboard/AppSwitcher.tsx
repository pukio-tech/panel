"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { appsDelUsuario, type ManagedApp } from "@/lib/apps";
import { useSessionUser } from "@/lib/hooks/useSessionUser";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronsUpDownIcon, PlusIcon } from "@/components/icons";

/** Selector de aplicación en el header (equivalente al selector de proyecto de Vercel). */
export function AppSwitcher({ current }: { current: ManagedApp }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = useSessionUser();
  // Solo las apps asignadas al usuario; las internas (Configuración) van al final
  const apps = appsDelUsuario(user);
  const negocio = apps.filter((a) => !a.system);
  const internas = apps.filter((a) => a.system);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const renderApp = (app: ManagedApp) => (
    <button
      key={app.id}
      type="button"
      role="option"
      aria-selected={app.id === current.id}
      disabled={!app.enabled}
      onClick={() => {
        setOpen(false);
        if (app.id !== current.id) router.push(app.basePath);
      }}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-ink hover:bg-hover disabled:opacity-50"
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: app.color }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{app.name}</span>
        <span className="block truncate text-xs text-muted">{app.description}</span>
      </span>
      {app.id === current.id && <CheckIcon width={16} height={16} />}
    </button>
  );

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-9 min-w-0 items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-hover",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus",
          open && "bg-hover",
        )}
      >
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: current.color }} />
        <span className="truncate text-[15px] font-medium text-ink">{current.name}</span>
        <ChevronsUpDownIcon width={15} height={15} className="shrink-0 text-muted" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 z-30 mt-1.5 w-72 rounded-xl border border-line bg-surface p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
        >
          <p className="px-2.5 pb-1.5 pt-1 text-xs text-muted">Aplicaciones</p>
          {negocio.map(renderApp)}
          {negocio.length === 0 && <p className="px-2.5 py-2 text-sm text-muted">No tienes apps asignadas.</p>}
          {internas.length > 0 && <div className="my-1 border-t border-line" role="separator" />}
          {internas.map(renderApp)}
          <div className="mt-1 flex items-center gap-2.5 border-t border-line px-2.5 pb-1 pt-2.5 text-sm text-subtle">
            <PlusIcon width={14} height={14} />
            Próximamente más apps
          </div>
        </div>
      )}
    </div>
  );
}
