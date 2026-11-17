// Acceso a public.localidades_oficiales (migración 0005) con la clave
// secreta del servidor. Sin lógica: solo consultas. No imprime nada.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ListaLocalidades } from '../limpieza/localidad.js';
import { crearListaLocalidades } from './lista.js';
import { claveFila, type FilaLocalidadOficial } from './oficiales.js';

const TABLA = 'localidades_oficiales';
const TAMANO_PAGINA = 1000;
const TAMANO_TANDA = 500;

async function leerTodo(db: SupabaseClient, columnas: string): Promise<Record<string, unknown>[]> {
  const todas: Record<string, unknown>[] = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await db
      .from(TABLA)
      .select(columnas)
      .order('tipo')
      .order('id_oficial')
      .range(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw error;
    const filas = (data ?? []) as unknown as Record<string, unknown>[];
    todas.push(...filas);
    if (filas.length < TAMANO_PAGINA) return todas;
  }
}

/** Claves "tipo|id_oficial" ya guardadas. */
export async function leerClavesExistentes(db: SupabaseClient): Promise<Set<string>> {
  const filas = await leerTodo(db, 'tipo, id_oficial');
  return new Set(filas.map((f) => claveFila({ tipo: String(f['tipo']), id_oficial: String(f['id_oficial']) })));
}

/** Guarda (inserta o actualiza) las filas en tandas. Devuelve cuántas guardó. */
export async function guardarLocalidades(db: SupabaseClient, filas: readonly FilaLocalidadOficial[]): Promise<number> {
  const ahora = new Date().toISOString();
  let guardadas = 0;
  for (let i = 0; i < filas.length; i += TAMANO_TANDA) {
    const tanda = filas.slice(i, i + TAMANO_TANDA).map((f) => ({ ...f, cargada_en: ahora }));
    const { error } = await db.from(TABLA).upsert(tanda, { onConflict: 'tipo,id_oficial' });
    if (error) throw error;
    guardadas += tanda.length;
  }
  return guardadas;
}

/** Lo que hace falta para validar localidades. */
export interface LocalidadParaValidar {
  nombre: string;
  provincia: string;
  municipio: string | null;
  localidad_censal: string | null;
}

export async function leerLocalidadesParaValidar(db: SupabaseClient): Promise<LocalidadParaValidar[]> {
  const filas = await leerTodo(db, 'tipo, id_oficial, nombre, provincia, municipio, localidad_censal');
  return filas.flatMap((f) =>
    typeof f['nombre'] === 'string' && typeof f['provincia'] === 'string'
      ? [
          {
            nombre: f['nombre'],
            provincia: f['provincia'],
            municipio: typeof f['municipio'] === 'string' ? f['municipio'] : null,
            localidad_censal: typeof f['localidad_censal'] === 'string' ? f['localidad_censal'] : null,
          },
        ]
      : [],
  );
}

/** Lista oficial lista para validar (vacía si la tabla no tiene filas). */
export async function leerListaLocalidades(db: SupabaseClient): Promise<ListaLocalidades> {
  return crearListaLocalidades(await leerLocalidadesParaValidar(db));
}
