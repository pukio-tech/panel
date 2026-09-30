/**
 * Misma lógica que `slugify` en bk_opendata para que el preview coincida.
 * `partial` conserva el guion final para poder editar el slug tecla a tecla.
 */
export function slugify(text: string, partial = false): string {
  const slug = text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-/, "");
  return partial ? slug : slug.replace(/-$/, "");
}

/** "SITIOS NATURALES" → "Sitios Naturales" (los datos oficiales vienen en mayúsculas). */
export function titleCase(text?: string | null): string {
  if (!text) return "";
  return text.toLowerCase().replace(/(^|[\s(/-])\S/g, (c) => c.toUpperCase());
}

export const numberFmt = new Intl.NumberFormat("es-PE");

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Elimina strings vacíos para no enviar "" a campos opcionales del backend. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined && v !== null),
  ) as Partial<T>;
}
