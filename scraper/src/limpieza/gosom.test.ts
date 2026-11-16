// Pruebas del mapeo de filas de gosom. La fila es INVENTADA (ningún negocio real).
import { describe, expect, it } from 'vitest';
import { type FilaGosom, mapearFilaGosom } from './gosom.js';

// Encabezados exactos del CSV de gosom v1.19.0 (gmaps/entry.go, CsvHeaders).
const ENCABEZADOS_GOSOM = [
  'input_id', 'link', 'title', 'category', 'address', 'open_hours', 'popular_times', 'website', 'phone',
  'plus_code', 'review_count', 'review_rating', 'reviews_per_rating', 'latitude', 'longitude', 'cid',
  'status', 'descriptions', 'reviews_link', 'thumbnail', 'timezone', 'price_range', 'data_id',
  'street_view_url', 'place_id', 'images', 'reservations', 'order_online', 'menu', 'owner',
  'complete_address', 'credit_cards_accepted', 'about', 'user_reviews', 'user_reviews_extended', 'emails',
  'review_collection',
];

function fila(datos: FilaGosom): FilaGosom {
  const base: FilaGosom = Object.fromEntries(ENCABEZADOS_GOSOM.map((c) => [c, '']));
  return { ...base, ...datos };
}

const DIRECCION_COMPLETA = JSON.stringify({
  borough: 'Barrio Inventado',
  street: 'Calle Falsa 123',
  city: 'Córdoba',
  postal_code: 'X5000',
  state: 'Córdoba',
  country: 'AR',
});

describe('mapearFilaGosom', () => {
  it('las columnas que usamos existen en el CSV de gosom', () => {
    const usadas = ['title', 'address', 'website', 'phone', 'review_count', 'review_rating', 'latitude',
      'longitude', 'place_id', 'complete_address', 'emails'];
    for (const columna of usadas) expect(ENCABEZADOS_GOSOM).toContain(columna);
  });

  it('fila completa con celular', () => {
    const lead = mapearFilaGosom(
      fila({
        title: '  Distribuidora Ficticia  ',
        category: 'Distribuidor de alimentos',
        address: 'Calle Falsa 123, X5000 Córdoba',
        website: 'https://distribuidora-ficticia.test/',
        phone: '0351 15-555-0123',
        review_count: '12',
        review_rating: '4.500000',
        latitude: '-31.400000',
        longitude: '-64.180000',
        place_id: 'ChIJ_FICTICIO_001',
        complete_address: DIRECCION_COMPLETA,
        emails: 'logo@2x.png, ventas@distribuidora-ficticia.test',
      }),
    );

    expect(lead).toEqual({
      nombre: 'Distribuidora Ficticia',
      celular: '+5493515550123',
      whatsapp: 'https://wa.me/5493515550123',
      email: 'ventas@distribuidora-ficticia.test',
      sitio_web: 'https://distribuidora-ficticia.test/',
      direccion: 'Calle Falsa 123, X5000 Córdoba',
      localidad: 'Córdoba',
      provincia: 'Córdoba',
      pais: 'Argentina',
      lat: -31.4,
      lng: -64.18,
      resenas: 12,
      rating: 4.5,
      google_place_id: 'ChIJ_FICTICIO_001',
      fuentes: {
        nombre: ['gosom'],
        celular: ['gosom'],
        whatsapp: ['gosom'],
        email: ['gosom'],
        sitio_web: ['gosom'],
        direccion: ['gosom'],
        localidad: ['gosom'],
        provincia: ['gosom'],
        pais: ['gosom'],
        lat: ['gosom'],
        lng: ['gosom'],
        resenas: ['gosom'],
        rating: ['gosom'],
        google_place_id: ['gosom'],
      },
    });
  });

  it('teléfono fijo -> telefono_fijo, sin WhatsApp', () => {
    const lead = mapearFilaGosom(fila({ title: 'Almacén Prueba', phone: '0351 555-0123' }));
    expect(lead?.telefono_fijo).toBe('+543515550123');
    expect(lead?.celular).toBeUndefined();
    expect(lead?.whatsapp).toBeUndefined();
  });

  it('teléfono ambiguo -> telefono_sin_clasificar', () => {
    const lead = mapearFilaGosom(fila({ title: 'Almacén Prueba', phone: '351 555-0123' }));
    expect(lead?.telefono_sin_clasificar).toBe('+543515550123');
    expect(lead?.telefono_fijo).toBeUndefined();
    expect(lead?.celular).toBeUndefined();
    expect(lead?.fuentes['telefono_sin_clasificar']).toEqual(['gosom']);
  });

  it('teléfono inválido -> ningún teléfono', () => {
    const lead = mapearFilaGosom(fila({ title: 'Almacén Prueba', phone: '12' }));
    expect(lead?.celular).toBeUndefined();
    expect(lead?.telefono_fijo).toBeUndefined();
    expect(lead?.telefono_sin_clasificar).toBeUndefined();
  });

  it('sin nombre -> null', () => {
    expect(mapearFilaGosom(fila({ title: '   ', phone: '0351 555-0123' }))).toBeNull();
    expect(mapearFilaGosom({})).toBeNull();
  });

  it('"0.000000" en coordenadas y rating = sin dato; 0 reseñas sí es un dato', () => {
    const lead = mapearFilaGosom(
      fila({ title: 'Kiosco Inventado', latitude: '0.000000', longitude: '0.000000', review_rating: '0.000000', review_count: '0' }),
    );
    expect(lead?.lat).toBeUndefined();
    expect(lead?.lng).toBeUndefined();
    expect(lead?.rating).toBeUndefined();
    expect(lead?.resenas).toBe(0);
  });

  it('valores numéricos rotos se ignoran', () => {
    const lead = mapearFilaGosom(
      fila({ title: 'Kiosco Inventado', latitude: 'abc', longitude: '-64.18', review_rating: '7', review_count: '1.5' }),
    );
    expect(lead?.lat).toBeUndefined();
    expect(lead?.rating).toBeUndefined();
    expect(lead?.resenas).toBeUndefined();
  });

  it('sin dirección completa (o rota) -> localidad y provincia vacías, no se inventan', () => {
    for (const complete_address of ['', '{no es json', '[]', 'null']) {
      const lead = mapearFilaGosom(fila({ title: 'Kiosco Inventado', address: 'Calle Falsa 123', complete_address }));
      expect(lead?.direccion).toBe('Calle Falsa 123');
      expect(lead?.localidad).toBeUndefined();
      expect(lead?.provincia).toBeUndefined();
      expect(lead?.pais).toBeUndefined();
    }
  });

  it('dirección completa parcial: usa solo lo que trae', () => {
    const lead = mapearFilaGosom(
      fila({ title: 'Kiosco Inventado', complete_address: JSON.stringify({ city: '', state: 'Córdoba', country: '' }) }),
    );
    expect(lead?.localidad).toBeUndefined();
    expect(lead?.provincia).toBe('Córdoba');
    expect(lead?.pais).toBeUndefined();
  });

  it('país distinto de AR: se deja el código tal cual', () => {
    const lead = mapearFilaGosom(
      fila({ title: 'Kiosco Inventado', complete_address: JSON.stringify({ city: 'Ciudad Ficticia', country: 'uy' }) }),
    );
    expect(lead?.pais).toBe('UY');
  });

  it('emails todos descartables -> sin email', () => {
    const lead = mapearFilaGosom(fila({ title: 'Kiosco Inventado', emails: 'a@example.com, logo@2x.png' }));
    expect(lead?.email).toBeUndefined();
  });
});
