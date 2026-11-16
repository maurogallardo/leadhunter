// Tipos compartidos por las funciones de limpieza.
// Los nombres de los campos son los mismos que las columnas de la tabla
// public.leads (migraciones 0001 y 0002).

/**
 * De qué fuente salió cada dato. Ejemplo:
 *   { "celular": ["gosom"], "email": ["gosom", "sitio_web"] }
 * La fuente especial "manual" marca un dato cargado a mano por Mauro:
 * ese dato no se pisa nunca.
 */
export type Fuentes = Record<string, string[]>;

/** Un lead tal como se guarda en public.leads (sin las columnas automáticas). */
export interface Lead {
  id?: string;
  nombre: string;
  persona_contacto?: string | null;
  rubro_id?: string | null;
  telefono_fijo?: string | null;
  celular?: string | null;
  telefono_sin_clasificar?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  instagram?: string | null;
  sitio_web?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  pais?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  resenas?: number | null;
  google_place_id?: string | null;
  fuentes: Fuentes;
  notas?: string | null;
  descartado?: boolean;
  motivo_descarte?: string | null;
}

/** Fuente que marca un dato cargado a mano. */
export const FUENTE_MANUAL = 'manual';

/** true si el valor está vacío (null, undefined o texto en blanco). */
export function estaVacio(valor: unknown): boolean {
  return valor === null || valor === undefined || (typeof valor === 'string' && valor.trim() === '');
}
