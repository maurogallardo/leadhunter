// Lectura de la lista oficial de localidades (API Georef de datos.gob.ar,
// fuente INDEC) y de la población por municipio (Censo 2022, INDEC).
// Funciones puras: reciben el texto descargado y devuelven filas para la
// tabla public.localidades_oficiales (migración 0005).

import { limpiarNombreOficial, normalizarNombre } from './normalizar.js';

export type TipoLocalidad = 'localidad' | 'localidad_censal';

/** Una fila de public.localidades_oficiales (sin cargada_en). */
export interface FilaLocalidadOficial {
  tipo: TipoLocalidad;
  id_oficial: string;
  nombre: string;
  nombre_normalizado: string;
  categoria: string | null;
  provincia: string;
  provincia_id: string;
  departamento: string | null;
  departamento_id: string | null;
  municipio: string | null;
  municipio_id: string | null;
  localidad_censal: string | null;
  localidad_censal_id: string | null;
  lat: number | null;
  lng: number | null;
  poblacion_municipio: number | null;
  fuente: string;
}

/** Clave de cada lista en la respuesta de Georef. */
export const CLAVE_GEOREF: Record<TipoLocalidad, string> = {
  localidad: 'localidades',
  localidad_censal: 'localidades_censales',
};

export class ErrorDeFuente extends Error {
  override name = 'ErrorDeFuente';
}

type Objeto = Record<string, unknown>;
const esObjeto = (v: unknown): v is Objeto => typeof v === 'object' && v !== null && !Array.isArray(v);
const texto = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const limpio = limpiarNombreOficial(v);
  return limpio === '' ? null : limpio;
};
const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const parte = (v: unknown, campo: 'id' | 'nombre'): string | null => (esObjeto(v) ? texto(v[campo]) : null);

/**
 * Convierte la respuesta de Georef en filas. Exige que la respuesta esté
 * completa (cantidad = total) y que cada registro tenga id, nombre y provincia.
 */
export function filasDesdeGeoref(json: unknown, tipo: TipoLocalidad): FilaLocalidadOficial[] {
  if (!esObjeto(json)) throw new ErrorDeFuente('respuesta de Georef con formato inesperado');
  const lista = json[CLAVE_GEOREF[tipo]];
  if (!Array.isArray(lista)) throw new ErrorDeFuente('respuesta de Georef sin la lista esperada');
  if (typeof json['total'] !== 'number' || json['total'] !== lista.length) {
    throw new ErrorDeFuente('respuesta de Georef incompleta (cantidad distinta del total)');
  }

  return lista.map((item) => {
    if (!esObjeto(item)) throw new ErrorDeFuente('registro de Georef con formato inesperado');
    const id = texto(item['id']);
    const nombre = texto(item['nombre']);
    const provincia = parte(item['provincia'], 'nombre');
    const provinciaId = parte(item['provincia'], 'id');
    if (!id || !nombre || !provincia || !provinciaId) throw new ErrorDeFuente('registro de Georef sin id, nombre o provincia');
    const centroide = esObjeto(item['centroide']) ? item['centroide'] : {};
    const lat = numero(centroide['lat']);
    const lng = numero(centroide['lon']);
    return {
      tipo,
      id_oficial: id,
      nombre,
      nombre_normalizado: normalizarNombre(nombre),
      categoria: texto(item['categoria']),
      provincia,
      provincia_id: provinciaId,
      departamento: parte(item['departamento'], 'nombre'),
      departamento_id: parte(item['departamento'], 'id'),
      municipio: parte(item['municipio'], 'nombre'),
      municipio_id: parte(item['municipio'], 'id'),
      localidad_censal: parte(item['localidad_censal'], 'nombre'),
      localidad_censal_id: parte(item['localidad_censal'], 'id'),
      lat: lat !== null && lat >= -90 && lat <= 90 ? lat : null,
      lng: lng !== null && lng >= -180 && lng <= 180 ? lng : null,
      poblacion_municipio: null,
      fuente: `Georef / ${texto(item['fuente']) ?? 'INDEC'}`,
    };
  });
}

/**
 * Lee el CSV del Censo 2022 por gobierno local (separado por ";", con
 * puntos de miles). Devuelve código de gobierno local -> población.
 * Los valores "." (sin dato) se ignoran.
 */
export function poblacionPorMunicipio(csv: string): Map<string, number> {
  const lineas = csv.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const encabezado = (lineas[0] ?? '').split(';').map((c) => c.trim().toLowerCase());
  const iCodigo = encabezado.indexOf('codgl');
  const iPoblacion = encabezado.indexOf('pob');
  if (iCodigo < 0 || iPoblacion < 0) throw new ErrorDeFuente('CSV del censo sin las columnas CODGL y Pob');

  const resultado = new Map<string, number>();
  for (const linea of lineas.slice(1)) {
    const celdas = linea.split(';');
    const codigo = (celdas[iCodigo] ?? '').trim();
    const valor = (celdas[iPoblacion] ?? '').trim().replace(/\./g, '');
    if (!/^\d+$/.test(codigo) || !/^\d+$/.test(valor)) continue;
    resultado.set(codigo, Number(valor));
  }
  return resultado;
}

/** Agrega la población del municipio a cada fila (null si no tiene municipio o no hay dato). */
export function agregarPoblacion(filas: readonly FilaLocalidadOficial[], poblacion: ReadonlyMap<string, number>): FilaLocalidadOficial[] {
  return filas.map((f) => ({
    ...f,
    poblacion_municipio: f.municipio_id !== null ? (poblacion.get(f.municipio_id) ?? null) : null,
  }));
}

export interface ResumenCarga {
  localidades: number;
  localidadesCensales: number;
  conInvisiblesLimpiados: number;
  conPoblacion: number;
  sinPoblacion: number;
  nuevas: number;
  yaExistian: number;
}

/** Resumen solo con números. existentes: claves "tipo|id_oficial" ya guardadas. */
export function resumirCarga(
  filas: readonly FilaLocalidadOficial[],
  nombresOriginales: readonly string[],
  existentes: ReadonlySet<string>,
): ResumenCarga {
  const yaExistian = filas.filter((f) => existentes.has(claveFila(f))).length;
  const conPoblacion = filas.filter((f) => f.poblacion_municipio !== null).length;
  return {
    localidades: filas.filter((f) => f.tipo === 'localidad').length,
    localidadesCensales: filas.filter((f) => f.tipo === 'localidad_censal').length,
    conInvisiblesLimpiados: nombresOriginales.filter((n) => /\p{Cf}/u.test(n)).length,
    conPoblacion,
    sinPoblacion: filas.length - conPoblacion,
    nuevas: filas.length - yaExistian,
    yaExistian,
  };
}

export const claveFila = (f: { tipo: string; id_oficial: string }): string => `${f.tipo}|${f.id_oficial}`;

/** Nombres tal como vinieron (para contar los que traían invisibles). */
export function nombresOriginales(json: unknown, tipo: TipoLocalidad): string[] {
  if (!esObjeto(json)) return [];
  const lista = json[CLAVE_GEOREF[tipo]];
  if (!Array.isArray(lista)) return [];
  return lista.flatMap((item) => (esObjeto(item) && typeof item['nombre'] === 'string' ? [item['nombre']] : []));
}
