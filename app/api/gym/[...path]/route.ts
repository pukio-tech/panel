/**
 * Proxy seguro hacia la API de plataforma de Gym Manager (gym-app).
 *
 * El navegador del panel nunca conoce la clave de la plataforma:
 *  1. Valida el JWT del panel contra bk_opendata (`GET /api/auth/me`).
 *  2. Exige acceso a la app «gym» (rol ADMIN o app asignada en Configuración › Usuarios).
 *  3. Reenvía la petición a `${GYM_APP_URL}/api/plataforma/<ruta>` con
 *     `Authorization: Bearer ${GYM_PLATFORM_API_KEY}` y el correo del usuario para auditoría.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };
type UsuarioPanel = { id: string; email: string; role: string; apps: string[] };
const APP_ID = "gym";

const OPENDATA_API = (process.env.OPENDATA_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "");
const GYM_APP = (process.env.GYM_APP_URL || "http://localhost:3000").replace(/\/+$/, "");

// Caché corta de tokens ya validados para no consultar el backend en cada petición.
const CACHE_MS = 60_000;
const cache = new Map<string, { usuario: UsuarioPanel; hasta: number }>();

async function usuarioDelToken(token: string): Promise<UsuarioPanel | null> {
  const ahora = Date.now();
  const hit = cache.get(token);
  if (hit && hit.hasta > ahora) return hit.usuario;
  if (cache.size > 500) for (const [k, v] of cache) if (v.hasta <= ahora) cache.delete(k);
  try {
    const res = await fetch(`${OPENDATA_API}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { user?: Partial<UsuarioPanel> };
    const u = body.user;
    if (!u?.email || !u.role) return null;
    const usuario = {
      id: String(u.id ?? ""),
      email: u.email,
      role: String(u.role).toUpperCase(),
      apps: Array.isArray(u.apps) ? u.apps.map(String) : [],
    };
    cache.set(token, { usuario, hasta: ahora + CACHE_MS });
    return usuario;
  } catch {
    return null;
  }
}

function json(status: number, error: string) {
  return Response.json({ error }, { status });
}

// Solo se exponen estas rutas de la API de plataforma
const PERMITIDAS = /^(resumen|upload|planes(\/\d+)?|empresas(\/\d+(\/(acceso|usuarios(\/\d+)?))?)?)$/;

async function proxy(req: Request, { params }: Ctx) {
  const clave = process.env.GYM_PLATFORM_API_KEY;
  if (!clave) return json(503, "La integración con Gym Manager no está configurada (GYM_PLATFORM_API_KEY).");

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, "No autenticado");
  const usuario = await usuarioDelToken(token);
  if (!usuario) return json(401, "Tu sesión ha expirado. Inicia sesión nuevamente.");
  // bk_opendata devuelve en `apps` todas las apps para ADMIN y las asignadas para el resto
  if (usuario.role !== "ADMIN" && !usuario.apps.includes(APP_ID)) {
    return json(403, "No tienes acceso a Gym Manager. Pide acceso a un administrador.");
  }

  const ruta = (await params).path.join("/");
  if (!PERMITIDAS.test(ruta)) return json(404, "Ruta no disponible");

  const destino = new URL(`${GYM_APP}/api/plataforma/${ruta}`);
  new URL(req.url).searchParams.forEach((v, k) => destino.searchParams.set(k, v));

  const headers = new Headers({
    Authorization: `Bearer ${clave}`,
    "X-Plataforma-Usuario": usuario.email,
    Accept: "application/json",
  });
  const tipo = req.headers.get("content-type");
  if (tipo) headers.set("Content-Type", tipo);

  let res: Response;
  try {
    res = await fetch(destino, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return json(502, `No se pudo conectar con Gym Manager (${GYM_APP}). Verifica que esté en ejecución.`);
  }
  // Un 401 de Gym Manager significa clave de plataforma incorrecta, no sesión del panel vencida
  if (res.status === 401) return json(502, "Gym Manager rechazó la clave de plataforma (revisa GYM_PLATFORM_API_KEY).");
  return new Response(await res.arrayBuffer(), {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(req: Request, ctx: Ctx) {
  return proxy(req, ctx);
}
export async function POST(req: Request, ctx: Ctx) {
  return proxy(req, ctx);
}
export async function PATCH(req: Request, ctx: Ctx) {
  return proxy(req, ctx);
}
