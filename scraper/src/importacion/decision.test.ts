// Pruebas de la lógica de decisión del importador. Todos los datos son INVENTADOS.
import { describe, expect, it } from 'vitest';
import type { Lead } from '../limpieza/tipos.js';
import {
  cajaAlrededor,
  codigoDeErrorSeguro,
  contadoresIniciales,
  contarDecision,
  decidir,
  detalleTecnico,
  elegirCoincidencia,
  estadoDeCorrida,
  filaALead,
  hayBloqueo,
  leadAFila,
  leadAFilaActualizacion,
  lineasDeResumen,
  MOTIVO_SIN_CONTACTO,
  telefonosDeLead,
} from './decision.js';
import { distanciaMetros } from '../limpieza/ubicacion.js';

const BASE = { lat: -31.4, lng: -64.18 };

function lead(datos: Partial<Lead>): Lead {
  return { nombre: 'Negocio Ficticio', fuentes: { nombre: ['gosom'] }, ...datos };
}

describe('elegirCoincidencia', () => {
  it('sin candidatos -> null', () => {
    expect(elegirCoincidencia(lead({ celular: '+5493515550123' }), [])).toBeNull();
  });

  it('prioriza el candidato con el mismo google_place_id', () => {
    const nuevo = lead({ google_place_id: 'ChIJ_FICTICIO_001', celular: '+5493515550123' });
    const porTelefono = lead({ id: 'id-tel', celular: '+5493515550123' });
    const porPlace = lead({ id: 'id-place', google_place_id: 'ChIJ_FICTICIO_001' });
    expect(elegirCoincidencia(nuevo, [porTelefono, porPlace])?.id).toBe('id-place');
  });

  it('ignora candidatos sin id', () => {
    const nuevo = lead({ celular: '+5493515550123' });
    expect(elegirCoincidencia(nuevo, [lead({ celular: '+5493515550123' })])).toBeNull();
  });

  it('ignora candidatos que no son el mismo negocio', () => {
    const nuevo = lead({ nombre: 'Kiosco El Sol', ...BASE });
    const vecino = lead({ id: 'id-1', nombre: 'Kiosco La Luna', lat: -31.40009, lng: -64.18 });
    expect(elegirCoincidencia(nuevo, [vecino])).toBeNull();
  });
});

describe('decidir: leads nuevos', () => {
  it('con contacto -> insertar, no descartado', () => {
    const d = decidir(lead({ celular: '+5493515550123' }), []);
    expect(d.accion).toBe('insertar');
    if (d.accion !== 'insertar') return;
    expect(d.descartado).toBe(false);
    expect(d.lead.descartado).toBe(false);
    expect(d.lead.motivo_descarte).toBeNull();
  });

  it('sin contacto (solo sitio web) -> insertar descartado con motivo', () => {
    const d = decidir(lead({ sitio_web: 'https://ficticia.test' }), []);
    expect(d.accion).toBe('insertar');
    if (d.accion !== 'insertar') return;
    expect(d.descartado).toBe(true);
    expect(d.lead.descartado).toBe(true);
    expect(d.lead.motivo_descarte).toBe(MOTIVO_SIN_CONTACTO);
    expect(d.lead.sitio_web).toBe('https://ficticia.test');
  });
});

