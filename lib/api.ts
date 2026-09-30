/**
 * Cliente HTTP centralizado para comunicarse con bk_opendata.
 *
 * - Adjunta automáticamente el JWT en `Authorization: Bearer <token>`.
 * - Normaliza los errores del backend (NestJS) en un `ApiError`.
 * - Ante un 401 (token inválido/expirado) limpia la sesión y redirige a /login.
 */

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/+$/, "");

const TOKEN_KEY = "cc_token";
const USER_KEY = "cc_user";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
}

/* ------------------------------------------------------------------ */
/* Sesión (token + usuario)                                            */
/* ------------------------------------------------------------------ */

const isBrowser = () => typeof window !== "undefined";

function readCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function getToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(TOKEN_KEY) ?? readCookie(TOKEN_KEY);
  } catch {
    return readCookie(TOKEN_KEY);
  }
}

export function getUser(): SessionUser | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

const SESSION_EVENT = "cc-session-change";

export function setSession(token: string, user?: SessionUser) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* localStorage no disponible: nos quedamos con la cookie */
  }
  // La cookie permite que un futuro proxy/middleware de Next lea la sesión.
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession() {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* noop */
  }
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

/** Suscripción para `useSyncExternalStore` (misma pestaña y otras pestañas). */
export function subscribeSession(callback: () => void) {
  window.addEventListener(SESSION_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SESSION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Usuario serializado (string estable para comparar snapshots). */
export function getUserSnapshot(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

/** Decodifica el payload del JWT (sin verificar firma) para revisar `exp`. */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

/* ------------------------------------------------------------------ */
/* Errores                                                             */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** NestJS devuelve `message` como string o como array (ValidationPipe). */
function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const msg = (body as { message: unknown }).message;
    if (Array.isArray(msg)) return msg.join(". ");
    if (typeof msg === "string") return msg;
  }
  return fallback;
}

function handleUnauthorized() {
  clearSession();
  if (isBrowser() && !window.location.pathname.startsWith("/login")) {
    // Navegación dura: resetea todo el estado de la app tras perder la sesión.
    window.location.assign(new URL("/login?expired=1", window.location.origin).href);
  }
}

/* ------------------------------------------------------------------ */
/* Cliente                                                             */
/* ------------------------------------------------------------------ */

type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Query;
  /** Si es false no se envía el token (ej. login). Por defecto true. */
  auth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  { body, query, auth = true, headers, ...init }: RequestOptions = {},
): Promise<T> {
  const url = new URL(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const finalHeaders = new Headers(headers);
  finalHeaders.set("Accept", "application/json");
  if (body !== undefined) finalHeaders.set("Content-Type", "application/json");

  if (auth) {
    const token = getToken();
    if (token) {
      if (isTokenExpired(token)) {
        handleUnauthorized();
        throw new ApiError("Tu sesión ha expirado. Inicia sesión nuevamente.", 401);
      }
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      `No se pudo conectar con el servidor (${API_URL}). Verifica que bk_opendata esté en ejecución.`,
      0,
    );
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && auth) {
      handleUnauthorized();
      throw new ApiError("Tu sesión ha expirado. Inicia sesión nuevamente.", 401, data);
    }
    const fallback =
      res.status === 403
        ? "No tienes permisos para realizar esta acción."
        : res.status >= 500
          ? "Error interno del servidor."
          : `Error ${res.status}`;
    throw new ApiError(extractMessage(data, fallback), res.status, data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
};
