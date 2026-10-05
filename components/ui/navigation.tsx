"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* FilterPills — "Todos 1 · Fuera de rango 0 · Sin señal 1"            */
/* ------------------------------------------------------------------ */

export interface PillOption<V extends string = string> {
  value: V;
  label: string;
  count?: number | null;
}

const countFmt = new Intl.NumberFormat("es-PE", { notation: "compact" });

export function FilterPills<V extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: PillOption<V>[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex flex-wrap gap-2", className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus",
              active
                ? "border-line-strong bg-surface text-ink"
                : "border-dashed border-line-strong text-muted hover:border-solid hover:bg-surface hover:text-ink",
            )}
          >
            {opt.label}
            {opt.count != null && (
              <span className={cn("tabular-nums", active ? "text-muted" : "text-subtle")}>
                {countFmt.format(opt.count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PageHeader                                                          */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  subtitle,
  actions,
  back,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="mb-2 inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            {back.label}
          </Link>
        )}
        <h1 className="truncate text-[32px] font-semibold leading-10 tracking-[-0.04em] text-ink">{title}</h1>
        {subtitle && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">{subtitle}</div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toolbar — fila de búsqueda + filtros sobre una tabla                */
/* ------------------------------------------------------------------ */

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Menu — menú desplegable (acciones de fila, etc.)                    */
/* ------------------------------------------------------------------ */

export interface MenuItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}

const MENU_WIDTH = 208; // w-52

interface MenuPosition {
  left: number;
  /** Se usa `top` al abrir hacia abajo y `bottom` al abrir hacia arriba. */
  top?: number;
  bottom?: number;
}

/**
 * El menú se renderiza en un portal con `position: fixed`, para que no lo
 * recorten contenedores con overflow (p. ej. la tabla con scroll interno
 * cuando solo tiene una o dos filas). Se abre hacia arriba si no cabe abajo.
 */
export function Menu({
  items,
  label = "Acciones",
  align = "right",
  trigger,
}: {
  items: MenuItem[];
  label?: string;
  align?: "left" | "right";
  /** Contenido del botón (ej. "+ Crear"). Por defecto, icono «⋯». */
  trigger?: ReactNode;
}) {
  const [pos, setPos] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = pos !== null;

  function toggle() {
    if (open) return setPos(null);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedHeight = items.length * 44 + 8;
    const left = Math.max(
      8,
      Math.min(
        align === "right" ? rect.right - MENU_WIDTH : rect.left,
        window.innerWidth - MENU_WIDTH - 8,
      ),
    );
    const fitsBelow = window.innerHeight - rect.bottom >= estimatedHeight + 8;
    setPos(
      fitsBelow || rect.top < estimatedHeight
        ? { left, top: rect.bottom + 4 }
        : { left, bottom: window.innerHeight - rect.top + 4 },
    );
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // Con position: fixed, cualquier scroll/resize desalinearía el menú: se cierra.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const itemClass = (item: MenuItem) =>
    cn(
      "flex w-full flex-col items-start rounded-md px-2.5 py-2 text-left text-sm transition-colors",
      item.disabled
        ? "cursor-not-allowed text-subtle"
        : item.danger
          ? "text-[#e5484d] hover:bg-[#fff0f0]"
          : "text-ink hover:bg-hover",
    );

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          "inline-flex items-center justify-center rounded-md transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-focus",
          trigger ? "h-9 gap-2 px-3 text-sm font-medium text-ink" : "h-8 w-8 text-ink",
          open && "bg-hover",
        )}
      >
        {trigger ?? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        )}
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            // Los eventos de React atraviesan el portal: evita que el clic
            // llegue al onClick de la fila de la tabla.
            onClick={(e) => e.stopPropagation()}
            style={
              {
                left: pos.left,
                top: pos.top,
                bottom: pos.bottom,
                width: MENU_WIDTH,
                // Escala desde el disparador: arriba si abre hacia abajo, abajo si abre hacia arriba
                "--origin": `${pos.bottom !== undefined ? "bottom" : "top"} ${align === "right" ? "right" : "left"}`,
              } as CSSProperties
            }
            className="ui-popover fixed z-50 rounded-xl border border-line bg-surface p-1.5 text-left shadow-[0_4px_16px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
          >
            {items.map((item) =>
              item.href && !item.disabled ? (
                <Link
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  className={itemClass(item)}
                  onClick={() => setPos(null)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={itemClass(item)}
                  onClick={() => {
                    setPos(null);
                    item.onSelect?.();
                  }}
                >
                  {item.label}
                  {item.hint && <span className="text-[11px] text-subtle">{item.hint}</span>}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
