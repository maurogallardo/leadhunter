// Filtros de la pantalla de leads.
// Funciones puras: leen los filtros desde la URL, los vuelven a escribir en
// la URL y arman la lista de condiciones que se aplican EN LA BASE.

import { LEADS_POR_PAGINA } from './tipos';

export interface Filtros {
  provincia: string | null;
  localidad: string | null;
  /** id (uuid) del rubro. */
  rubro: string | null;
  conCelular: boolean;
  conEmail: boolean;
  conWhatsapp: boolean;
  conInstagram: boolean;
  mostrarDescartados: boolean;
  /** Texto a buscar en el nombre. */
  busqueda: string | null;
  /** Página, empieza en 1. */
  pagina: number;
}

export const FILTROS_VACIOS: Filtros = {
  provincia: null,
  localidad: null,
  rubro: null,
  conCelular: false,
  conEmail: false,
  conWhatsapp: false,
  conInstagram: false,
  mostrarDescartados: false,
  busqueda: null,
  pagina: 1,
};

/** Nombres de los parámetros en la URL. */
export const PARAM = {
  provincia: 'provincia',
  localidad: 'localidad',
  rubro: 'rubro',
  conCelular: 'celular',
  conEmail: 'mail',
  conWhatsapp: 'whatsapp',
  conInstagram: 'instagram',
  mostrarDescartados: 'descartados',
  busqueda: 'q',
  pagina: 'pagina',
} as const;

const LARGO_MAXIMO_TEXTO = 200;
const LARGO_MAXIMO_BUSQUEDA = 100;
const PAGINA_MAXIMA = 100_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParametrosUrl = URLSearchParams | Record<string, string | string[] | undefined>;

function leer(params: ParametrosUrl, nombre: string): string | null {
  const valor = params instanceof URLSearchParams ? params.get(nombre) : params[nombre];
  const unico = Array.isArray(valor) ? valor[0] : valor;
  if (typeof unico !== 'string') return null;
  const limpio = unico.replace(/\s+/g, ' ').trim();
  return limpio === '' ? null : limpio;
}

function texto(params: ParametrosUrl, nombre: string, largo: number): string | null {
  const valor = leer(params, nombre);
  return valor === null ? null : valor.slice(0, largo);
}

const activado = (params: ParametrosUrl, nombre: string): boolean => leer(params, nombre) === '1';

/** Lee los filtros desde la URL. Lo que no se entiende se ignora. */
export function leerFiltros(params: ParametrosUrl): Filtros {
  const rubro = leer(params, PARAM.rubro);
  const pagina = Number(leer(params, PARAM.pagina));
  return {
    provincia: texto(params, PARAM.provincia, LARGO_MAXIMO_TEXTO),
    localidad: texto(params, PARAM.localidad, LARGO_MAXIMO_TEXTO),
    rubro: rubro !== null && UUID.test(rubro) ? rubro.toLowerCase() : null,
    conCelular: activado(params, PARAM.conCelular),
    conEmail: activado(params, PARAM.conEmail),
    conWhatsapp: activado(params, PARAM.conWhatsapp),
    conInstagram: activado(params, PARAM.conInstagram),
    mostrarDescartados: activado(params, PARAM.mostrarDescartados),
    busqueda: texto(params, PARAM.busqueda, LARGO_MAXIMO_BUSQUEDA),
    pagina: Number.isInteger(pagina) && pagina >= 1 ? Math.min(pagina, PAGINA_MAXIMA) : 1,
  };
}

/**
 * Escribe los filtros en la URL (solo los que no están vacíos).
 * La página 1 no se escribe.
 */
export function filtrosAParametros(f: Filtros, incluirPagina = true): URLSearchParams {
  const p = new URLSearchParams();
  if (f.provincia) p.set(PARAM.provincia, f.provincia);
  if (f.localidad) p.set(PARAM.localidad, f.localidad);
  if (f.rubro) p.set(PARAM.rubro, f.rubro);
  if (f.conCelular) p.set(PARAM.conCelular, '1');
  if (f.conEmail) p.set(PARAM.conEmail, '1');
  if (f.conWhatsapp) p.set(PARAM.conWhatsapp, '1');
  if (f.conInstagram) p.set(PARAM.conInstagram, '1');
  if (f.mostrarDescartados) p.set(PARAM.mostrarDescartados, '1');
  if (f.busqueda) p.set(PARAM.busqueda, f.busqueda);
  if (incluirPagina && f.pagina > 1) p.set(PARAM.pagina, String(f.pagina));
  return p;
}

/** Link a la pantalla de leads con esos filtros. */
export function urlConFiltros(ruta: string, f: Filtros, incluirPagina = true): string {
  const query = filtrosAParametros(f, incluirPagina).toString();
  return query === '' ? ruta : `${ruta}?${query}`;
}

/** Filas de la página (para .range de Supabase, ambos extremos incluidos). */
export function rangoDePagina(pagina: number, porPagina = LEADS_POR_PAGINA): { desde: number; hasta: number } {
  const desde = (Math.max(1, Math.floor(pagina)) - 1) * porPagina;
  return { desde, hasta: desde + porPagina - 1 };
}

