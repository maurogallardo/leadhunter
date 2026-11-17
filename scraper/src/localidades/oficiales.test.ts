// Pruebas de la lectura de la lista oficial. Datos con la FORMA de Georef y
// del censo, pero con nombres y números inventados.
import { describe, expect, it } from 'vitest';
import { leerConfiguracionLocalidades } from './modo.js';
import { limpiarNombreOficial, normalizarNombre, normalizarProvincia } from './normalizar.js';
import { agregarPoblacion, claveFila, filasDesdeGeoref, nombresOriginales, poblacionPorMunicipio, resumirCarga } from './oficiales.js';

const PROVINCIA = { id: '99', nombre: 'Provincia Inventada' };

const localidad = (id: string, nombre: string, extra: Record<string, unknown> = {}) => ({
  categoria: 'Localidad simple',
  centroide: { lat: -31.5, lon: -64.2 },
  departamento: { id: '99001', nombre: 'Departamento Inventado' },
  fuente: 'INDEC',
  id,
  localidad_censal: { id: `${id}0`, nombre },
  municipio: { id: '990001', nombre: 'Municipio Inventado' },
  nombre,
  provincia: PROVINCIA,
  ...extra,
});

const respuesta = (clave: string, lista: unknown[], total = lista.length) => ({ cantidad: lista.length, inicio: 0, total, [clave]: lista });

describe('normalizarNombre', () => {
  it('saca tildes, mayúsculas, ñ y signos', () => {
    expect(normalizarNombre('Guiñazú')).toBe('guinazu');
    expect(normalizarNombre('GUIÑAZU')).toBe('guinazu');
    expect(normalizarNombre('  Villa   Inventada (1° Sección) ')).toBe('villa inventada 1 seccion');
  });

  it('saca caracteres invisibles sin partir la palabra', () => {
    expect(normalizarNombre('Rí­o Inventado')).toBe('rio inventado');
    expect(limpiarNombreOficial('Rí­o  Inventado ')).toBe('Río Inventado');
  });

  it('provincia: ignora "Provincia de" y "Province"', () => {
    expect(normalizarProvincia('Provincia de Córdoba')).toBe('cordoba');
    expect(normalizarProvincia('Cordoba Province')).toBe('cordoba');
    expect(normalizarProvincia(null)).toBe('');
  });
});

describe('filasDesdeGeoref', () => {
  it('convierte una localidad con todos sus campos', () => {
    const [fila] = filasDesdeGeoref(respuesta('localidades', [localidad('9900101', 'Villa Inventada')]), 'localidad');
    expect(fila).toEqual({
      tipo: 'localidad',
      id_oficial: '9900101',
      nombre: 'Villa Inventada',
      nombre_normalizado: 'villa inventada',
      categoria: 'Localidad simple',
      provincia: 'Provincia Inventada',
      provincia_id: '99',
      departamento: 'Departamento Inventado',
      departamento_id: '99001',
      municipio: 'Municipio Inventado',
      municipio_id: '990001',
      localidad_censal: 'Villa Inventada',
      localidad_censal_id: '99001010',
      lat: -31.5,
      lng: -64.2,
      poblacion_municipio: null,
      fuente: 'Georef / INDEC',
    });
  });

  it('localidad censal sin municipio ni localidad censal; limpia invisibles en el nombre', () => {
    const [fila] = filasDesdeGeoref(
      respuesta('localidades_censales', [localidad('99002010', 'Rí­o Inventado', { municipio: null, localidad_censal: undefined })]),
      'localidad_censal',
    );
    expect(fila?.nombre).toBe('Río Inventado');
    expect(fila?.nombre_normalizado).toBe('rio inventado');
    expect(fila?.municipio).toBeNull();
    expect(fila?.municipio_id).toBeNull();
    expect(fila?.localidad_censal).toBeNull();
  });

  it('coordenadas fuera de rango quedan vacías', () => {
    const [fila] = filasDesdeGeoref(respuesta('localidades', [localidad('1', 'X', { centroide: { lat: 200, lon: 'no' } })]), 'localidad');
    expect(fila?.lat).toBeNull();
    expect(fila?.lng).toBeNull();
  });

  it('respuesta incompleta, sin lista o con registros rotos -> error', () => {
    expect(() => filasDesdeGeoref(respuesta('localidades', [localidad('1', 'X')], 2), 'localidad')).toThrow(/incompleta/);
    expect(() => filasDesdeGeoref({ total: 0 }, 'localidad')).toThrow(/lista/);
    expect(() => filasDesdeGeoref('texto', 'localidad')).toThrow();
    expect(() => filasDesdeGeoref(respuesta('localidades', [localidad('1', '')]), 'localidad')).toThrow(/id, nombre/);
    expect(() => filasDesdeGeoref(respuesta('localidades', [localidad('1', 'X', { provincia: null })]), 'localidad')).toThrow();
  });

  it('nombresOriginales devuelve los nombres sin tocar', () => {
    const json = respuesta('localidades', [localidad('1', 'Rí­o Inventado')]);
    expect(nombresOriginales(json, 'localidad')).toEqual(['Rí­o Inventado']);
    expect(nombresOriginales(null, 'localidad')).toEqual([]);
  });
});

