// Lista oficial de localidades en memoria, para validar la localidad de cada
// lead. Se arma una vez por corrida con lo que hay en localidades_oficiales.
//
// Un nombre se acepta si, normalizado (sin tildes, mayúsculas ni signos),
// coincide con alguno de estos nombres oficiales de la misma provincia:
//   - el nombre de la localidad (o localidad censal),
//   - el nombre de su localidad censal,
//   - el nombre de su municipio.
// Se devuelve el nombre oficial ("cordoba" -> "Córdoba").

import type { ListaLocalidades } from '../limpieza/localidad.js';
import { limpiarNombreOficial, normalizarNombre, normalizarProvincia } from './normalizar.js';

export interface LocalidadOficialMinima {
  nombre: string;
  provincia: string;
  municipio: string | null;
  localidad_censal: string | null;
}

export function crearListaLocalidades(filas: readonly LocalidadOficialMinima[]): ListaLocalidades {
  // provincia normalizada -> (nombre normalizado -> nombre oficial)
  const porProvincia = new Map<string, Map<string, string>>();
  const agregar = (provincia: string, nombre: string | null): void => {
    if (nombre === null) return;
    const oficial = limpiarNombreOficial(nombre);
    const clave = normalizarNombre(oficial);
    if (clave === '') return;
    let nombres = porProvincia.get(provincia);
    if (!nombres) {
      nombres = new Map();
      porProvincia.set(provincia, nombres);
    }
    if (!nombres.has(clave)) nombres.set(clave, oficial);
  };

  // Primero los nombres de localidades; después censales y municipios
  // (así, si se repite, gana la forma escrita de la localidad).
  for (const f of filas) agregar(normalizarProvincia(f.provincia), f.nombre);
  for (const f of filas) agregar(normalizarProvincia(f.provincia), f.localidad_censal);
  for (const f of filas) agregar(normalizarProvincia(f.provincia), f.municipio);

  return {
    tieneLista: (provincia) => {
      const clave = normalizarProvincia(provincia);
      return clave !== '' && porProvincia.has(clave);
    },
    oficial: (nombre, provincia) => porProvincia.get(normalizarProvincia(provincia))?.get(normalizarNombre(nombre)) ?? null,
  };
}

/** Lista vacía: ninguna provincia tiene lista (se usa la regla sin lista). */
export const LISTA_VACIA: ListaLocalidades = crearListaLocalidades([]);
