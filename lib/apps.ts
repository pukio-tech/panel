/**
 * Registro de aplicaciones gestionadas por el Control Center.
 * Para agregar una nueva app basta con añadir una entrada aquí: el selector,
 * el sidebar, el breadcrumb y la paleta ⌘K se construyen a partir de esto.
 */

export type IconName = "activity" | "map" | "landmark" | "building" | "file" | "dumbbell" | "layers" | "users" | "user";

export interface AppMenuItem {
  label: string;
  href: string;
  icon: IconName;
  /** Palabras extra para la búsqueda de la paleta ⌘K. */
  keywords?: string;
  /** Solo visible para superadministradores (rol ADMIN). */
  adminOnly?: boolean;
}

export interface AppMenuSection {
  title: string;
  items: AppMenuItem[];
}

/** Acción rápida de una app: botón «+ Crear» del header y paleta ⌘K. */
export interface AppQuickAction {
  /** Texto en el menú «Crear» del header. */
  label: string;
  href: string;
  icon: IconName;
  /** Texto en la paleta ⌘K (por defecto, `label`). */
  paletteLabel?: string;
  /** Palabras extra para la búsqueda de la paleta ⌘K. */
  keywords?: string;
}

export interface ManagedApp {
  id: string;
  name: string;
  description: string;
  basePath: string;
  /** Color del punto en el selector de apps. */
  color: string;
  sections: AppMenuSection[];
  /** Acciones de creación rápida (header «+ Crear» y paleta ⌘K). */
  quickActions?: AppQuickAction[];
  enabled: boolean;
  /**
   * App interna del panel (configuración, mi cuenta): visible para todos los usuarios
   * y no se asigna como acceso. Las demás apps requieren acceso (user_apps en bk_opendata).
   */
  system?: boolean;
}

export const MANAGED_APPS: ManagedApp[] = [
  {
    id: "opendata",
    name: "OpenData Perú",
    description: "Turismo y datos abiertos",
    basePath: "/dashboard",
    color: "#c2410c",
    enabled: true,
    sections: [
      {
        title: "General",
        items: [{ label: "Resumen", href: "/dashboard", icon: "activity", keywords: "inicio dashboard" }],
      },
      {
        title: "Catálogo",
        items: [
          {
            label: "Turismo",
            href: "/dashboard/opendata/lugares",
            icon: "map",
            keywords: "lugares turisticos recursos mincetur atractivos",
          },
          {
            label: "Museos",
            href: "/dashboard/opendata/museos",
            icon: "landmark",
            keywords: "cultura",
          },
        ],
      },
      {
        title: "Directorio",
        items: [
          {
            label: "Empresas",
            href: "/dashboard/opendata/empresas",
            icon: "building",
            keywords: "ruc contribuyentes sunat",
          },
        ],
      },
      {
        title: "Contenido",
        items: [
          {
            label: "Blog / Artículos",
            href: "/dashboard/opendata/blog",
            icon: "file",
            keywords: "posts noticias",
          },
        ],
      },
    ],
    quickActions: [
      {
        label: "Lugar turístico",
        paletteLabel: "Crear lugar turístico",
        href: "/dashboard/opendata/lugares/nuevo",
        icon: "map",
        keywords: "nuevo",
      },
      {
        label: "Museo",
        paletteLabel: "Crear museo",
        href: "/dashboard/opendata/museos/nuevo",
        icon: "landmark",
        keywords: "nuevo",
      },
      {
        label: "Empresa",
        paletteLabel: "Crear empresa",
        href: "/dashboard/opendata/empresas/nuevo",
        icon: "building",
        keywords: "nuevo ruc",
      },
      {
        label: "Artículo del blog",
        paletteLabel: "Escribir artículo",
        href: "/dashboard/opendata/blog/nuevo",
        icon: "file",
        keywords: "nuevo post",
      },
    ],
  },
  {
    id: "gym",
    name: "Gym Manager",
    description: "Gestión de gimnasios (multiempresa)",
    basePath: "/dashboard/gym",
    color: "#059669",
    enabled: true,
    sections: [
      {
        title: "General",
        items: [{ label: "Resumen", href: "/dashboard/gym", icon: "activity", keywords: "gym gimnasios inicio" }],
      },
      {
        title: "Clientes",
        items: [
          {
            label: "Empresas",
            href: "/dashboard/gym/empresas",
            icon: "dumbbell",
            keywords: "gimnasios clientes empresas tenants",
          },
          {
            label: "Planes",
            href: "/dashboard/gym/planes",
            icon: "layers",
            keywords: "planes precios limites suscripcion socios usuarios",
          },
        ],
      },
    ],
    quickActions: [
      {
        label: "Nueva empresa",
        paletteLabel: "Nueva empresa (Gym Manager)",
        href: "/dashboard/gym/empresas/nueva",
        icon: "dumbbell",
        keywords: "crear gimnasio tenant",
      },
    ],
  },
  {
    id: "sistema",
    name: "Configuración",
    description: "Usuarios del panel y tu cuenta",
    basePath: "/dashboard/sistema",
    color: "#52525b",
    enabled: true,
    system: true,
    sections: [
      {
        title: "Administración",
        items: [
          {
            label: "Usuarios",
            href: "/dashboard/sistema/usuarios",
            icon: "users",
            keywords: "accesos permisos roles apps equipo",
            adminOnly: true,
          },
        ],
      },
      {
        title: "Cuenta",
        items: [{ label: "Mi cuenta", href: "/dashboard/sistema/cuenta", icon: "user", keywords: "contraseña perfil" }],
      },
    ],
  },
  // Para agregar otra app basta con añadir una entrada aquí (y registrarla en panel_apps de bk_opendata):
  // { id: "otra-app", name: "Otra App", basePath: "/dashboard/otra-app", color: "#2563eb", ... }
];

