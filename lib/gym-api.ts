/**
 * Cliente de Gym Manager para el panel. Habla con el proxy del propio panel (/api/gym),
 * que valida la sesión y añade la clave de plataforma en el servidor.
 */
import { ApiError, clearSession, getToken, isTokenExpired } from "@/lib/api";

/** URL pública de Gym Manager (para imágenes y enlaces). No es un secreto. */
export const GYM_APP_URL = (process.env.NEXT_PUBLIC_GYM_APP_URL || "http://localhost:3000").replace(/\/+$/, "");

/** Convierte rutas relativas de Gym Manager (/api/uploads/…) en absolutas. */
export function gymAsset(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url : `${GYM_APP_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function sesionVencida() {
  clearSession();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.assign(new URL("/login?expired=1", window.location.origin).href);
  }
}

async function gymFetch<T>(path: string, init: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    sesionVencida();
    throw new ApiError("Tu sesión ha expirado. Inicia sesión nuevamente.", 401);
  }
  const headers = new Headers({ Accept: "application/json", Authorization: `Bearer ${token}` });
  let body: BodyInit | undefined;
  if (init.form) body = init.form;
  else if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  }

  let res: Response;
  try {
    res = await fetch(`/api/gym/${path.replace(/^\/+/, "")}`, { method: init.method ?? "GET", headers, body, cache: "no-store" });
  } catch {
    throw new ApiError("No se pudo conectar con el panel.", 0);
  }
  const data = (await res.json().catch(() => null)) as ({ error?: string } & Record<string, unknown>) | null;
  if (!res.ok) {
    if (res.status === 401) {
      sesionVencida();
      throw new ApiError("Tu sesión ha expirado. Inicia sesión nuevamente.", 401);
    }
    throw new ApiError(data?.error || `Error ${res.status}`, res.status, data);
  }
  return data as T;
}

export const gymApi = {
  get: <T>(path: string) => gymFetch<T>(path),
  post: <T>(path: string, body?: unknown) => gymFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => gymFetch<T>(path, { method: "PATCH", body }),
  /**
   * Sube una imagen (logo) a Gym Manager; devuelve la URL relativa guardable.
   * Con `empresaId` se guarda en la carpeta de esa empresa; sin él, en la temporal de plataforma.
   */
  upload: async (file: File, empresaId?: number) => {
    const form = new FormData();
    form.append("file", file);
    return gymFetch<{ url: string }>(empresaId ? `upload?empresaId=${empresaId}` : "upload", { method: "POST", form });
  },
};
