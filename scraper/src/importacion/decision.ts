// Lógica de decisión del importador: funciones puras, sin red ni base.
// Decide qué insertar, qué unir, qué descartar, y lleva los contadores.

import { tieneContacto } from '../limpieza/contacto.js';
import { sonMismoNegocio } from '../limpieza/duplicados.js';
import type { Lead } from '../limpieza/tipos.js';
import { unirLeads } from '../limpieza/union.js';

/** Motivo de descarte automático para leads que llegan sin contacto. */
export const MOTIVO_SIN_CONTACTO = 'sin_contacto_inicial';

export type Decision =
  | { accion: 'insertar'; lead: Lead; descartado: boolean }
  | { accion: 'unir'; id: string; lead: Lead; reactivado: boolean };

/**
 * Elige, entre los candidatos de la base, el que es el mismo negocio.
 * Prioriza el que comparte google_place_id; si no, el primero que coincida.
 */
export function elegirCoincidencia(nuevo: Lead, candidatos: readonly Lead[]): (Lead & { id: string }) | null {
  const conId = candidatos.filter((c): c is Lead & { id: string } => typeof c.id === 'string' && c.id !== '');
  const placeId = nuevo.google_place_id?.trim();
  if (placeId) {
    const porPlace = conId.find((c) => c.google_place_id?.trim() === placeId);
    if (porPlace) return porPlace;
  }
  return conId.find((c) => sonMismoNegocio(c, nuevo)) ?? null;
}

/**
 * Decide qué hacer con un lead nuevo:
 * - Si coincide con uno existente: se unen (gana lo existente, ver union.ts).
 *   Si el existente estaba descartado por "sin contacto" y ahora tiene
 *   contacto, se le quita el descarte. Otros descartes (de Mauro) no se tocan.
 * - Si no coincide: se inserta. Si no tiene contacto, se guarda igual
 *   pero descartado con motivo "sin_contacto_inicial".
 */
export function decidir(nuevo: Lead, candidatos: readonly Lead[]): Decision {
  const existente = elegirCoincidencia(nuevo, candidatos);

  if (!existente) {
    const sinContacto = !tieneContacto(nuevo);
    const lead: Lead = sinContacto
      ? { ...nuevo, descartado: true, motivo_descarte: MOTIVO_SIN_CONTACTO }
      : { ...nuevo, descartado: false, motivo_descarte: null };
    return { accion: 'insertar', lead, descartado: sinContacto };
  }

  let lead = unirLeads(existente, nuevo);
  let reactivado = false;
  if (existente.descartado === true && existente.motivo_descarte === MOTIVO_SIN_CONTACTO && tieneContacto(lead)) {
    lead = { ...lead, descartado: false, motivo_descarte: null };
    reactivado = true;
  }
  return { accion: 'unir', id: existente.id, lead, reactivado };
}

// ---------------------------------------------------------------------
// Contadores
// ---------------------------------------------------------------------

export interface Contadores {
  filasLeidas: number;
  filasSinNombre: number;
  nuevos: number;
  nuevosDescartadosSinContacto: number;
  unidos: number;
  reactivados: number;
  errores: number;
}

export function contadoresIniciales(): Contadores {
  return {
    filasLeidas: 0,
    filasSinNombre: 0,
    nuevos: 0,
    nuevosDescartadosSinContacto: 0,
    unidos: 0,
    reactivados: 0,
    errores: 0,
  };
}

/** Suma una decisión ya guardada con éxito en la base. */
export function contarDecision(c: Contadores, d: Decision): Contadores {
  if (d.accion === 'insertar') {
    return { ...c, nuevos: c.nuevos + 1, nuevosDescartadosSinContacto: c.nuevosDescartadosSinContacto + (d.descartado ? 1 : 0) };
  }
  return { ...c, unidos: c.unidos + 1, reactivados: c.reactivados + (d.reactivado ? 1 : 0) };
}

// ---------------------------------------------------------------------
// Estado de la corrida y bloqueo
// ---------------------------------------------------------------------

export type EstadoCorrida = 'ok' | 'error' | 'frenada_por_bloqueo';

/**
 * Bloqueo igual que en la Etapa 1: aparecen palabras de bloqueo en el log
 * de gosom (captcha, blocked, 429, consent, unusual traffic), o no salió
 * ninguna fila.
 */
