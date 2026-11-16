// Pruebas de emails. Todos inventados; se usa el dominio reservado ".test".
import { describe, expect, it } from 'vitest';
import { limpiarEmail } from './emails.js';

describe('limpiarEmail: válidos', () => {
  it.each([
    ['ventas@ficticia.test', 'ventas@ficticia.test'],
    ['Ventas@Ficticia.TEST', 'ventas@ficticia.test'],
    ['  info@negocio-inventado.test  ', 'info@negocio-inventado.test'],
    ['mailto:pedidos@ficticia.test', 'pedidos@ficticia.test'],
    ['<contacto@ficticia.test>.', 'contacto@ficticia.test'],
    ['nombre.apellido+ventas@sub.ficticia.test', 'nombre.apellido+ventas@sub.ficticia.test'],
  ])('%j -> %s', (texto, esperado) => {
    expect(limpiarEmail(texto)).toBe(esperado);
  });
});

describe('limpiarEmail: archivos que parecen mails', () => {
  it.each([['logo@2x.png'], ['banner@ficticia.jpg'], ['foto@ficticia.JPEG'], ['icono@ficticia.webp'], ['marca@ficticia.svg']])(
    '%s -> null',
    (texto) => {
      expect(limpiarEmail(texto)).toBeNull();
    },
  );
});

describe('limpiarEmail: plantillas y servicios técnicos', () => {
  it.each([
    ['usuario@example.com'],
    ['usuario@example.com.ar'],
    ['nombre@tudominio.com'],
    ['you@yourdomain.com'],
    ['a1b2c3d4@o123456.ingest.sentry.io'],
    ['abc123@sentry-next.wixpress.com'],
    ['algo@wixpress.com'],
    ['info@godaddy.com'],
    ['correo@secureserver.net'],
  ])('%s -> null', (texto) => {
    expect(limpiarEmail(texto)).toBeNull();
  });
});

describe('limpiarEmail: inválidos', () => {
  it.each([
    [''],
    ['   '],
    ['sinarroba.ficticia.test'],
    ['dos@@ficticia.test'],
    ['a..b@ficticia.test'],
    ['.a@ficticia.test'],
    ['a.@ficticia.test'],
    ['a@-ficticia.test'],
    ['a@ficticia'],
    ['a@ficticia.c'],
    ['con espacio@ficticia.test'],
    ['@ficticia.test'],
  ])('%j -> null', (texto) => {
    expect(limpiarEmail(texto)).toBeNull();
  });

  it('null y undefined -> null', () => {
    expect(limpiarEmail(null)).toBeNull();
    expect(limpiarEmail(undefined)).toBeNull();
  });
});
