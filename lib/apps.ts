/**
 * Registro de aplicaciones gestionadas por el Control Center.
 * Para agregar una nueva app basta con añadir una entrada aquí: el selector,
 * el sidebar, el breadcrumb y la paleta ⌘K se construyen a partir de esto.
 */

export type IconName = "activity" | "map" | "landmark" | "building" | "file";

export interface AppMenuItem {
  label: string;
  href: string;
  icon: IconName;
  /** Palabras extra para la búsqueda de la paleta ⌘K. */
  keywords?: string;
}

export interface AppMenuSection {
  title: string;
  items: AppMenuItem[];
}

export interface ManagedApp {
  id: string;
  name: string;
  description: string;
  basePath: string;
  /** Color del punto en el selector de apps. */
  color: string;
  sections: AppMenuSection[];
  enabled: boolean;
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
  },
  // Espacio reservado para futuras apps:
  // { id: "otra-app", name: "Otra App", basePath: "/dashboard/otra-app", color: "#2563eb", ... }
];

export const DEFAULT_APP_ID = "opendata";

export function getAppByPath(pathname: string): ManagedApp {
  // La app con el basePath más largo que coincida gana.
  const match = [...MANAGED_APPS]
    .sort((a, b) => b.basePath.length - a.basePath.length)
    .find((a) => pathname.startsWith(a.basePath));
  return match ?? MANAGED_APPS.find((a) => a.id === DEFAULT_APP_ID)!;
}

/** Ítem de menú activo para la ruta actual (el href más largo que coincida). */
export function getActiveItem(app: ManagedApp, pathname: string): AppMenuItem | undefined {
  return app.sections
    .flatMap((s) => s.items)
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
