"use client";

import { useRef, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { gymApi, gymAsset } from "@/lib/gym-api";
import type { GymPlanPlataforma } from "@/lib/gym-types";
import { formatPEN, formatUso, generatePassword, planTone, porcentajeUso } from "@/lib/gym-utils";
import { useGymData } from "@/lib/hooks/useGymData";
import { cn } from "@/lib/utils";
import { Badge, Button, IconButton, Input, Select, useToast } from "@/components/ui";
import { CopyIcon, EyeIcon, EyeOffIcon, RefreshIcon, UploadIcon } from "@/components/icons";

export const GYM_BASE = "/dashboard/gym";
export const GYM_EMPRESAS = `${GYM_BASE}/empresas`;
export const GYM_PLANES = `${GYM_BASE}/planes`;

/** Mensaje legible de un error de la API. */
export function errorMessage(err: unknown, fallback = "Ocurrió un error inesperado."): string {
  return err instanceof ApiError || err instanceof Error ? err.message || fallback : fallback;
}

/* ------------------------------------------------------------------ */
/* Tarjeta de sección (título + descripción + acciones)               */
/* ------------------------------------------------------------------ */

export function SectionCard({
  title,
  description,
  actions,
  children,
  footer,
  danger,
  flush,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  danger?: boolean;
  /** Sin padding en el cuerpo (tablas). */
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-surface",
        danger ? "border-red-200" : "border-line",
      )}
    >
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className={cn("text-[15px] font-semibold", danger ? "text-red-700" : "text-ink")}>{title}</h2>
          {description && <div className="mt-1 text-[13px] leading-relaxed text-muted">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      <div className={flush ? undefined : "p-5"}>{children}</div>
      {footer && (
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-line bg-canvas px-5 py-3">
          {footer}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export function PlanBadge({ plan, nombre }: { plan: string; nombre?: string | null }) {
  return (
    <Badge tone={planTone(plan)}>
      {nombre || plan}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Planes: selector y barra de uso                                     */
/* ------------------------------------------------------------------ */

/** Catálogo de planes de la plataforma (GET planes). */
export function useGymPlanes() {
  const res = useGymData<{ data: GymPlanPlataforma[] }>("planes");
  return { ...res, planes: res.data?.data ?? [] };
}

const limiteTexto = (n: number | null, unidad: string) => (n == null ? `${unidad} ilimitados` : `hasta ${n} ${unidad}`);

/** Descripción corta de un plan para selects: «Pro · S/ 199.00 · hasta 500 socios». */
export function planResumen(p: GymPlanPlataforma): string {
  return `${p.nombre} · ${formatPEN(p.precioMensual)}/mes · ${limiteTexto(p.maxSocios, "socios")} · ${limiteTexto(p.maxUsuarios, "usuarios")}`;
}

/**
 * Select de planes. Solo ofrece planes activos, pero conserva el plan actual aunque
 * esté desactivado para no cambiarlo sin querer.
 */
export function PlanSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (codigo: string) => void;
  disabled?: boolean;
}) {
  const { planes, initialLoading, error } = useGymPlanes();
  const opciones = planes.filter((p) => p.activo || p.codigo === value);
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled || initialLoading}>
      {initialLoading && <option value={value}>Cargando planes…</option>}
      {!initialLoading && !opciones.some((p) => p.codigo === value) && (
        <option value={value}>{error ? `${value} (no se pudo cargar el catálogo)` : value}</option>
      )}
      {opciones.map((p) => (
        <option key={p.codigo} value={p.codigo}>
          {planResumen(p)}
          {p.activo ? "" : " (inactivo)"}
        </option>
      ))}
    </Select>
  );
}

/** Barra «usados / máximo» de un límite del plan. */
export function UsoLimite({ label, usados, maximo }: { label: string; usados: number; maximo: number | null }) {
  const pct = porcentajeUso(usados, maximo);
  const tone = pct == null ? "bg-emerald-500" : pct >= 100 ? "bg-red-500" : pct >= 85 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular-nums text-ink">{formatUso(usados, maximo)}</span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
        aria-valuetext={formatUso(usados, maximo)}
      >
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct ?? 100}%`, opacity: pct == null ? 0.35 : 1 }} />
      </div>
      {pct != null && pct >= 100 && <p className="mt-1 text-xs text-red-600">Límite alcanzado: no se pueden agregar más.</p>}
    </div>
  );
}

export function EstadoBadge({ activo }: { activo: boolean }) {
  return activo ? (
    <Badge tone="success" dot>
      Activa
    </Badge>
  ) : (
    <Badge tone="danger" dot>
      Suspendida
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Logo de la empresa (imagen o iniciales)                             */
/* ------------------------------------------------------------------ */

export function EmpresaLogo({
  nombre,
  logoUrl,
  size = 36,
  className,
}: {
  nombre: string;
  logoUrl: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const src = gymAsset(logoUrl);
  const [failed, setFailed] = useState<string | null>(null);
  const style = { width: size, height: size };
  if (src && failed !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(src)}
        style={style}
        className={cn("shrink-0 rounded-lg border border-line bg-surface object-contain", className)}
      />
    );
  }
  const initials =
    nombre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span
      aria-hidden="true"
      style={{ ...style, fontSize: Math.max(11, Math.round(size * 0.34)) }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 font-semibold text-emerald-700",
        className,
      )}
    >
      {initials}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Contraseña con mostrar/ocultar, generar y copiar                    */
/* ------------------------------------------------------------------ */

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function PasswordInput({
  id,
  value,
  onChange,
  generate,
  copy,
  placeholder,
  invalid,
  autoComplete = "new-password",
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Muestra el botón «Generar» (contraseña fuerte que cumple las reglas). */
  generate?: boolean;
  /** Muestra el botón para copiar. */
  copy?: boolean;
  placeholder?: string;
  invalid?: boolean;
  autoComplete?: string;
  disabled?: boolean;
}) {
  const toast = useToast();
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        className="min-w-0 flex-1 font-mono"
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="rounded p-1 text-subtle hover:text-ink"
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            title={visible ? "Ocultar" : "Mostrar"}
            disabled={disabled}
          >
            {visible ? <EyeOffIcon width={16} height={16} /> : <EyeIcon width={16} height={16} />}
          </button>
        }
      />
      {copy && (
        <IconButton
          label="Copiar contraseña"
          className="h-10 w-10 rounded-md"
          disabled={!value || disabled}
          onClick={async () => {
            const ok = await copyToClipboard(value);
            toast(ok ? "Contraseña copiada al portapapeles." : "No se pudo copiar. Cópiala manualmente.", ok ? "success" : "warning");
          }}
        >
          <CopyIcon width={16} height={16} />
        </IconButton>
      )}
      {generate && (
        <Button
          variant="secondary"
          disabled={disabled}
          onClick={() => {
            onChange(generatePassword());
            setVisible(true);
          }}
        >
          <RefreshIcon width={15} height={15} />
          Generar
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Subida de logo                                                      */
/* ------------------------------------------------------------------ */

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function LogoUpload({
  value,
  nombre,
  onChange,
  disabled,
}: {
  /** URL relativa guardada (logoUrl) o null. */
  value: string | null;
  nombre: string;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast("Selecciona un archivo de imagen.", "error");
    if (file.size > MAX_LOGO_BYTES) return toast("La imagen no debe superar los 2 MB.", "error");
    setUploading(true);
    try {
      const res = await gymApi.upload(file);
      onChange(res.url);
      toast("Logo subido.");
    } catch (err) {
      toast(errorMessage(err, "No se pudo subir el logo."), "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <EmpresaLogo nombre={nombre || "?"} logoUrl={value} size={72} className="rounded-xl" />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            loading={uploading}
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {!uploading && <UploadIcon width={14} height={14} />}
            {value ? "Cambiar logo" : "Subir logo"}
          </Button>
          {value && (
            <Button variant="ghost" size="sm" disabled={disabled || uploading} onClick={() => onChange(null)}>
              Quitar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">PNG, JPG, WEBP o SVG. Máximo 2 MB. Se recomienda cuadrado.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          className="sr-only"
          tabIndex={-1}
          aria-label="Archivo de logo"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Acceso como administrador (URL de un solo uso, 60 s)                */
/* ------------------------------------------------------------------ */

export function useEntrarComoAdmin() {
  const toast = useToast();
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function entrar(empresa: { id: number; nombre: string }) {
    setPendingId(empresa.id);
    try {
      const res = await gymApi.post<{ data: { url: string; expiraEn: number } }>(`empresas/${empresa.id}/acceso`);
      window.open(res.data.url, "_blank", "noopener");
      toast(`Abriendo el panel de ${empresa.nombre} en una pestaña nueva.`);
    } catch (err) {
      toast(errorMessage(err, "No se pudo generar el acceso."), "error");
    } finally {
      setPendingId(null);
    }
  }

  return { entrar, pendingId };
}
