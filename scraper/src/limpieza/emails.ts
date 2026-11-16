// Limpieza de emails.
// Descarta: nombres de archivos que parecen mails (logo@2x.png), dominios de
// plantillas o servicios técnicos (example.com, sentry, wixpress, godaddy...)
// y direcciones claramente inválidas.

/** Terminaciones de archivo que a veces aparecen pegadas a una "@". */
const TERMINACIONES_DE_ARCHIVO = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tif', '.tiff'];

/**
 * Dominios de plantillas o servicios técnicos. Se descarta el dominio y
 * cualquier subdominio (ej. o123.ingest.sentry.io).
 */
const DOMINIOS_DESCARTADOS = [
  'example.com',
  'example.org',
  'example.net',
  'example.com.ar',
  'domain.com',
  'dominio.com',
  'tudominio.com',
  'yourdomain.com',
  'mydomain.com',
  'midominio.com',
  'yoursite.com',
  'test.com',
  'sentry.io',
  'wixpress.com',
  'wix.com',
  'godaddy.com',
  'secureserver.net',
];

/** Palabras que, si aparecen en el dominio, indican un servicio técnico. */
const PALABRAS_DE_DOMINIO_DESCARTADAS = ['sentry', 'wixpress', 'godaddy'];

// Formato razonable: parte local con letras, números y . _ % + -
// y un dominio con al menos un punto y terminación de 2+ letras.
const FORMATO_EMAIL = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;

/** Devuelve el email limpio en minúsculas, o null si no sirve. */
export function limpiarEmail(texto: string | null | undefined): string | null {
  if (typeof texto !== 'string') return null;

  let email = texto.trim().toLowerCase();
  email = email.replace(/^mailto:/, '');
  email = email.replace(/^[<("'\s]+|[>)"'\s.,;:]+$/g, '');

  if (!FORMATO_EMAIL.test(email)) return null;

  const [local, dominio] = email.split('@') as [string, string];

  // Puntos mal puestos
  if (local.startsWith('.') || local.endsWith('.') || email.includes('..')) return null;
  // Partes del dominio que empiezan o terminan con guion
  if (dominio.split('.').some((parte) => parte.startsWith('-') || parte.endsWith('-'))) return null;

  if (TERMINACIONES_DE_ARCHIVO.some((ext) => email.endsWith(ext))) return null;

  if (DOMINIOS_DESCARTADOS.some((d) => dominio === d || dominio.endsWith(`.${d}`))) return null;
  if (PALABRAS_DE_DOMINIO_DESCARTADAS.some((p) => dominio.includes(p))) return null;

  return email;
}
