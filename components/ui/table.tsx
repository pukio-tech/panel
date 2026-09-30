"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Pagination as PaginationData } from "@/lib/types";
import { Button } from "./button";
import { EmptyState, Skeleton } from "./feedback";

export interface Column<T> {
  /** Identificador único de la columna. */
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  /** Oculta la columna en pantallas pequeñas. */
  hideOnMobile?: boolean;
  align?: "left" | "right" | "center";
  /** Nombre en el selector de columnas (si `header` no es texto). */
  label?: string;
  /** Oculta por defecto (el usuario puede activarla en «Columnas»). */
  defaultHidden?: boolean;
  /** No se puede ocultar desde el selector (ej. nombre, acciones). */
  alwaysVisible?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  /** Estado vacío (se muestra si no hay filas y no está cargando). */
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  /** Pie de tabla, normalmente <Pagination />. */
  footer?: ReactNode;
  skeletonRows?: number;
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" };

/**
 * Tabla genérica del panel. Define columnas una sola vez y reutilízala
 * en cualquier listado para mantener el mismo diseño.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  empty,
  onRowClick,
  footer,
  skeletonRows = 8,
}: DataTableProps<T>) {
  const showSkeleton = loading && rows.length === 0;

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-line bg-surface">
      <div className="scroll-thin overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-[13px] font-medium text-muted",
                    alignClass[col.align ?? "left"],
                    col.hideOnMobile && "hidden md:table-cell",
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className={cn(
              "divide-y divide-line transition-opacity",
              loading && rows.length > 0 && "opacity-50",
            )}
          >
            {showSkeleton
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn("px-4 py-3.5", col.hideOnMobile && "hidden md:table-cell")}
                      >
                        <Skeleton className="h-4 w-full max-w-[160px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "transition-colors hover:bg-canvas",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          "px-4 py-3.5 align-middle text-ink",
                          alignClass[col.align ?? "left"],
                          col.hideOnMobile && "hidden md:table-cell",
                          col.className,
                        )}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && (empty ?? <EmptyState title="Sin resultados" />)}
      </div>
      {footer}
    </div>
  );
}

const numberFmt = new Intl.NumberFormat("es-PE");

export function Pagination({
  pagination,
  onPageChange,
  disabled,
}: {
  pagination: PaginationData | null;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (!pagination || pagination.total === 0) return null;
  const { page, limit, total, totalPages } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-line px-4 py-3 text-sm text-muted">
      <span>
        {numberFmt.format(from)}–{numberFmt.format(to)} de {numberFmt.format(total)}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">
            Página {numberFmt.format(page)} de {numberFmt.format(totalPages)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

/** Celda con título + subtítulo (y miniatura opcional). */
export function CellTitle({
  title,
  subtitle,
  image,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  image?: string | null | false;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {image !== undefined &&
        (image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-9 w-9 shrink-0 rounded-md border border-line bg-surface-muted object-cover"
          />
        ) : (
          <span className="h-9 w-9 shrink-0 rounded-md border border-line bg-surface-muted" />
        ))}
      <div className="min-w-0">
        <p className="max-w-[14rem] truncate font-medium text-ink xl:max-w-[18rem]">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

/**
 * Selector de columnas visibles («Columnas»). Normalmente se usa a través de
 * `useColumnVisibility`, que además persiste la elección.
 */
export function ColumnPicker({
  columns,
  hidden,
  onToggle,
  onReset,
}: {
  columns: { key: string; label: string }[];
  hidden: Set<string>;
  onToggle: (key: string) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const visibleCount = columns.filter((c) => !hidden.has(c.key)).length;

  return (
    <div ref={ref} className="relative">
      <Button
        variant="secondary"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16M15 4v16" />
        </svg>
        Columnas
        <span className="tabular-nums text-subtle">
          {visibleCount}/{columns.length}
        </span>
      </Button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-subtle">
            Columnas visibles
          </p>
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-ink hover:bg-hover"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-line-strong accent-ink"
                checked={!hidden.has(col.key)}
                onChange={() => onToggle(col.key)}
              />
              {col.label}
            </label>
          ))}
          <div className="mt-1 border-t border-line pt-1">
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-md px-2 py-1.5 text-left text-[13px] text-muted hover:bg-hover hover:text-ink"
            >
              Restablecer columnas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