describe('poblacionPorMunicipio y agregarPoblacion', () => {
  const csv = '﻿CODGL;Viv;Pob;Viv_par\r\n990001;1.000;12.345;990\r\n990002;10;.;10\r\nabc;1;2;3\r\n';

  it('lee código y población con puntos de miles; ignora sin dato', () => {
    const mapa = poblacionPorMunicipio(csv);
    expect(mapa.get('990001')).toBe(12345);
    expect(mapa.has('990002')).toBe(false);
    expect(mapa.size).toBe(1);
  });

  it('CSV sin las columnas esperadas -> error', () => {
    expect(() => poblacionPorMunicipio('A;B\n1;2')).toThrow(/CODGL/);
  });

  it('agrega la población del municipio; sin municipio queda vacía', () => {
    const filas = filasDesdeGeoref(
      respuesta('localidades', [localidad('1', 'Con Municipio'), localidad('2', 'Sin Municipio', { municipio: null })]),
      'localidad',
    );
    const [con, sin] = agregarPoblacion(filas, poblacionPorMunicipio(csv));
    expect(con?.poblacion_municipio).toBe(12345);
    expect(sin?.poblacion_municipio).toBeNull();
  });
});

describe('resumirCarga', () => {
  it('cuenta por tipo, población, invisibles, nuevas y existentes', () => {
    const loc = filasDesdeGeoref(respuesta('localidades', [localidad('1', 'Uno'), localidad('2', 'Dos')]), 'localidad');
    const cen = filasDesdeGeoref(respuesta('localidades_censales', [localidad('3', 'Tres', { municipio: null })]), 'localidad_censal');
    const filas = agregarPoblacion([...loc, ...cen], new Map([['990001', 100]]));
    const resumen = resumirCarga(filas, ['Uno', 'D­os', 'Tres'], new Set([claveFila({ tipo: 'localidad', id_oficial: '1' })]));
    expect(resumen).toEqual({
      localidades: 2,
      localidadesCensales: 1,
      conInvisiblesLimpiados: 1,
      conPoblacion: 2,
      sinPoblacion: 1,
      nuevas: 2,
      yaExistian: 1,
    });
  });
});

describe('leerConfiguracionLocalidades', () => {
  const base = { SUPABASE_URL: 'https://proyecto-ficticio.invalid', SUPABASE_SECRET_KEY: 'clave-ficticia' };

  it('acepta vista_previa y aplicar', () => {
    for (const MODO of ['vista_previa', 'aplicar'] as const) {
      const r = leerConfiguracionLocalidades({ ...base, MODO });
      expect(r.ok && r.config.modo).toBe(MODO);
    }
  });

  it('modo inválido o faltante -> error que no muestra valores', () => {
    const r = leerConfiguracionLocalidades({ ...base, MODO: 'borrar' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errores.join(' ')).not.toContain('borrar');
    expect(leerConfiguracionLocalidades({ ...base }).ok).toBe(false);
    const sinClave = leerConfiguracionLocalidades({ MODO: 'aplicar' });
    expect(sinClave.ok).toBe(false);
  });
});
