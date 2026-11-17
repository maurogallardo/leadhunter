// Copia fija del Censo 2022 (INDEC, población por gobierno local).
// Ver scraper/datos/LEEME.md. La ruta se arma desde la ubicación de este
// archivo, así funciona igual desde src/ (pruebas) y desde dist/ (GitHub
// Actions): en los dos casos queda en scraper/datos/.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ARCHIVO_CENSO = fileURLToPath(new URL('../../datos/censo2022_gobierno_local.csv', import.meta.url));

/** Texto del CSV del censo. Si falta el archivo, lanza el error del sistema (ej. ENOENT). */
export function leerCopiaCenso(ruta: string = ARCHIVO_CENSO): string {
  return readFileSync(ruta, 'utf8');
}
