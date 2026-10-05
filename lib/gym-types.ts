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
  /** Módulos opcionales activos */
  modulos: GymModuloCodigo[];
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

export interface GymEmpresaDetalle extends Omit<GymEmpresaResumen, "metricas" | "modulos"> {
  razonSocial: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  mailFromName: string | null;
  facturacionRuc: string | null;
  facturacionApiKeyConfigurada: boolean;
  consultaApiTokenConfigurado: boolean;
  /** Últimos 4 caracteres ("••••-mqf") para reconocer la credencial guardada */
  facturacionApiKeyPista: string | null;
  consultaApiTokenPista: string | null;
  /** Vencimiento del token de consultas (ISO), si es un JWT con exp */
  consultaApiTokenVence: string | null;
  fechaModificacion: string | null;
  /** Marca del gimnasio en Gym Manager (null = tema por defecto) */
  apariencia: GymApariencia;
  /** Módulos opcionales: incluidos por el plan y ajustes propios */
  modulos: GymEmpresaModulo[];
  /** Últimos 20 cambios de estado (alta, suspensiones, reactivaciones) */
  historialEstado: { id: number; activo: boolean; motivo: string | null; usuario: string; fecha: string }[];
  metricas: GymMetricas;
  usuarios: GymUsuario[];
  urls: { login: string; catalogo: string };
}

export interface GymApariencia {
  /** #RRGGBB */
  colorPrimario: string | null;
  /** Clave de GYM_TIPOGRAFIAS */
  tipografia: string | null;
}

export interface GymPaginado<T> {
  data: T[];
  pagination: { total: number; page: number; pageSize: number; pages: number };
}

export interface GymSocio {
  id: number;
  nombreCompleto: string;
  dni: string;
  telefono: string | null;
  email: string | null;
  estado: "ACTIVO" | "INACTIVO";
  fechaCreacion: string | null;
  /** Membresía vigente (null si no tiene) */
  membresia: { nombre: string; fechaInicio: string; fechaFin: string; congelada: boolean } | null;
}

export interface GymProducto {
  id: number;
  nombre: string;
  imagenUrl: string | null;
  precio: number;
  stock: number;
  stockMinimo: number;
  activo: boolean;
  fechaVencimiento: string | null;
  categoria: string | null;
}

/** Módulos opcionales (mismas claves que src/lib/modulos.ts de gym-app). */
export type GymModuloCodigo = "FACTURACION" | "CONSULTAS" | "CATALOGO" | "CORREOS";

export interface GymModulo {
  codigo: GymModuloCodigo;
  nombre: string;
  descripcion: string | null;
  orden: number;
}

/** Estado de un módulo en una empresa: lo que dice su plan y su ajuste propio. */
export interface GymEmpresaModulo {
  codigo: GymModuloCodigo;
  nombre: string;
  descripcion: string;
  incluidoEnPlan: boolean;
  /** true = activado aparte, false = desactivado aparte, null = según el plan */
  ajuste: boolean | null;
  motivo: string | null;
  /** Resultado final */
  activo: boolean;
}

export interface GymPlanPlataforma {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  /** Mensualidad sin IGV */
  precioMensual: number;
  /** Pago único de implementación sin IGV */
  precioImplementacion: number;
  maxSocios: number | null;
  maxUsuarios: number | null;
  /** Consultas DNI/RUC por mes (null = sin tope definido) */
  consultasMes: number | null;
  soporte: string | null;
  destacado: boolean;
  orden: number;
  activo: boolean;
  modulos: GymModuloCodigo[];
  caracteristicas: string[];
  /** Empresas que lo usan */
  empresas: number;
}

export interface GymPlanInput {
  /** Solo al crear (mayúsculas, números y _). No se puede cambiar después. */
  codigo?: string;
  nombre?: string;
  descripcion?: string | null;
  precioMensual?: number;
  precioImplementacion?: number;
  /** null = ilimitado */
  maxSocios?: number | null;
  maxUsuarios?: number | null;
  consultasMes?: number | null;
  soporte?: string | null;
  destacado?: boolean;
  orden?: number;
  activo?: boolean;
  modulos?: GymModuloCodigo[];
  caracteristicas?: string[];
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
  colorPrimario?: string | null;
  tipografia?: string | null;
  /** Ajustes de módulos: activo null = volver a lo que diga el plan */
  modulos?: { codigo: GymModuloCodigo; activo: boolean | null; motivo?: string | null }[];
}

export interface GymNuevaEmpresa extends GymEmpresaInput {
  slug: string;
  nombre: string;
  admin: { username: string; password: string; pin?: string | null };
}