describe('decidir: unir con existentes', () => {
  it('mismo place_id -> unir con el id existente, completando datos', () => {
    const existente = lead({ id: 'id-1', google_place_id: 'ChIJ_FICTICIO_001', celular: '+5493515550123' });
    const nuevo = lead({ google_place_id: 'ChIJ_FICTICIO_001', email: 'ventas@ficticia.test', fuentes: { email: ['gosom'] } });
    const d = decidir(nuevo, [existente]);
    expect(d.accion).toBe('unir');
    if (d.accion !== 'unir') return;
    expect(d.id).toBe('id-1');
    expect(d.lead.celular).toBe('+5493515550123');
    expect(d.lead.email).toBe('ventas@ficticia.test');
    expect(d.reactivado).toBe(false);
  });

  it('respeta notas y descarte manual', () => {
    const existente = lead({
      id: 'id-1',
      celular: '+5493515550123',
      notas: 'Nota de Mauro',
      descartado: true,
      motivo_descarte: 'No le interesa',
    });
    const d = decidir(lead({ celular: '+5493515550123', email: 'ventas@ficticia.test' }), [existente]);
    if (d.accion !== 'unir') throw new Error('se esperaba unir');
    expect(d.lead.notas).toBe('Nota de Mauro');
    expect(d.lead.descartado).toBe(true);
    expect(d.lead.motivo_descarte).toBe('No le interesa');
    expect(d.reactivado).toBe(false);
  });

  it('existente descartado por sin contacto que ahora recibe contacto -> se reactiva', () => {
    const existente = lead({
      id: 'id-1',
      google_place_id: 'ChIJ_FICTICIO_001',
      sitio_web: 'https://ficticia.test',
      descartado: true,
      motivo_descarte: MOTIVO_SIN_CONTACTO,
    });
    const nuevo = lead({ google_place_id: 'ChIJ_FICTICIO_001', telefono_fijo: '+543515550123' });
    const d = decidir(nuevo, [existente]);
    if (d.accion !== 'unir') throw new Error('se esperaba unir');
    expect(d.reactivado).toBe(true);
    expect(d.lead.descartado).toBe(false);
    expect(d.lead.motivo_descarte).toBeNull();
    expect(d.lead.telefono_fijo).toBe('+543515550123');
  });

  it('existente descartado por sin contacto que sigue sin contacto -> sigue descartado', () => {
    const existente = lead({
      id: 'id-1',
      google_place_id: 'ChIJ_FICTICIO_001',
      descartado: true,
      motivo_descarte: MOTIVO_SIN_CONTACTO,
    });
    const d = decidir(lead({ google_place_id: 'ChIJ_FICTICIO_001', sitio_web: 'https://ficticia.test' }), [existente]);
    if (d.accion !== 'unir') throw new Error('se esperaba unir');
    expect(d.reactivado).toBe(false);
    expect(d.lead.descartado).toBe(true);
    expect(d.lead.motivo_descarte).toBe(MOTIVO_SIN_CONTACTO);
  });

  it('existente activo sin contacto (cargado a mano) no se descarta', () => {
    const existente = lead({ id: 'id-1', google_place_id: 'ChIJ_FICTICIO_001', descartado: false });
    const d = decidir(lead({ google_place_id: 'ChIJ_FICTICIO_001' }), [existente]);
    if (d.accion !== 'unir') throw new Error('se esperaba unir');
    expect(d.lead.descartado).toBe(false);
  });

  it('segunda corrida con el mismo dato -> unir, no insertar', () => {
    const primeraVez = decidir(lead({ google_place_id: 'ChIJ_FICTICIO_001', celular: '+5493515550123' }), []);
    expect(primeraVez.accion).toBe('insertar');
    const guardado = { ...primeraVez.lead, id: 'id-1' };
    const segundaVez = decidir(lead({ google_place_id: 'ChIJ_FICTICIO_001', celular: '+5493515550123' }), [guardado]);
    expect(segundaVez.accion).toBe('unir');
  });
});

describe('contadores', () => {
  it('suma nuevos, descartados, unidos y reactivados', () => {
    let c = contadoresIniciales();
    c = contarDecision(c, { accion: 'insertar', lead: lead({}), descartado: false });
    c = contarDecision(c, { accion: 'insertar', lead: lead({}), descartado: true });
    c = contarDecision(c, { accion: 'unir', id: 'a', lead: lead({}), reactivado: false });
    c = contarDecision(c, { accion: 'unir', id: 'b', lead: lead({}), reactivado: true });
    expect(c).toEqual({
      filasLeidas: 0,
      filasSinNombre: 0,
      nuevos: 2,
      nuevosDescartadosSinContacto: 1,
      unidos: 2,
      reactivados: 1,
      errores: 0,
    });
  });

  it('no modifica el objeto original', () => {
    const c = contadoresIniciales();
    contarDecision(c, { accion: 'insertar', lead: lead({}), descartado: false });
    expect(c.nuevos).toBe(0);
  });
});

describe('bloqueo y estado de la corrida', () => {
  it('hayBloqueo: palabras o cero filas', () => {
    expect(hayBloqueo(0, 10)).toBe(false);
    expect(hayBloqueo(2, 10)).toBe(true);
    expect(hayBloqueo(0, 0)).toBe(true);
  });

  const base = { fatal: false, errores: 0, bloqueo: false, codigoGosom: 0, filasLeidas: 10 };

  it.each([
    [{ ...base }, 'ok'],
    [{ ...base, bloqueo: true }, 'frenada_por_bloqueo'],
    [{ ...base, fatal: true }, 'error'],
    [{ ...base, errores: 1 }, 'error'],
    [{ ...base, errores: 1, bloqueo: true }, 'error'],
    [{ ...base, codigoGosom: 1, filasLeidas: 0, bloqueo: true }, 'error'],
    [{ ...base, codigoGosom: 1, filasLeidas: 5 }, 'ok'],
    [{ ...base, codigoGosom: null }, 'ok'],
  ] as const)('%j -> %s', (datos, esperado) => {
    expect(estadoDeCorrida(datos)).toBe(esperado);
  });
});

