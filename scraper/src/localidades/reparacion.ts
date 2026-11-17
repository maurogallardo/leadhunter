// Reparación de localidades mal guardadas (funciones puras).
//
// Solo se tocan leads con localidad SOSPECHOSA:
//   - empieza con letra y tiene números (ej. X5000AVJ),
//   - son exactamente 3 letras mayúsculas (ej. AAU),
//   - o son solo números (ej. 5000).
// Nunca se tocan localidades cargadas a mano (fuente "manual").
//
// El valor nuevo sale de la misma regla que usa el importador
// (limpieza/localidad.ts, elegirLocalidad) con:
//   - "city" = la localidad sospechosa guardada (así no se usa la parte
//     antes de la provincia: opción 2),
//   - la dirección y la provincia guardadas,
//   - la lista oficial de localidades.
// Si no queda claro, la localidad queda vacía.

import { elegirLocalidad, type ListaLocalidades } from '../limpieza/localidad.js';
import { FUENTE_MANUAL, type Fuentes } from '../limpieza/tipos.js';

/** Fuente que se anota en las localidades reparadas (decisión 9a). */
export const FUENTE_REPARACION = 'reparacion';

export function esLocalidadSospechosa(valor: string | null | undefined): boolean {
  if (typeof valor !== 'string') return false;
  const t = valor.trim();
  return /^[A-Za-z].*\d/.test(t) || /^[A-Z]{3}$/.test(t) || /^\d+$/.test(t);
}

export interface LeadParaReparar {
  id: string;
  localidad: string | null;
  provincia: string | null;
  direccion: string | null;
  fuentes: unknown;
}

export type PlanReparacion =
  | { tipo: 'no_sospechosa' }
  | { tipo: 'manual' }
  | {
      tipo: 'cambiar';
      id: string;
      anterior: string;
      nueva: string | null;
      sinDireccion: boolean;
      provinciaConLista: boolean;
      /** Fuentes tal como estaban (para armar las nuevas). */
      fuentesOriginales: unknown;
    };

/** true si la fuente del campo incluye "manual". */
function esManual(fuentes: unknown, campo: string): boolean {
  if (!fuentes || typeof fuentes !== 'object' || Array.isArray(fuentes)) return false;
  const valor = (fuentes as Record<string, unknown>)[campo];
  if (Array.isArray(valor)) return valor.includes(FUENTE_MANUAL);
  return valor === FUENTE_MANUAL;
}

export function planificarReparacion(lead: LeadParaReparar, lista: ListaLocalidades): PlanReparacion {
  if (!esLocalidadSospechosa(lead.localidad) || lead.localidad === null) return { tipo: 'no_sospechosa' };
  if (esManual(lead.fuentes, 'localidad')) return { tipo: 'manual' };
  const sinDireccion = typeof lead.direccion !== 'string' || lead.direccion.trim() === '';
  const nueva = elegirLocalidad({ city: lead.localidad, direccion: lead.direccion, provincia: lead.provincia }, lista);
  return {
    tipo: 'cambiar',
    id: lead.id,
    anterior: lead.localidad,
    nueva,
    sinDireccion,
    provinciaConLista: lista.tieneLista(lead.provincia),
    fuentesOriginales: lead.fuentes,
  };
}

/** Fuentes después de reparar: "reparacion" si quedó un nombre; sin la clave si quedó vacía. */
export function fuentesReparadas(fuentes: unknown, nueva: string | null): Fuentes {
  const base: Fuentes =
    fuentes && typeof fuentes === 'object' && !Array.isArray(fuentes) ? { ...(fuentes as Fuentes) } : {};
  if (nueva === null) delete base['localidad'];
  else base['localidad'] = [FUENTE_REPARACION];
  return base;
}

export interface ResumenReparacion {
  revisados: number;
  sospechosas: number;
  salteadasManual: number;
  conNombre: number;
  conNombreSinLista: number;
  quedanVacias: number;
  sinDireccion: number;
}

export function resumirReparacion(planes: readonly PlanReparacion[]): ResumenReparacion {
  const cambiar = planes.filter((p): p is Extract<PlanReparacion, { tipo: 'cambiar' }> => p.tipo === 'cambiar');
  const salteadasManual = planes.filter((p) => p.tipo === 'manual').length;
  return {
    revisados: planes.length,
    sospechosas: cambiar.length + salteadasManual,
    salteadasManual,
    conNombre: cambiar.filter((p) => p.nueva !== null).length,
    conNombreSinLista: cambiar.filter((p) => p.nueva !== null && !p.provinciaConLista).length,
    quedanVacias: cambiar.filter((p) => p.nueva === null).length,
    sinDireccion: cambiar.filter((p) => p.sinDireccion).length,
  };
}