export const totalDePaginas = (total: number, porPagina = LEADS_POR_PAGINA): number =>
  Math.max(1, Math.ceil(Math.max(0, total) / porPagina));

// ---------------------------------------------------------------------
// Búsqueda por nombre sin distinguir mayúsculas ni tildes.
// Sin SQL nuevo: se usa una expresión regular sin distinguir mayúsculas
// (operador "imatch" de Supabase) donde cada vocal acepta sus versiones
// con tilde. Ej.: "cordoba" -> c[oóòöôõOÓÒÖÔÕ]rd[oó...]b[aá...]
// ---------------------------------------------------------------------

const VARIANTES: Record<string, string> = {
  a: 'aáàäâãAÁÀÄÂÃ',
  e: 'eéèëêEÉÈËÊ',
  i: 'iíìïîIÍÌÏÎ',
  o: 'oóòöôõOÓÒÖÔÕ',
  u: 'uúùüûUÚÙÜÛ',
  n: 'nñNÑ',
};

const ESPECIALES_REGEX = /[\\^$.|?*+()[\]{}]/;

/** Saca tildes y pasa a minúsculas ("Córdoba" -> "cordoba"). */
export function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Expresión regular para buscar el texto en el nombre, o null si no hay nada que buscar. */
export function patronBusqueda(texto: string | null): string | null {
  if (texto === null) return null;
  const base = sinTildes(texto).replace(/\s+/g, ' ').trim().slice(0, LARGO_MAXIMO_BUSQUEDA);
  if (base === '') return null;
  let patron = '';
  for (const letra of base) {
    const variantes = VARIANTES[letra];
    if (variantes) patron += `[${variantes}]`;
    else if (ESPECIALES_REGEX.test(letra)) patron += `\\${letra}`;
    else patron += letra;
  }
  return patron;
}

// ---------------------------------------------------------------------
// Condiciones para la base
// ---------------------------------------------------------------------

export type Condicion =
  | { op: 'igual'; columna: string; valor: string | boolean }
  /** La columna tiene dato (no es null ni texto vacío). */
  | { op: 'conDato'; columna: string }
  | { op: 'regexSinMayusculas'; columna: string; patron: string };

/** Arma la lista de condiciones a partir de los filtros. */
export function condicionesDeFiltros(f: Filtros): Condicion[] {
  const c: Condicion[] = [];
  if (!f.mostrarDescartados) c.push({ op: 'igual', columna: 'descartado', valor: false });
  if (f.provincia) c.push({ op: 'igual', columna: 'provincia', valor: f.provincia });
  if (f.localidad) c.push({ op: 'igual', columna: 'localidad', valor: f.localidad });
  if (f.rubro) c.push({ op: 'igual', columna: 'rubro_id', valor: f.rubro });
  if (f.conCelular) c.push({ op: 'conDato', columna: 'celular' });
  if (f.conEmail) c.push({ op: 'conDato', columna: 'email' });
  if (f.conWhatsapp) c.push({ op: 'conDato', columna: 'whatsapp' });
  if (f.conInstagram) c.push({ op: 'conDato', columna: 'instagram' });
  const patron = patronBusqueda(f.busqueda);
  if (patron !== null) c.push({ op: 'regexSinMayusculas', columna: 'nombre', patron });
  return c;
}

/** Interfaz mínima del armador de consultas de Supabase que se usa acá. */
export interface ConsultaFiltrable<T> {
  eq(columna: string, valor: string | boolean): T;
  not(columna: string, operador: string, valor: null): T;
  neq(columna: string, valor: string): T;
  regexIMatch(columna: string, patron: string): T;
}

/** Aplica las condiciones a una consulta de Supabase. */
export function aplicarCondiciones<T extends ConsultaFiltrable<T>>(consulta: T, condiciones: readonly Condicion[]): T {
  let q = consulta;
  for (const c of condiciones) {
    if (c.op === 'igual') q = q.eq(c.columna, c.valor);
    else if (c.op === 'conDato') q = q.not(c.columna, 'is', null).neq(c.columna, '');
    else q = q.regexIMatch(c.columna, c.patron);
  }
  return q;
}

/** Localidades de una provincia (o todas si no hay provincia), sin repetir y ordenadas. */
export function localidadesDe(ubicaciones: readonly { provincia: string | null; localidad: string | null }[], provincia: string | null): string[] {
  const set = new Set<string>();
  for (const u of ubicaciones) {
    if (!u.localidad) continue;
    if (provincia && u.provincia !== provincia) continue;
    set.add(u.localidad);
  }
  return ordenar([...set]);
}

/** Provincias sin repetir y ordenadas. */
export function provinciasDe(ubicaciones: readonly { provincia: string | null }[]): string[] {
  const set = new Set<string>();
  for (const u of ubicaciones) if (u.provincia) set.add(u.provincia);
  return ordenar([...set]);
}

const ordenar = (lista: string[]): string[] => lista.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
