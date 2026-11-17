import { describe, expect, it } from 'vitest';
import { linkSitioWeb, linkWhatsapp, nombreParaCopiar, numeroParaCopiar, numeroWhatsapp, textoParaCopiar } from './contacto';

// Números inventados (555 = rango de prueba).
describe('numeroWhatsapp', () => {
  it('saca el número internacional del link wa.me', () => {
    expect(numeroWhatsapp('https://wa.me/5493515550123')).toBe('+5493515550123');
    expect(numeroWhatsapp('wa.me/5493515550123')).toBe('+5493515550123');
    expect(numeroWhatsapp('https://api.whatsapp.com/send?phone=5493515550123')).toBe('+5493515550123');
  });

  it('acepta un número suelto', () => {
    expect(numeroWhatsapp('+54 9 351 555-0123')).toBe('+5493515550123');
    expect(numeroWhatsapp('5493515550123')).toBe('+5493515550123');
  });

  it('vacío o inválido -> null', () => {
    expect(numeroWhatsapp(null)).toBeNull();
    expect(numeroWhatsapp('')).toBeNull();
    expect(numeroWhatsapp('https://wa.me/12')).toBeNull();
    expect(numeroWhatsapp('https://ejemplo.invalid/5493515550123')).toBeNull();
    expect(numeroWhatsapp('escribinos')).toBeNull();
  });
});

describe('linkWhatsapp (para "Probar en WhatsApp")', () => {
  it('número sin clasificar (+54 351 sin el 9) -> wa.me sin el +', () => {
    expect(linkWhatsapp('+543515550123')).toBe('https://wa.me/543515550123');
  });

  it('no inventa el 9 ni cambia el número', () => {
    expect(linkWhatsapp('+5493515550123')).toBe('https://wa.me/5493515550123');
  });

  it('inválido -> null', () => {
    expect(linkWhatsapp('+54')).toBeNull();
    expect(linkWhatsapp('abc')).toBeNull();
    expect(linkWhatsapp(null)).toBeNull();
    expect(linkWhatsapp('+0123456789')).toBeNull();
  });
});

describe('numeroParaCopiar', () => {
  it('devuelve el número internacional limpio', () => {
    expect(numeroParaCopiar(' +543515550123 ')).toBe('+543515550123');
    expect(numeroParaCopiar('543515550123')).toBe('+543515550123');
    expect(numeroParaCopiar('')).toBeNull();
  });
});

describe('nombreParaCopiar', () => {
  it('usa la persona de contacto si hay', () => {
    expect(nombreParaCopiar({ nombre: 'Almacén Ficticio', persona_contacto: 'Persona Inventada' })).toBe('Persona Inventada');
  });

  it('si no hay persona, el nombre del negocio', () => {
    expect(nombreParaCopiar({ nombre: ' Almacén Ficticio ', persona_contacto: null })).toBe('Almacén Ficticio');
    expect(nombreParaCopiar({ nombre: 'Almacén Ficticio', persona_contacto: '   ' })).toBe('Almacén Ficticio');
  });
});

describe('textoParaCopiar y linkSitioWeb', () => {
  it('textoParaCopiar limpia espacios', () => {
    expect(textoParaCopiar('  @negocio_ficticio ')).toBe('@negocio_ficticio');
    expect(textoParaCopiar('  ')).toBeNull();
  });

  it('linkSitioWeb solo acepta http/https', () => {
    expect(linkSitioWeb('ejemplo.invalid')).toBe('https://ejemplo.invalid/');
    expect(linkSitioWeb('http://ejemplo.invalid/x')).toBe('http://ejemplo.invalid/x');
    expect(linkSitioWeb('javascript:alert(1)')).toBeNull();
    expect(linkSitioWeb(null)).toBeNull();
  });
});
