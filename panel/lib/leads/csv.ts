// Armado del CSV de leads para abrir en Excel (configuración de Argentina).
// - Codificación UTF-8 con BOM al principio: Excel así reconoce las tildes.
// - Separador punto y coma (;): es el que usa Excel con configuración
//   regional de Argentina (la coma es el separador decimal).
// - Saltos de línea \r\n.
// - Teléfonos forzados como texto: ="+5493511234567" (si no, Excel los
//   convierte en número y pierde el +).
// - Celdas de texto que empiezan con = + - @ llevan un apóstrofo adelante
//   para que Excel no las tome como fórmula.

import { numeroWhatsapp } from './contacto';
import type { LeadPanel } from './tipos';

export const BOM = '﻿';
export const SEPARADOR = ';';
export const FIN_DE_LINEA = '\r\n';

/** Pone comillas si hace falta y duplica las comillas internas. */
function comillas(valor: string): string {
  return /[;"\r\n,]/.test(valor) || valor !== valor.trim() ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/** Celda de texto. */
export function celdaTexto(valor: string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '';
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return comillas(seguro);
}

/** Celda de teléfono: forzada como texto si es un número internacional limpio. */
export function celdaTelefono(valor: string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '';
  if (/^\+\d{6,15}$/.test(valor)) return comillas(`="${valor}"`);
  return celdaTexto(valor);
}

/** Celda numérica con coma decimal (4.5 -> "4,5"). */
export function celdaNumero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '';
  return String(valor).replace('.', ',');
}

/** Fecha AAAA-MM-DD en hora de Argentina. */
export function celdaFecha(iso: string | null | undefined): string {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
}

const COLUMNAS: readonly { titulo: string; valor: (l: LeadPanel) => string }[] = [
  { titulo: 'Nombre', valor: (l) => celdaTexto(l.nombre) },
  { titulo: 'Persona de contacto', valor: (l) => celdaTexto(l.persona_contacto) },
  { titulo: 'Rubro', valor: (l) => celdaTexto(l.rubro) },
  { titulo: 'Dirección', valor: (l) => celdaTexto(l.direccion) },
  { titulo: 'Localidad', valor: (l) => celdaTexto(l.localidad) },
  { titulo: 'Provincia', valor: (l) => celdaTexto(l.provincia) },
  { titulo: 'Teléfono fijo', valor: (l) => celdaTelefono(l.telefono_fijo) },
  { titulo: 'Celular', valor: (l) => celdaTelefono(l.celular) },
  { titulo: 'Teléfono sin clasificar', valor: (l) => celdaTelefono(l.telefono_sin_clasificar) },
  { titulo: 'WhatsApp', valor: (l) => celdaTelefono(numeroWhatsapp(l.whatsapp) ?? l.whatsapp) },
  { titulo: 'Mail', valor: (l) => celdaTexto(l.email) },
  { titulo: 'Instagram', valor: (l) => celdaTexto(l.instagram) },
  { titulo: 'Sitio web', valor: (l) => celdaTexto(l.sitio_web) },
  { titulo: 'Rating', valor: (l) => celdaNumero(l.rating) },
  { titulo: 'Reseñas', valor: (l) => celdaNumero(l.resenas) },
  { titulo: 'Descartado', valor: (l) => (l.descartado ? 'Sí' : 'No') },
  { titulo: 'Fecha de carga', valor: (l) => celdaFecha(l.creado_en) },
];

/** Línea de títulos (sin BOM). */
export const encabezadoCsv = (): string => COLUMNAS.map((c) => celdaTexto(c.titulo)).join(SEPARADOR) + FIN_DE_LINEA;

/** Líneas de una tanda de leads (sin BOM ni títulos). */
export const filasCsv = (leads: readonly LeadPanel[]): string =>
  leads.map((l) => COLUMNAS.map((c) => c.valor(l)).join(SEPARADOR) + FIN_DE_LINEA).join('');

/** CSV completo: BOM + títulos + filas. */
export const armarCsv = (leads: readonly LeadPanel[]): string => BOM + encabezadoCsv() + filasCsv(leads);

/** Nombre del archivo: leads-AAAA-MM-DD.csv (fecha de Argentina). */
export const nombreArchivoCsv = (ahora: Date): string => `leads-${celdaFecha(ahora.toISOString())}.csv`;