export function hayBloqueo(palabrasDeBloqueo: number, filasLeidas: number): boolean {
  return palabrasDeBloqueo > 0 || filasLeidas === 0;
}

export interface DatosEstado {
  /** Error que cortó la importación (base caída, CSV ilegible, etc.). */
  fatal: boolean;
  errores: number;
  bloqueo: boolean;
  /** Código de salida de gosom (null si no se sabe). */
  codigoGosom: number | null;
  filasLeidas: number;
}

/**
 * Orden de prioridad:
 * 1. error: corte fatal, filas que fallaron al guardarse, o gosom terminó
 *    con error sin dejar ninguna fila.
 * 2. frenada_por_bloqueo: señales de bloqueo.
 * 3. ok.
 * Si gosom terminó con código distinto de 0 pero dejó filas, se importan y
 * el código queda anotado en "detalle".
 */
export function estadoDeCorrida(d: DatosEstado): EstadoCorrida {
  const gosomFallo = d.codigoGosom !== null && d.codigoGosom !== 0;
  if (d.fatal || d.errores > 0 || (gosomFallo && d.filasLeidas === 0)) return 'error';
  if (d.bloqueo) return 'frenada_por_bloqueo';
  return 'ok';
}

// ---------------------------------------------------------------------
// Textos (solo números y estados, NUNCA datos de negocios)
// ---------------------------------------------------------------------

/** Nota técnica para corridas.detalle: solo números y códigos. */
export function detalleTecnico(c: Contadores, extra: { codigoGosom: number | null; palabrasDeBloqueo: number; codigoError: string | null }): string {
  const partes = [
    `filas=${c.filasLeidas}`,
    `sin_nombre=${c.filasSinNombre}`,
    `nuevos=${c.nuevos}`,
    `descartados_sin_contacto=${c.nuevosDescartadosSinContacto}`,
    `unidos=${c.unidos}`,
    `reactivados=${c.reactivados}`,
    `errores=${c.errores}`,
    `codigo_gosom=${extra.codigoGosom ?? 'desconocido'}`,
    `palabras_bloqueo=${extra.palabrasDeBloqueo}`,
  ];
  if (extra.codigoError) partes.push(`error=${extra.codigoError}`);
  return partes.join(' ');
}

/** Líneas del resumen que se imprimen en el log de GitHub Actions. */
export function lineasDeResumen(c: Contadores, estado: EstadoCorrida, bloqueo: boolean): string[] {
  return [
    '===== RESUMEN BUSCAR =====',
    `Filas leidas: ${c.filasLeidas}`,
    `Filas sin nombre (ignoradas): ${c.filasSinNombre}`,
    `Leads nuevos: ${c.nuevos}`,
    `  de esos, descartados por falta de contacto: ${c.nuevosDescartadosSinContacto}`,
    `Leads unidos con existentes: ${c.unidos}`,
    `  de esos, reactivados (ahora tienen contacto): ${c.reactivados}`,
    `Errores: ${c.errores}`,
    `Bloqueo: ${bloqueo ? 'si' : 'no'}`,
    `Estado de la corrida: ${estado}`,
    '==========================',
  ];
}

/**
 * Convierte cualquier error en un código corto y seguro para imprimir.
 * NUNCA devuelve el mensaje del error (puede traer datos de la fila).
 * - Errores de Supabase/Postgres: su código (ej. "23505").
 * - Otros: el tipo de error (ej. "TypeError").
 */
export function codigoDeErrorSeguro(error: unknown): string {
  if (error && typeof error === 'object') {
    const codigo = (error as { code?: unknown }).code;
    if (typeof codigo === 'string' && /^[A-Za-z0-9_]{1,12}$/.test(codigo)) return codigo;
    const nombre = (error as { name?: unknown }).name;
    if (typeof nombre === 'string' && /^[A-Za-z]{1,40}$/.test(nombre)) return nombre;
  }
  return 'desconocido';
}

// ---------------------------------------------------------------------
// Búsqueda de candidatos
// ---------------------------------------------------------------------

/** Margen (en metros) de la caja para buscar vecinos por cercanía. */
export const MARGEN_CERCANIA_METROS = 100;

const METROS_POR_GRADO_LAT = 111_320;

