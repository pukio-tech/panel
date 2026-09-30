import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-line bg-surface",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Tarjeta de métrica: etiqueta, valor grande y texto de apoyo. */
export function StatCard({
  label,
  value,
  suffix,
  hint,
  href,
  loading,
}: {
  label: string;
  value: ReactNode;
  suffix?: ReactNode;
  hint?: ReactNode;
  href?: string;
  loading?: boolean;
}) {
  const body = (
    <>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-3 flex items-baseline gap-1.5">
        {loading ? (
          <span className="h-8 w-16 animate-pulse rounded-md bg-surface-muted" />
        ) : (
          <span className="text-[32px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-ink">{value}</span>
        )}
        {suffix && <span className="text-sm text-subtle">{suffix}</span>}
      </p>
      {hint && <p className="mt-3 text-[13px] text-muted">{hint}</p>}
    </>
  );
  const classes =
    "block rounded-xl border border-line bg-surface p-5";
  return href ? (
    <Link href={href} className={cn(classes, "transition-colors hover:border-line-strong")}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "violet" | "outline";

const badgeTones: Record<BadgeTone, { box: string; dot: string }> = {
  neutral: { box: "bg-surface-muted text-ink", dot: "bg-muted" },
  outline: { box: "border border-line bg-surface text-ink", dot: "bg-muted" },
  success: { box: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  warning: { box: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  danger: { box: "bg-red-50 text-red-700", dot: "bg-red-500" },
  info: { box: "bg-[#ebf5ff] text-[#0068d6]", dot: "bg-accent" },
  violet: { box: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
};

export function Badge({
  children,
  tone = "neutral",
  dot,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium",
        badgeTones[tone].box,
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", badgeTones[tone].dot)} />}
      {children}
    </span>
  );
}

/** Indicador de estado activo/inactivo reutilizado en todas las tablas. */
export function StatusBadge({
  active,
  activeLabel = "Activo",
  inactiveLabel = "Inactivo",
}: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-ink">
      <span className={cn("h-2.5 w-2.5 rounded-full", active ? "bg-[#45dec5]" : "bg-[#a1a1a1]")} />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

/** Origen del dato: importado/scraping vs creado en el panel. */
export function SourceBadge({ source, importedLabel = "Importado" }: { source: string; importedLabel?: string }) {
  return source === "manual" ? (
    <Badge tone="info">Manual</Badge>
  ) : (
    <Badge tone="outline">{importedLabel}</Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Misceláneos                                                         */
/* ------------------------------------------------------------------ */

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface px-1.5 font-sans text-[11px] font-medium text-muted">
      {children}
    </kbd>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials =
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e6e6e6] to-[#c9c9c9] text-xs font-semibold text-ink",
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

/** Punto verde pulsante para indicadores "en vivo". */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#45dec5] opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#45dec5]" />
    </span>
  );
}

/** Lista de pares etiqueta/valor para vistas de detalle. */
export function DescriptionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-xs text-muted">{it.label}</dt>
          <dd className="mt-0.5 text-sm text-ink">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
