import { describe, expect, it } from 'vitest';
import { BOM, armarCsv, celdaFecha, celdaNumero, celdaTelefono, celdaTexto, encabezadoCsv, filasCsv, nombreArchivoCsv } from './csv';
import type { LeadPanel } from './tipos';

// Datos INVENTADOS.
const lead = (cambios: Partial<LeadPanel> = {}): LeadPanel => ({
  id: 'id-interno-no-va',
  nombre: 'Almacén Ficticio',
  persona_contacto: null,
  rubro: 'Rubro Inventado',
  direccion: null,
  localidad: 'Villa Ficticia',
  provincia: 'Provincia Inventada',
  telefono_fijo: null,
  celular: null,
  telefono_sin_clasificar: null,
  whatsapp: null,
  email: null,
  instagram: null,
  sitio_web: null,
  rating: null,
  resenas: null,
  descartado: false,
  creado_en: '2026-01-15T12:00:00Z',
  ...cambios,
});

describe('celdaTexto', () => {
  it('texto simple sin comillas, con tildes intactas', () => {
    expect(celdaTexto('Panadería Ñandú')).toBe('Panadería Ñandú');
  });

  it('comillas, punto y coma, coma y saltos de línea van entre comillas', () => {
    expect(celdaTexto('Dice "hola"')).toBe('"Dice ""hola"""');
    expect(celdaTexto('uno; dos')).toBe('"uno; dos"');
    expect(celdaTexto('uno, dos')).toBe('"uno, dos"');
    expect(celdaTexto('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
    expect(celdaTexto('a\r\nb')).toBe('"a\r\nb"');
  });

  it('vacío', () => {
    expect(celdaTexto(null)).toBe('');
    expect(celdaTexto('')).toBe('');
  });

  it('no deja que Excel lo tome como fórmula', () => {
    expect(celdaTexto('=1+1')).toBe("'=1+1");
    expect(celdaTexto('-algo')).toBe("'-algo");
    expect(celdaTexto('@usuario_ficticio')).toBe("'@usuario_ficticio");
  });
});

describe('celdaTelefono', () => {
  it('número internacional forzado como texto', () => {
    expect(celdaTelefono('+5493515550123')).toBe('"=""+5493515550123"""');
  });

  it('otro texto: como texto seguro', () => {
    expect(celdaTelefono('+54 351 555')).toBe("'+54 351 555");
    expect(celdaTelefono(null)).toBe('');
  });
});

describe('celdaNumero y celdaFecha', () => {
  it('coma decimal', () => {
    expect(celdaNumero(4.5)).toBe('4,5');
    expect(celdaNumero(12)).toBe('12');
    expect(celdaNumero(null)).toBe('');
  });

  it('fecha en hora de Argentina', () => {
    expect(celdaFecha('2026-01-15T12:00:00Z')).toBe('2026-01-15');
    // 01:00 UTC del 16 = 22:00 del 15 en Argentina
    expect(celdaFecha('2026-01-16T01:00:00Z')).toBe('2026-01-15');
    expect(celdaFecha('no-es-fecha')).toBe('');
  });
});

describe('armarCsv', () => {
  it('empieza con BOM, usa ; y \\r\\n, y no incluye columnas internas', () => {
    const csv = armarCsv([lead()]);
    expect(csv.startsWith(BOM)).toBe(true);
    const lineas = csv.slice(BOM.length).split('\r\n');
    expect(lineas[0]).toBe(
      'Nombre;Persona de contacto;Rubro;Dirección;Localidad;Provincia;Teléfono fijo;Celular;' +
        'Teléfono sin clasificar;WhatsApp;Mail;Instagram;Sitio web;Rating;Reseñas;Descartado;Fecha de carga',
    );
    expect(lineas[1]).toBe('Almacén Ficticio;;Rubro Inventado;;Villa Ficticia;Provincia Inventada;;;;;;;;;;No;2026-01-15');
    expect(lineas[2]).toBe('');
    expect(csv).not.toContain('id-interno-no-va');
    expect(csv).not.toMatch(/fuentes|notas/i);
  });

  it('cada columna en su lugar, con WhatsApp como número internacional', () => {
    const fila = filasCsv([
      lead({
        nombre: 'Kiosco "El Ficticio"',
        persona_contacto: 'Persona Inventada',
        direccion: 'Calle Falsa 123, Villa Ficticia',
        telefono_fijo: '+543515550100',
        celular: '+5493515550123',
        telefono_sin_clasificar: '+543515550199',
        whatsapp: 'https://wa.me/5493515550123',
        email: 'contacto@ejemplo.invalid',
        instagram: '@kiosco_ficticio',
        sitio_web: 'https://ejemplo.invalid',
        rating: 4.7,
        resenas: 31,
        descartado: true,
      }),
    ]);
    expect(fila).toBe(
      '"Kiosco ""El Ficticio""";Persona Inventada;Rubro Inventado;"Calle Falsa 123, Villa Ficticia";Villa Ficticia;Provincia Inventada;' +
        '"=""+543515550100""";"=""+5493515550123""";"=""+543515550199""";"=""+5493515550123""";' +
        "contacto@ejemplo.invalid;'@kiosco_ficticio;https://ejemplo.invalid;4,7;31;Sí;2026-01-15\r\n",
    );
  });

  it('el encabezado y las filas se pueden armar por tandas', () => {
    const a = lead({ nombre: 'Uno' });
    const b = lead({ nombre: 'Dos' });
    expect(BOM + encabezadoCsv() + filasCsv([a]) + filasCsv([b])).toBe(armarCsv([a, b]));
  });

  it('nombre del archivo', () => {
    expect(nombreArchivoCsv(new Date('2026-03-02T15:00:00Z'))).toBe('leads-2026-03-02.csv');
  });
});
