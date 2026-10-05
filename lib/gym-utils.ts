/** Utilidades de la sección Gym Manager: formato (es-PE), planes y reglas de validación. */
import type { BadgeTone } from "@/components/ui";
import type { GymModuloCodigo, GymPlan } from "@/lib/gym-types";

/* ------------------------------------------------------------------ */
/* Formato                                                             */
/* ------------------------------------------------------------------ */

const penFmt = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const penCompactFmt = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  notation: "compact",
  maximumFractionDigits: 1,
});
const intFmt = new Intl.NumberFormat("es-PE");
const dateFmt = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" });
const relFmt = new Intl.RelativeTimeFormat("es-PE", { numeric: "auto" });

/** S/ 1,234.50 */
export const formatPEN = (n: number | null | undefined) => (n == null ? "—" : penFmt.format(n));
/** S/ 1.2 mil (ejes de gráficos) */
export const formatPENCompact = (n: number) => penCompactFmt.format(n);
export const formatInt = (n: number | null | undefined) => (n == null ? "—" : intFmt.format(n));

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  // "2026-10-03" (solo fecha) se interpreta como fecha local, no UTC
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const formatDate = (value: string | null | undefined) => {
  const d = parse(value);
  return d ? dateFmt.format(d) : "—";
};

export const formatDateTime = (value: string | null | undefined) => {
  const d = parse(value);
  return d ? dateTimeFmt.format(d) : "—";
};

/** «hace 3 horas», «ayer», «hace 2 meses». */
export function formatRelative(value: string | null | undefined, now = Date.now()): string {
  const d = parse(value);
  if (!d) return "—";
  const secs = Math.round((d.getTime() - now) / 1000);
  const abs = Math.abs(secs);
  if (abs < 60) return "hace un momento";
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60],
    ["hour", 3600],
    ["day", 86400],
    ["week", 604800],
    ["month", 2592000],
    ["year", 31536000],
  ];
  let unit: Intl.RelativeTimeFormatUnit = "minute";
  let size = 60;
  for (const [u, s] of units) {
    if (abs >= s) {
      unit = u;
      size = s;
    }
  }
  return relFmt.format(Math.round(secs / size), unit);
}

/* ------------------------------------------------------------------ */
/* Planes                                                              */
/* ------------------------------------------------------------------ */

// El catálogo de planes vive en Gym Manager (GET planes); aquí solo el color del badge.
export function planTone(plan: GymPlan): BadgeTone {
  if (plan === "ENTERPRISE") return "violet";
  if (plan === "PRO") return "info";
  if (plan === "BASICO") return "outline";
  return "neutral";
}

/** «120 / 200», «120 / ilimitado». */
export function formatUso(usados: number, maximo: number | null): string {
  return `${formatInt(usados)} / ${maximo == null ? "ilimitado" : formatInt(maximo)}`;
}

/** Porcentaje de uso (0–100) o null si el plan es ilimitado. */
export function porcentajeUso(usados: number, maximo: number | null): number | null {
  if (maximo == null || maximo <= 0) return null;
  return Math.min(100, Math.round((usados / maximo) * 100));
}

export const PLAN_CODIGO_RE = /^[A-Z0-9_]{2,30}$/;

/* ------------------------------------------------------------------ */
/* Módulos opcionales (mismas claves que src/lib/modulos.ts de gym-app) */
/* ------------------------------------------------------------------ */

export const GYM_MODULOS: { codigo: GymModuloCodigo; nombre: string; corto: string; descripcion: string }[] = [
  {
    codigo: "FACTURACION",
    nombre: "Facturación electrónica SUNAT",
    corto: "Facturación",
    descripcion: "Boletas y facturas electrónicas desde el punto de venta. Sin él, solo notas de venta.",
  },
  {
    codigo: "CONSULTAS",
    nombre: "Consultas DNI / RUC",
    corto: "Consultas",
    descripcion: "Autocompleta nombres y razón social (RENIEC / SUNAT). Sin él, se escriben a mano.",
  },
  {
    codigo: "CATALOGO",
    nombre: "Tienda online y catálogo",
    corto: "Catálogo",
    descripcion: "Catálogo público, solicitudes online y pagos Yape / BCP con voucher.",
  },
  {
    codigo: "CORREOS",
    nombre: "Correos automáticos",
    corto: "Correos",
    descripcion: "Avisos de vencimiento, confirmaciones de plan y estado de pedidos.",
  },
];

