/** Tipos de la API de plataforma de Gym Manager (vía el proxy /api/gym). Fechas como string ISO. */

/** Código de un plan de planes_plataforma (BASICO, PRO, ENTERPRISE u otros creados desde el panel). */
export type GymPlan = string;

export interface GymMetricas {
  sociosActivos: number;
  suscripcionesVigentes: number;
  ingresosHoy: number;
  ingresosMes: number;
  ventasMes: number;
  asistenciasHoy: number;
  usuariosActivos: number;
  solicitudesPendientes: number;
  ultimaVenta: string | null;
}

export interface GymEmpresaResumen {
  id: number;
  slug: string;
  nombre: string;
  ruc: string | null;
  logoUrl: string | null;
  /** Código del plan (planes_plataforma.codigo) */
  plan: GymPlan;
  planNombre: string;
  /** Límites del plan (null = ilimitado). El uso actual está en metricas. */
  limites: { maxSocios: number | null; maxUsuarios: number | null };
  activo: boolean;
  motivoSuspension: string | null;
  fechaCreacion: string;
  metricas: GymMetricas;
}

export interface GymResumen {
  totales: {
    empresas: number;
    empresasActivas: number;
    empresasSuspendidas: number;
    sociosActivos: number;
    suscripcionesVigentes: number;
    ingresosHoy: number;
    ingresosMes: number;
    asistenciasHoy: number;
    solicitudesPendientes: number;
  };
  ingresosDiarios: { fecha: string; total: number }[];
  empresas: GymEmpresaResumen[];
}

export interface GymUsuario {
  id: number;
  username: string;
  rol: string;
  activo: boolean;
  tienePin: boolean;
  fechaCreacion: string | null;
}

export interface GymEmpresaDetalle extends Omit<GymEmpresaResumen, "metricas"> {
  razonSocial: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  mailFromName: string | null;
  facturacionRuc: string | null;
  facturacionApiKeyConfigurada: boolean;
  consultaApiTokenConfigurado: boolean;
  fechaModificacion: string | null;
  /** Últimos 20 cambios de estado (alta, suspensiones, reactivaciones) */
  historialEstado: { id: number; activo: boolean; motivo: string | null; usuario: string; fecha: string }[];
  metricas: GymMetricas;
  usuarios: GymUsuario[];
  urls: { login: string; catalogo: string };
}

export interface GymPlanPlataforma {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  precioMensual: number;
  maxSocios: number | null;
  maxUsuarios: number | null;
  activo: boolean;
  /** Empresas que lo usan */
  empresas: number;
}

export interface GymPlanInput {
  /** Solo al crear (mayúsculas, números y _). No se puede cambiar después. */
  codigo?: string;
  nombre?: string;
  descripcion?: string | null;
  precioMensual?: number;
  /** null = ilimitado */
  maxSocios?: number | null;
  maxUsuarios?: number | null;
  activo?: boolean;
}

export interface GymEmpresaInput {
  slug?: string;
  nombre?: string;
  razonSocial?: string | null;
  ruc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  plan?: GymPlan;
  mailFromName?: string | null;
  activo?: boolean;
  motivoSuspension?: string | null;
  facturacionRuc?: string | null;
  /** string = guardar; "" o null = borrar; ausente = no cambiar */
  facturacionApiKey?: string | null;
  consultaApiToken?: string | null;
}

export interface GymNuevaEmpresa extends GymEmpresaInput {
  slug: string;
  nombre: string;
  admin: { username: string; password: string; pin?: string | null };
}
