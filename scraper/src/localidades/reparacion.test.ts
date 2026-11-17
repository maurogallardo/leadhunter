// Pruebas de la reparación de localidades. Leads y direcciones INVENTADOS.
import { describe, expect, it } from 'vitest';
import { crearListaLocalidades } from './lista.js';
import {
  esLocalidadSospechosa,
  FUENTE_REPARACION,
  fuentesReparadas,
  planificarReparacion,
  resumirReparacion,
  type LeadParaReparar,
} from './reparacion.js';

const lista = crearListaLocalidades([
  { nombre: 'Córdoba', provincia: 'Córdoba', municipio: 'Córdoba', localidad_censal: 'Córdoba' },
  { nombre: 'Villa Allende', provincia: 'Córdoba', municipio: 'Villa Allende', localidad_censal: 'Villa Allende' },
]);

const lead = (cambios: Partial<LeadParaReparar>): LeadParaReparar => ({
  id: 'id-inventado',
  localidad: 'X5000AVJ',
  provincia: 'Córdoba',
  direccion: 'Calle Falsa 123, X5000AVJ Córdoba, Córdoba',
  fuentes: { localidad: ['gosom'], nombre: ['gosom'] },
  ...cambios,
});

describe('esLocalidadSospechosa', () => {
  it('marca códigos postales, pedazos de 3 mayúsculas y números', () => {
    for (const v of ['X5000AVJ', 'x5001cda', 'X5000', 'X5000AVJ Córdoba', 'AAU', 'FDC', '5000', ' KQD ']) {
      expect(esLocalidadSospechosa(v)).toBe(true);
    }
  });

  it('no marca nombres', () => {
    for (const v of ['Córdoba', 'Villa Allende', 'Guiñazu', 'Ica', '25 de Mayo', 'Nono', '', null, undefined]) {
      expect(esLocalidadSospechosa(v)).toBe(false);
    }
  });
});

describe('planificarReparacion', () => {
  it('no sospechosa: no se toca', () => {
    expect(planificarReparacion(lead({ localidad: 'Córdoba' }), lista)).toEqual({ tipo: 'no_sospechosa' });
    expect(planificarReparacion(lead({ localidad: null }), lista)).toEqual({ tipo: 'no_sospechosa' });
  });

  it('cargada a mano: se saltea siempre', () => {
    expect(planificarReparacion(lead({ fuentes: { localidad: ['manual'] } }), lista)).toEqual({ tipo: 'manual' });
    expect(planificarReparacion(lead({ fuentes: { localidad: ['gosom', 'manual'] } }), lista)).toEqual({ tipo: 'manual' });
  });

  it('CPA con dirección que tiene la localidad: pasa al nombre oficial', () => {
    const plan = planificarReparacion(lead({}), lista);
    expect(plan).toMatchObject({ tipo: 'cambiar', anterior: 'X5000AVJ', nueva: 'Córdoba', sinDireccion: false, provinciaConLista: true });
  });

  it('pedazo AAU con código en la dirección: pasa al nombre oficial', () => {
    const plan = planificarReparacion(lead({ localidad: 'AAU', direccion: 'Calle Falsa 123, X5105 Villa Allende' }), lista);
    expect(plan).toMatchObject({ tipo: 'cambiar', nueva: 'Villa Allende' });
  });

  it('dirección sin código: queda vacía (no usa la parte antes de la provincia)', () => {
    const plan = planificarReparacion(lead({ localidad: 'FDC', direccion: 'Calle Falsa 123, Villa Allende, Córdoba' }), lista);
    expect(plan).toMatchObject({ tipo: 'cambiar', nueva: null, sinDireccion: false });
  });

  it('sin dirección: queda vacía y se cuenta', () => {
    const plan = planificarReparacion(lead({ localidad: 'KQD', direccion: null }), lista);
    expect(plan).toMatchObject({ tipo: 'cambiar', nueva: null, sinDireccion: true });
  });

  it('localidad de la dirección que no está en la lista: vacía', () => {
    const plan = planificarReparacion(lead({ direccion: 'Calle Falsa 123, X5000 Barrio Inventado' }), lista);
    expect(plan).toMatchObject({ tipo: 'cambiar', nueva: null });
  });

  it('provincia sin lista: regla de antes', () => {
    const plan = planificarReparacion(lead({ provincia: 'Santa Fe', localidad: 'S2000AAA', direccion: 'Calle Falsa 123, S2000 Ciudad Inventada' }), lista);
    expect(plan).toMatchObject({ tipo: 'cambiar', nueva: 'Ciudad Inventada', provinciaConLista: false });
  });
});

describe('fuentesReparadas', () => {
  it('con nombre: la localidad queda con fuente "reparacion"; el resto igual', () => {
    expect(fuentesReparadas({ localidad: ['gosom'], nombre: ['gosom'] }, 'Córdoba')).toEqual({
      localidad: [FUENTE_REPARACION],
      nombre: ['gosom'],
    });
  });

  it('vacía: se saca la clave localidad', () => {
    expect(fuentesReparadas({ localidad: ['gosom'], nombre: ['gosom'] }, null)).toEqual({ nombre: ['gosom'] });
  });

  it('fuentes rotas o vacías', () => {
    expect(fuentesReparadas(null, 'Córdoba')).toEqual({ localidad: [FUENTE_REPARACION] });
    expect(fuentesReparadas([], null)).toEqual({});
  });

  it('no modifica el objeto original', () => {
    const original = { localidad: ['gosom'] };
    fuentesReparadas(original, null);
    expect(original).toEqual({ localidad: ['gosom'] });
  });
});

describe('resumirReparacion', () => {
  it('cuenta solo números', () => {
    const planes = [
      planificarReparacion(lead({ localidad: 'Córdoba' }), lista),
      planificarReparacion(lead({ fuentes: { localidad: ['manual'] } }), lista),
      planificarReparacion(lead({}), lista),
      planificarReparacion(lead({ localidad: 'KQD', direccion: null }), lista),
      planificarReparacion(lead({ provincia: 'Santa Fe', localidad: 'S2000AAA', direccion: 'Calle 1, S2000 Ciudad Inventada' }), lista),
    ];
    expect(resumirReparacion(planes)).toEqual({
      revisados: 5,
      sospechosas: 4,
      salteadasManual: 1,
      conNombre: 2,
      conNombreSinLista: 1,
      quedanVacias: 1,
      sinDireccion: 1,
    });
  });
});