export const moduloCorto = (codigo: string) => GYM_MODULOS.find((m) => m.codigo === codigo)?.corto ?? codigo;

/* ------------------------------------------------------------------ */
/* Apariencia (mismas claves que src/lib/tipografias.ts de gym-app)    */
/* ------------------------------------------------------------------ */

export const GYM_TIPOGRAFIAS = [
  { value: "inter", label: "Inter", css: "Inter, sans-serif" },
  { value: "poppins", label: "Poppins", css: "Poppins, sans-serif" },
  { value: "montserrat", label: "Montserrat", css: "Montserrat, sans-serif" },
  { value: "roboto", label: "Roboto", css: "Roboto, sans-serif" },
  { value: "nunito", label: "Nunito", css: "Nunito, sans-serif" },
  { value: "lato", label: "Lato", css: "Lato, sans-serif" },
  { value: "open-sans", label: "Open Sans", css: "'Open Sans', sans-serif" },
  { value: "raleway", label: "Raleway", css: "Raleway, sans-serif" },
  { value: "dm-sans", label: "DM Sans", css: "'DM Sans', sans-serif" },
  { value: "plus-jakarta-sans", label: "Plus Jakarta Sans", css: "'Plus Jakarta Sans', sans-serif" },
] as const;

/** Color por defecto de Gym Manager (verde). */
export const GYM_COLOR_DEFECTO = "#0f8a5f";
export const COLOR_HEX_RE = /^#[0-9a-fA-F]{6}$/;

/* ------------------------------------------------------------------ */
/* Validación (mismas reglas que la API de plataforma)                 */
/* ------------------------------------------------------------------ */

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const RUC_RE = /^(10|20)\d{9}$/;
export const TELEFONO_RE = /^\d{9}$/;
export const USERNAME_RE = /^[a-zA-Z0-9._]{4,}$/;
export const PIN_RE = /^\d{4,6}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_SYMBOLS = "@$!%*?&._-";

export function validateSlug(slug: string): string | undefined {
  if (!slug) return "El código es obligatorio.";
  if (slug.length < 3 || slug.length > 40) return "Debe tener entre 3 y 40 caracteres.";
  if (!SLUG_RE.test(slug)) return "Solo minúsculas, números y guiones (sin guiones al inicio o al final).";
}

export function validateRuc(ruc: string): string | undefined {
  if (ruc && !RUC_RE.test(ruc)) return "11 dígitos que empiecen con 10 o 20.";
}

export function validateTelefono(tel: string): string | undefined {
  if (tel && !TELEFONO_RE.test(tel)) return "Debe tener 9 dígitos.";
}

export function validateEmail(email: string): string | undefined {
  if (email && !EMAIL_RE.test(email)) return "Correo electrónico no válido.";
}

export function validateUsername(username: string): string | undefined {
  if (!USERNAME_RE.test(username)) return "Mínimo 4 caracteres: letras, números, punto o guion bajo.";
}

export function validatePin(pin: string): string | undefined {
  if (pin && !PIN_RE.test(pin)) return "El PIN debe tener entre 4 y 6 dígitos.";
}

export function validatePassword(password: string): string | undefined {
  if (password.length < 8) return "Mínimo 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "Debe incluir una mayúscula.";
  if (!/[a-z]/.test(password)) return "Debe incluir una minúscula.";
  if (!/\d/.test(password)) return "Debe incluir un número.";
  if (![...password].some((c) => PASSWORD_SYMBOLS.includes(c)))
    return `Debe incluir un símbolo (${PASSWORD_SYMBOLS}).`;
}

export const PASSWORD_HINT = `Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo (${PASSWORD_SYMBOLS}).`;

function randomIndex(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

/** Contraseña aleatoria de 14 caracteres que cumple las reglas (sin caracteres ambiguos). */
export function generatePassword(length = 14): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@$!%*?&._-";
  const all = upper + lower + digits + symbols;
  const chars = [upper, lower, digits, symbols].map((set) => set[randomIndex(set.length)]);
  while (chars.length < length) chars.push(all[randomIndex(all.length)]);
  // Fisher–Yates
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
