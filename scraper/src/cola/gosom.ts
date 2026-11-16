// Corre UNA búsqueda de gosom en Docker. La salida de gosom va a un archivo
// de log que NUNCA se imprime (puede traer datos de negocios).

import { spawn, spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';

// Rutas siempre con "/": se usan en Linux (GitHub Actions) y dentro de Docker.
const { join } = posix;

/**
 * Profundidad de scroll de gosom (-depth). Cada nivel es un "scroll" más en
 * la lista de resultados de Google Maps; gosom deja de scrollear solo si la
 * lista no crece. Con 1 trae ~20. 10 es el valor por defecto de gosom y
 * apunta a ~100 resultados (Google Maps no suele mostrar más de ~120 por
 * búsqueda). Para cambiarlo, cambiá solo este número.
 */
export const PROFUNDIDAD_COLA = 10;

/**
 * Tiempo máximo de gosom por búsqueda. 30 y no 45 (como en "Buscar") para
 * que entre en el límite del job: 315 min + 30 de gosom + importar < 350.
 */
export const MINUTOS_MAXIMOS_GOSOM = 30;

export const NOMBRE_CONTENEDOR = 'gosom-cola';

export interface ArchivosBusqueda {
  carpeta: string;
  consultas: string;
  salida: string;
  csv: string;
  log: string;
}

export function archivosDeBusqueda(carpetaTrabajo: string, numero: number): ArchivosBusqueda {
  const carpeta = join(carpetaTrabajo, `busqueda-${String(numero).padStart(4, '0')}`);
  const salida = join(carpeta, 'out');
  return { carpeta, consultas: join(carpeta, 'queries.txt'), salida, csv: join(salida, 'results.csv'), log: join(carpeta, 'gosom.log') };
}

/** Argumentos de "timeout ... docker run ..." (mismas opciones que "Buscar", salvo profundidad y tiempo). */
export function argumentosGosom(imagen: string, a: ArchivosBusqueda): string[] {
  return [
    `${MINUTOS_MAXIMOS_GOSOM}m`,
    'docker', 'run', '--rm', '--name', NOMBRE_CONTENEDOR,
    '-e', 'DISABLE_TELEMETRY=1',
    '-v', `${a.consultas}:/queries.txt:ro`,
    '-v', `${a.salida}:/out`,
    imagen,
    '-input', '/queries.txt',
    '-results', '/out/results.csv',
    '-depth', String(PROFUNDIDAD_COLA),
    '-lang', 'es',
    '-c', '1',
    '-email',
    '-exit-on-inactivity', '3m',
  ];
}

/**
 * Prepara la carpeta, escribe queries.txt y corre gosom. Devuelve el código
 * de salida (null si no se pudo ejecutar o terminó por una señal).
 * Cada búsqueda usa su propia carpeta: nunca se reimporta un CSV viejo.
 */
export async function correrGosom(imagen: string, a: ArchivosBusqueda, consulta: string): Promise<number | null> {
  mkdirSync(a.salida, { recursive: true });
  writeFileSync(a.consultas, `${consulta}\n`, 'utf8');
  const fd = openSync(a.log, 'w');
  try {
    return await new Promise<number | null>((resolve) => {
      const proceso = spawn('timeout', argumentosGosom(imagen, a), { stdio: ['ignore', fd, fd] });
      proceso.on('error', () => resolve(null));
      proceso.on('close', (codigo) => resolve(codigo));
    });
  } finally {
    closeSync(fd);
    spawnSync('docker', ['rm', '-f', NOMBRE_CONTENEDOR], { stdio: 'ignore' });
  }
}
