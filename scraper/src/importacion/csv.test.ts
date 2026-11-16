// Pruebas de lectura del CSV. Contenido INVENTADO.
import { describe, expect, it } from 'vitest';
import { leerFilasCsv } from './csv.js';
import { mapearFilaGosom } from '../limpieza/gosom.js';

describe('leerFilasCsv', () => {
  it('vacío -> sin filas', () => {
    expect(leerFilasCsv('')).toEqual([]);
    expect(leerFilasCsv('   \n')).toEqual([]);
  });

  it('solo encabezados -> sin filas', () => {
    expect(leerFilasCsv('title,phone\n')).toEqual([]);
  });

  it('campos con comas, comillas, saltos de línea y JSON', () => {
    const csv = [
      'title,address,phone,complete_address',
      '"Almacén Prueba, Sucursal 1","Calle Falsa 123, X5000 Córdoba",0351 555-0123,"{""city"":""Córdoba"",""state"":""Córdoba"",""country"":""AR""}"',
      '"Kiosco ""Inventado""","Línea 1',
      'Línea 2",,',
    ].join('\n');

    const filas = leerFilasCsv(csv);

    expect(filas).toHaveLength(2);
    expect(filas[0]?.['title']).toBe('Almacén Prueba, Sucursal 1');
    expect(filas[1]?.['title']).toBe('Kiosco "Inventado"');
    expect(filas[1]?.['address']).toBe('Línea 1\nLínea 2');

    const lead = mapearFilaGosom(filas[0] ?? {});
    expect(lead?.telefono_fijo).toBe('+543515550123');
    expect(lead?.localidad).toBe('Córdoba');
  });

  it('acepta BOM al inicio y filas con columnas de menos', () => {
    const filas = leerFilasCsv('﻿title,phone,website\nNegocio Ficticio,0351 555-0123\n');
    expect(filas).toHaveLength(1);
    expect(filas[0]?.['title']).toBe('Negocio Ficticio');
  });
});
