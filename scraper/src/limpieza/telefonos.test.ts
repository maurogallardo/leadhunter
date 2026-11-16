// Pruebas de teléfonos. TODOS los números son inventados (terminan en 555-01xx).
import { describe, expect, it } from 'vitest';
import { linkWhatsapp, normalizarTelefono } from './telefonos.js';

describe('normalizarTelefono: celulares', () => {
  it.each([
    ['+54 9 351 555-0123', '+5493515550123'],
    ['+5493515550123', '+5493515550123'],
    ['5493515550123', '+5493515550123'],
    ['54 9 351 555 0123', '+5493515550123'],
    ['0054 9 351 555 0123', '+5493515550123'],
    ['+54 9 11 5555-0123', '+5491155550123'],
    // nacional con 15 -> se convierte a +54 9
    ['0351 15 555-0123', '+5493515550123'],
    ['0351 155550123', '+5493515550123'],
    ['351 15 555 0123', '+5493515550123'],
    ['(0351) 15-555-0123', '+5493515550123'],
    ['011 15 5555-0123', '+5491155550123'],
    ['02966 15 55-0123', '+5492966550123'],
    ['+54 351 15 555 0123', '+5493515550123'],
  ])('%s -> celular %s', (texto, e164) => {
    expect(normalizarTelefono(texto)).toEqual({ e164, tipo: 'celular' });
  });
});

describe('normalizarTelefono: fijos (0 + área y la librería dice fijo)', () => {
  it.each([
    ['0351 555-0123', '+543515550123'],
    ['(0351) 555-0123', '+543515550123'],
    ['0351-555-0123', '+543515550123'],
    ['0351.555.0123', '+543515550123'],
    ['0351/555-0123', '+543515550123'],
    ['011 4555-0123', '+541145550123'],
    ['0221 555-0123', '+542215550123'],
    ['tel: 0351-555-0123 (local)', '+543515550123'],
  ])('%s -> fijo %s', (texto, e164) => {
    expect(normalizarTelefono(texto)).toEqual({ e164, tipo: 'fijo' });
  });
});

describe('normalizarTelefono: sin clasificar (no se adivina)', () => {
  it.each([
    // +54 sin 9: puede ser un celular mal escrito o un fijo
    ['+54 351 555-0123', '+543515550123'],
    ['543515550123', '+543515550123'],
    ['+54 (351) 555-0123', '+543515550123'],
    // sin 0 y sin 15: puede ser fijo o celular sin el 15
    ['351 555-0123', '+543515550123'],
    ['3515550123', '+543515550123'],
    ['11 4555-0123', '+541145550123'],
    // 0800: ni fijo ni celular
    ['0800 555 0123', '+548005550123'],
    // número de otro país
    ['+1 212 555 0123', '+12125550123'],
  ])('%s -> sin_clasificar %s', (texto, e164) => {
    expect(normalizarTelefono(texto)).toEqual({ e164, tipo: 'sin_clasificar' });
  });
});

describe('normalizarTelefono: inválidos', () => {
  it.each([
    [''],
    ['   '],
    ['abc'],
    ['12'],
    ['0351 555'], // muy corto
    ['15 5555-0123'], // celular sin código de área
    ['5555-0123'], // sin código de área
    ['0351-55A-0123'], // con letras
    ['sin teléfono'],
  ])('%j -> invalido', (texto) => {
    expect(normalizarTelefono(texto)).toEqual({ e164: null, tipo: 'invalido' });
  });

  it('null y undefined -> invalido', () => {
    expect(normalizarTelefono(null)).toEqual({ e164: null, tipo: 'invalido' });
    expect(normalizarTelefono(undefined)).toEqual({ e164: null, tipo: 'invalido' });
  });
});

describe('normalizarTelefono: texto con varios números', () => {
  it('usa el primero válido', () => {
    expect(normalizarTelefono('tel 0351 555-0123 / 0351 15 555-0124')).toEqual({
      e164: '+543515550123',
      tipo: 'fijo',
    });
  });

  it('salta un número inválido y usa el siguiente', () => {
    expect(normalizarTelefono('int. 12 - cel 0351 15 555-0124')).toEqual({
      e164: '+5493515550124',
      tipo: 'celular',
    });
  });
});

describe('linkWhatsapp', () => {
  it('celular argentino en formato +549...', () => {
    expect(linkWhatsapp('+5493515550123')).toBe('https://wa.me/5493515550123');
    expect(linkWhatsapp(' +5491155550123 ')).toBe('https://wa.me/5491155550123');
  });

  it.each([
    ['+543515550123'], // fijo / sin 9
    ['0351 15 555-0123'], // no está normalizado
    ['5493515550123'], // falta el +
    ['+549351555012'], // un dígito menos
    ['+12125550123'], // otro país
    [''],
  ])('%j -> null', (valor) => {
    expect(linkWhatsapp(valor)).toBeNull();
  });

  it('null y undefined -> null', () => {
    expect(linkWhatsapp(null)).toBeNull();
    expect(linkWhatsapp(undefined)).toBeNull();
  });
});
