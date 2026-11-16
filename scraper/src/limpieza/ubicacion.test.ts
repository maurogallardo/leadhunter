import { describe, expect, it } from 'vitest';
import { distanciaMetros, puntoDe } from './ubicacion.js';

describe('distanciaMetros', () => {
  it('mismo punto = 0', () => {
    expect(distanciaMetros({ lat: -31.4, lng: -64.18 }, { lat: -31.4, lng: -64.18 })).toBe(0);
  });

  it('un grado de latitud ≈ 111,2 km', () => {
    expect(distanciaMetros({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
  });

  it('distancias cortas (≈ 50 m)', () => {
    const d = distanciaMetros({ lat: -31.4, lng: -64.18 }, { lat: -31.40045, lng: -64.18 });
    expect(d).toBeGreaterThan(49);
    expect(d).toBeLessThan(51);
  });

  it('es simétrica', () => {
    const a = { lat: -31.4, lng: -64.18 };
    const b = { lat: -34.6, lng: -58.38 };
    expect(distanciaMetros(a, b)).toBeCloseTo(distanciaMetros(b, a), 6);
  });

  it('distancia larga razonable (≈ 650 km)', () => {
    const d = distanciaMetros({ lat: -31.4, lng: -64.18 }, { lat: -34.6, lng: -58.38 });
    expect(d).toBeGreaterThan(600_000);
    expect(d).toBeLessThan(700_000);
  });
});

describe('puntoDe', () => {
  it('coordenadas válidas', () => {
    expect(puntoDe({ lat: -31.4, lng: -64.18 })).toEqual({ lat: -31.4, lng: -64.18 });
  });

  it.each([
    [{ lat: null, lng: -64.18 }],
    [{ lat: -31.4 }],
    [{}],
    [{ lat: Number.NaN, lng: 1 }],
    [{ lat: 91, lng: 0 }],
    [{ lat: 0, lng: 181 }],
  ])('%j -> null', (dato) => {
    expect(puntoDe(dato)).toBeNull();
  });
});