describe('textos sin datos de negocios', () => {
  it('detalleTecnico: solo números y códigos', () => {
    const c = { ...contadoresIniciales(), filasLeidas: 3, nuevos: 2, unidos: 1 };
    const texto = detalleTecnico(c, { codigoGosom: 0, palabrasDeBloqueo: 0, codigoError: '23505' });
    expect(texto).toBe(
      'filas=3 sin_nombre=0 nuevos=2 descartados_sin_contacto=0 unidos=1 reactivados=0 errores=0 codigo_gosom=0 palabras_bloqueo=0 error=23505',
    );
  });

  it('lineasDeResumen: incluye estado y bloqueo, solo números', () => {
    const lineas = lineasDeResumen({ ...contadoresIniciales(), filasLeidas: 4, nuevos: 3 }, 'ok', false);
    expect(lineas).toContain('Filas leidas: 4');
    expect(lineas).toContain('Leads nuevos: 3');
    expect(lineas).toContain('Bloqueo: no');
    expect(lineas).toContain('Estado de la corrida: ok');
  });

  it('codigoDeErrorSeguro: nunca devuelve el mensaje', () => {
    const errorPostgres = {
      code: '23505',
      message: 'duplicate key value violates unique constraint',
      details: 'Key (google_place_id)=(ChIJ_FICTICIO_001) already exists.',
    };
    expect(codigoDeErrorSeguro(errorPostgres)).toBe('23505');
    expect(codigoDeErrorSeguro(new TypeError('Kiosco Ficticio +5493515550123'))).toBe('TypeError');
    expect(codigoDeErrorSeguro({ code: 'texto con espacios y datos', name: 'Kiosco Ficticio 123' })).toBe('desconocido');
    expect(codigoDeErrorSeguro('Kiosco Ficticio')).toBe('desconocido');
    expect(codigoDeErrorSeguro(null)).toBe('desconocido');
  });
});

describe('búsqueda de candidatos', () => {
  it('cajaAlrededor cubre ±100 m en latitud y longitud', () => {
    const caja = cajaAlrededor(BASE.lat, BASE.lng, 100);
    expect(distanciaMetros(BASE, { lat: caja.latMax, lng: BASE.lng })).toBeCloseTo(100, 0);
    expect(distanciaMetros(BASE, { lat: BASE.lat, lng: caja.lngMax })).toBeCloseTo(100, 0);
    expect(caja.latMin).toBeLessThan(caja.latMax);
    expect(caja.lngMin).toBeLessThan(caja.lngMax);
  });

  it('telefonosDeLead: los tres tipos, sin repetir ni vacíos', () => {
    expect(
      telefonosDeLead(
        lead({ celular: '+5493515550123', telefono_fijo: '+543515550124', telefono_sin_clasificar: '+543515550124' }),
      ),
    ).toEqual(['+5493515550123', '+543515550124']);
    expect(telefonosDeLead(lead({ celular: '', telefono_fijo: null }))).toEqual([]);
  });
});

describe('conversión de filas de la base', () => {
  it('filaALead: numeric como texto pasa a número; jsonb raro -> {}', () => {
    const l = filaALead({
      id: 'id-1',
      nombre: 'Negocio Ficticio',
      lat: '-31.4',
      lng: -64.18,
      rating: '4.5',
      resenas: 12,
      fuentes: 'no es un objeto',
      descartado: true,
      celular: null,
    });
    expect(l).toMatchObject({ id: 'id-1', lat: -31.4, lng: -64.18, rating: 4.5, resenas: 12, fuentes: {}, descartado: true, celular: null });
  });

  it('leadAFila: sin id y sin campos indefinidos', () => {
    const fila = leadAFila(lead({ id: 'id-1', celular: '+5493515550123' }));
    expect(fila).not.toHaveProperty('id');
    expect(fila).not.toHaveProperty('email');
    expect(fila['celular']).toBe('+5493515550123');
  });

  it('leadAFilaActualizacion: nunca manda notas ni descarte, salvo reactivación', () => {
    const l = lead({ notas: 'Nota de Mauro', descartado: true, motivo_descarte: 'No le interesa', celular: '+5493515550123' });
    const normal = leadAFilaActualizacion(l, false);
    expect(normal).not.toHaveProperty('notas');
    expect(normal).not.toHaveProperty('descartado');
    expect(normal).not.toHaveProperty('motivo_descarte');

    const reactivado = leadAFilaActualizacion(l, true);
    expect(reactivado).not.toHaveProperty('notas');
    expect(reactivado['descartado']).toBe(false);
    expect(reactivado['motivo_descarte']).toBeNull();
  });
});