export const DEFAULT_APP_ID = "opendata";

export function getAppByPath(pathname: string): ManagedApp {
  // La app con el basePath más largo que coincida gana.
  const match = [...MANAGED_APPS]
    .sort((a, b) => b.basePath.length - a.basePath.length)
    .find((a) => pathname === a.basePath || pathname.startsWith(`${a.basePath}/`));
  return match ?? MANAGED_APPS.find((a) => a.id === DEFAULT_APP_ID)!;
}

/** Ítem de menú activo para la ruta actual (el href más largo que coincida). */
export function getActiveItem(app: ManagedApp, pathname: string): AppMenuItem | undefined {
  return app.sections
    .flatMap((s) => s.items)
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/* ------------------------------------------------------------------ */
/* Accesos por usuario                                                 */
/* ------------------------------------------------------------------ */

/** Rol con acceso a todas las apps y a la gestión de usuarios. */
export const SUPERADMIN_ROLE = "ADMIN";

interface UsuarioAcceso {
  role?: string;
  /** Apps asignadas (las devuelve bk_opendata en login y /api/auth/me). */
  apps?: string[];
}

export const esSuperadmin = (user: UsuarioAcceso | null | undefined) => user?.role === SUPERADMIN_ROLE;

/**
 * ¿Puede el usuario entrar a la app? `null` si aún no se sabe (sesión antigua sin `apps`,
 * se resuelve al refrescar /api/auth/me). La validación real la hace el backend.
 */
export function puedeAccederApp(app: ManagedApp, user: UsuarioAcceso | null | undefined): boolean | null {
  if (!app.enabled) return false;
  if (app.system || esSuperadmin(user)) return true;
  if (!user?.apps) return null;
  return user.apps.includes(app.id);
}

/** Apps visibles en el selector y la paleta para el usuario. */
export function appsDelUsuario(user: UsuarioAcceso | null | undefined): ManagedApp[] {
  return MANAGED_APPS.filter((a) => puedeAccederApp(a, user) !== false);
}

/** Secciones de la app con solo los ítems que el usuario puede ver (sin secciones vacías). */
export function seccionesVisibles(app: ManagedApp, user: UsuarioAcceso | null | undefined): AppMenuSection[] {
  const admin = esSuperadmin(user);
  return app.sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.adminOnly || admin) }))
    .filter((s) => s.items.length > 0);
}
