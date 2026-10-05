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

/* ------------------------------------------------------------------ */
/* Cobranza de la plataforma (lo que PUKIO cobra a cada gimnasio)       */
/* ------------------------------------------------------------------ */

export type GymConceptoCobro = "MENSUALIDAD" | "IMPLEMENTACION" | "SERVICIO" | "OTRO";
export type GymEstadoCobro = "PENDIENTE" | "PAGADO" | "ANULADO";
/** Estado efectivo: VENCIDO = pendiente con fecha de vencimiento pasada */
export type GymSituacionCobro = GymEstadoCobro | "VENCIDO";
export type GymMetodoPago = "TRANSFERENCIA" | "YAPE" | "PLIN" | "EFECTIVO" | "TARJETA" | "OTRO";

export interface GymCobro {
  id: number;
  empresa: { id: number; nombre: string; slug: string };
  concepto: GymConceptoCobro;
  /** YYYY-MM-DD (primer día del mes) en mensualidades */
  periodo: string | null;
  descripcion: string;
  subtotal: number;
  igv: number;
  total: number;
  pagado: number;
  saldo: number;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: GymEstadoCobro;
  situacion: GymSituacionCobro;
  diasVencido: number;
  cotizacionId: number | null;
  creadoPor: string;
}

export interface GymPagoCobro {
  id: number;
  fecha: string;
  monto: number;
  metodo: GymMetodoPago;
  referencia: string | null;
  notas: string | null;
  anulado: boolean;
  registradoPor: string;
  fechaRegistro: string;
}

export interface GymCobroEvento {
  id: number;
  tipo: "CREADO" | "PAGO" | "PAGO_ANULADO" | "ANULADO" | "VENCIMIENTO" | string;
  detalle: string;
  usuario: string;
  fecha: string;
}

export interface GymCobroDetalle extends GymCobro {
  cotizacion: { id: number; numero: string } | null;
  pagos: GymPagoCobro[];
  eventos: GymCobroEvento[];
}

export interface GymResumenCobranza {
  totales: {
    cobradoMes: number;
    cobradoMesAnterior: number;
    mrr: number;
    suscripcionesActivas: number;
    porCobrar: number;
    porCobrarCantidad: number;
    vencido: number;
    vencidoCantidad: number;
    proximos30: number;
    cobradoAnio: number;
  };
  /** 12 meses, mes = YYYY-MM */
  ingresosMensuales: { mes: string; total: number }[];
  vencidos: GymCobro[];
  proximos: GymCobro[];
  /** Mensualidades estimadas del mes siguiente (aún no emitidas) */
  proyectadas: {
    empresa: { id: number; nombre: string; slug: string };
    descripcion: string;
    fechaEmision: string;
    fechaVencimiento: string;
    total: number;
  }[];
  ultimosPagos: {
    id: number;
    fecha: string;
    monto: number;
    metodo: GymMetodoPago;
    referencia: string | null;
    cobro: { id: number; descripcion: string; empresa: { id: number; nombre: string } };
  }[];
  actividad: { id: number; tipo: string; detalle: string; usuario: string; fecha: string; cobroId: number; empresa: string }[];
  sinSuscripcion: { id: number; nombre: string; slug: string }[];
}

export interface GymSuscripcion {
  configurada: boolean;
  plan: string;
  /** Sin IGV */
  precioMensual: number;
  /** Con IGV si aplica */
  totalMensual: number;
  aplicaIgv: boolean;
  diaCobro: number;
  diasCredito: number;
  /** YYYY-MM-DD (primer día del mes) */
  fechaInicio: string;
  activo: boolean;
  notas: string | null;
  fechaModificacion: string | null;
}

export type GymEstadoCotizacion = "BORRADOR" | "ENVIADA" | "ACEPTADA" | "RECHAZADA";

export interface GymCotizacionItem {
  id?: number;
  tipo: "MENSUAL" | "UNICO";
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
}

interface GymMontos {
  subtotal: number;
  igv: number;
  total: number;
}

export interface GymTotalesCotizacion {
  igvTasa: number;
  mensualBruto: number;
  unicoBruto: number;
  descuentoMensual: number;
  descuentoUnico: number;
  mensual: GymMontos;
  unico: GymMontos;
  inicial: GymMontos;
  anio1: { subtotal: number; total: number };
}

export interface GymCotizacion {
  id: number;
  numero: string;
  fecha: string;
  validezDias: number;
  venceEl: string;
  vencida: boolean;
  empresa: { id: number; nombre: string; slug: string } | null;
  clienteNombre: string;
  clienteDocumento: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  plan: { id: number; codigo: string; nombre: string } | null;
  aplicaIgv: boolean;
  primeraMensualidadAlInicio: boolean;
  descuentoMensualPct: number;
  descuentoUnicoPct: number;
  estado: GymEstadoCotizacion;
  notas: string | null;
  creadoPor: string;
  fechaCreacion: string;
  fechaModificacion: string | null;
  items: GymCotizacionItem[];
  cobros: { id: number; concepto: GymConceptoCobro; total: number; estado: GymEstadoCobro }[];
  totales: GymTotalesCotizacion;
}

export interface GymCotizacionInput {
  fecha: string;
  validezDias: number;
  empresaId: number | null;
  clienteNombre: string;
  clienteDocumento: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  planId: number | null;
  aplicaIgv: boolean;
  primeraMensualidadAlInicio: boolean;
  descuentoMensualPct: number;
  descuentoUnicoPct: number;
  notas: string | null;
  items: GymCotizacionItem[];
}
