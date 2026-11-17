// Tipos del panel. Los nombres de los campos son los de la tabla
// public.leads (migraciones 0001 y 0002).

/** Un lead tal como lo muestra el panel (sin columnas internas). */
export interface LeadPanel {
  id: string;
  nombre: string;
  persona_contacto: string | null;
  rubro: string | null;
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  telefono_fijo: string | null;
  celular: string | null;
  telefono_sin_clasificar: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  sitio_web: string | null;
  rating: number | null;
  resenas: number | null;
  descartado: boolean;
  creado_en: string;
}

/** Columnas que se piden a la base (el rubro llega por la relación rubro_id). */
export const COLUMNAS_LEAD =
  'id, nombre, persona_contacto, direccion, localidad, provincia, telefono_fijo, celular, ' +
  'telefono_sin_clasificar, whatsapp, email, instagram, sitio_web, rating, resenas, ' +
  'descartado, creado_en, rubros(nombre)';

/** Leads por página (paginación hecha en la base). */
export const LEADS_POR_PAGINA = 100;

/** Tamaño de cada tanda al exportar (máximo que devuelve Supabase por pedido). */
export const TANDA_EXPORTAR = 1000;

export interface Rubro {
  id: string;
  nombre: string;
}

export interface Ubicacion {
  provincia: string | null;
  localidad: string | null;
}

/** Convierte una fila de la base en LeadPanel. */
export function filaALead(fila: Record<string, unknown>): LeadPanel {
  const rubros = fila['rubros'];
  const rubro =
    rubros && typeof rubros === 'object' && !Array.isArray(rubros)
      ? texto((rubros as Record<string, unknown>)['nombre'])
      : null;
  return {
    id: String(fila['id']),
    nombre: texto(fila['nombre']) ?? '',
    persona_contacto: texto(fila['persona_contacto']),
    rubro,
    direccion: texto(fila['direccion']),
    localidad: texto(fila['localidad']),
    provincia: texto(fila['provincia']),
    telefono_fijo: texto(fila['telefono_fijo']),
    celular: texto(fila['celular']),
    telefono_sin_clasificar: texto(fila['telefono_sin_clasificar']),
    whatsapp: texto(fila['whatsapp']),
    email: texto(fila['email']),
    instagram: texto(fila['instagram']),
    sitio_web: texto(fila['sitio_web']),
    rating: numero(fila['rating']),
    resenas: numero(fila['resenas']),
    descartado: fila['descartado'] === true,
    creado_en: String(fila['creado_en'] ?? ''),
  };
}

function texto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}