export interface Caja {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

/** Caja de lat/lng alrededor de un punto, de "metros" de margen para cada lado. */
export function cajaAlrededor(lat: number, lng: number, metros: number = MARGEN_CERCANIA_METROS): Caja {
  const dLat = metros / METROS_POR_GRADO_LAT;
  const cos = Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
  const dLng = metros / (METROS_POR_GRADO_LAT * cos);
  return { latMin: lat - dLat, latMax: lat + dLat, lngMin: lng - dLng, lngMax: lng + dLng };
}

/** Teléfonos del lead (ya normalizados por mapearFilaGosom), sin repetir. */
export function telefonosDeLead(lead: Lead): string[] {
  const lista = [lead.celular, lead.telefono_fijo, lead.telefono_sin_clasificar].filter(
    (t): t is string => typeof t === 'string' && t.trim() !== '',
  );
  return [...new Set(lista)];
}

// ---------------------------------------------------------------------
// Conversión de filas de la base
// ---------------------------------------------------------------------

/** Columnas de leads que lee y escribe el importador. */
export const COLUMNAS_LEAD = [
  'id', 'nombre', 'persona_contacto', 'rubro_id', 'telefono_fijo', 'celular', 'telefono_sin_clasificar',
  'whatsapp', 'email', 'instagram', 'sitio_web', 'direccion', 'localidad', 'provincia', 'pais', 'lat', 'lng',
  'rating', 'resenas', 'google_place_id', 'fuentes', 'notas', 'descartado', 'motivo_descarte',
] as const;

/**
 * Convierte una fila de la base en Lead. Los numeric de Postgres pueden
 * llegar como texto: se pasan a número.
 */
export function filaALead(fila: Record<string, unknown>): Lead {
  const texto = (v: unknown): string | null => (typeof v === 'string' ? v : null);
  const num = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
    return null;
  };
  const fuentes =
    fila['fuentes'] && typeof fila['fuentes'] === 'object' && !Array.isArray(fila['fuentes'])
      ? (fila['fuentes'] as Lead['fuentes'])
      : {};

  const lead: Lead = {
    nombre: texto(fila['nombre']) ?? '',
    persona_contacto: texto(fila['persona_contacto']),
    rubro_id: texto(fila['rubro_id']),
    telefono_fijo: texto(fila['telefono_fijo']),
    celular: texto(fila['celular']),
    telefono_sin_clasificar: texto(fila['telefono_sin_clasificar']),
    whatsapp: texto(fila['whatsapp']),
    email: texto(fila['email']),
    instagram: texto(fila['instagram']),
    sitio_web: texto(fila['sitio_web']),
    direccion: texto(fila['direccion']),
    localidad: texto(fila['localidad']),
    provincia: texto(fila['provincia']),
    pais: texto(fila['pais']),
    lat: num(fila['lat']),
    lng: num(fila['lng']),
    rating: num(fila['rating']),
    resenas: num(fila['resenas']),
    google_place_id: texto(fila['google_place_id']),
    fuentes,
    notas: texto(fila['notas']),
    descartado: fila['descartado'] === true,
    motivo_descarte: texto(fila['motivo_descarte']),
  };
  const id = texto(fila['id']);
  if (id) lead.id = id;
  return lead;
}

/** Datos para insertar un lead nuevo (sin id, sin undefined). */
export function leadAFila(lead: Lead): Record<string, unknown> {
  const fila: Record<string, unknown> = {};
  for (const columna of COLUMNAS_LEAD) {
    if (columna === 'id') continue;
    const valor = lead[columna];
    if (valor !== undefined) fila[columna] = valor;
  }
  return fila;
}

/**
 * Datos para actualizar un lead existente. Nunca se reescriben "notas" ni
 * el descarte (son de Mauro), salvo cuando corresponde reactivarlo: ahí
 * solo se manda descartado = false y motivo_descarte = null.
 */
export function leadAFilaActualizacion(lead: Lead, reactivado: boolean): Record<string, unknown> {
  const fila = leadAFila(lead);
  delete fila['notas'];
  delete fila['descartado'];
  delete fila['motivo_descarte'];
  if (reactivado) {
    fila['descartado'] = false;
    fila['motivo_descarte'] = null;
  }
  return fila;
}
