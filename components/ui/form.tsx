import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const controlBase = cn(
  "block w-full rounded-md border border-line bg-surface text-sm text-ink",
  "placeholder:text-subtle transition-colors",
  "hover:border-line-strong focus:border-[#8f8f8f] focus:outline-none focus:ring-[3px] focus:ring-focus",
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
  "aria-[invalid=true]:border-red-400",
);

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Icono a la izquierda (ej. lupa en buscadores). */
  leading?: ReactNode;
  /** Contenido a la derecha (ej. <Kbd>⌘K</Kbd>). */
  trailing?: ReactNode;
  /** Prefijo pegado al input (ej. "/lugares/"). */
  addon?: ReactNode;
}

/**
 * Nota: la estructura DOM depende de si hay leading/trailing/addon. No alternes
 * esas props entre definido/undefined mientras el usuario escribe (remonta el
 * <input> y pierde el foco); pasa un contenedor vacío en su lugar.
 */
export function Input({ className, leading, trailing, addon, ...props }: InputProps) {
  if (!leading && !trailing && !addon) {
    return <input className={cn(controlBase, "h-10 px-3", className)} {...props} />;
  }
  return (
    <div className={cn("relative flex", className)}>
      {addon && (
        <span className="inline-flex items-center rounded-l-md border border-r-0 border-line bg-canvas px-3 text-sm text-muted">
          {addon}
        </span>
      )}
      {leading && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-subtle">
          {leading}
        </span>
      )}
      <input
        className={cn(
          controlBase,
          "h-10 px-3",
          leading ? "pl-9" : undefined,
          trailing ? "pr-14" : undefined,
          addon ? "rounded-l-none" : undefined,
        )}
        {...props}
      />
      {trailing && (
        <span className="absolute inset-y-0 right-2 flex items-center">{trailing}</span>
      )}
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(controlBase, "resize-y px-3 py-2 leading-relaxed", className)} {...props} />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(controlBase, "h-10 appearance-none pl-3 pr-9")} {...props}>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
      </svg>
    </div>
  );
}

/** Interruptor accesible (checkbox con apariencia de switch). */
export function Switch({
  checked,
  onChange,
  label,
  description,
  id,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  id: string;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-5 w-9 rounded-full bg-line-strong transition-colors peer-checked:bg-accent peer-focus-visible:ring-[3px] peer-focus-visible:ring-focus peer-disabled:opacity-50" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-muted">
        {label}
        {required && <span className="ml-0.5 text-[#e5484d]">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : (
        hint && <div className="text-xs text-muted">{hint}</div>
      )}
    </div>
  );
}

/** Bloque de formulario con título a la izquierda y campos a la derecha (lg). */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-5 border-b border-line py-8 first:pt-0 last:border-b-0 lg:grid-cols-[240px_1fr] lg:gap-10">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className={over ? "text-amber-600" : undefined}>
      {value.length}/{max}
      {over && " · se recomienda acortar"}
    </span>
  );
}
