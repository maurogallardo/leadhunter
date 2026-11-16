// Pruebas de contacto. Datos inventados.
import { describe, expect, it } from 'vitest';
import { tieneContacto } from './contacto.js';
import type { Lead } from './tipos.js';

describe('tieneContacto', () => {
  it.each([
    [{ celular: '+5493515550123' }],
    [{ telefono_fijo: '+543515550123' }],
    [{ telefono_sin_clasificar: '+543515550123' }],
    [{ whatsapp: 'https://wa.me/5493515550123' }],
    [{ email: 'ventas@ficticia.test' }],
    [{ instagram: '@negocio_ficticio' }],
  ])('%j -> true', (lead) => {
    expect(tieneContacto(lead)).toBe(true);
  });

  it('solo sitio web NO cuenta', () => {
    const lead: Lead = { nombre: 'Negocio Ficticio', fuentes: {}, sitio_web: 'https://ficticia.test' };
    expect(tieneContacto(lead)).toBe(false);
  });

  it('todo vacío, null o en blanco -> false', () => {
    expect(tieneContacto({})).toBe(false);
    expect(tieneContacto({ celular: null, email: '', instagram: '   ' })).toBe(false);
  });
});
