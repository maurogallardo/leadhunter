// Reglas de la cola de búsquedas: funciones puras, sin red, sin base, sin
// Docker. Todo lo que decide la cola está acá (y probado en reglas.test.ts).

/** Fuente de la cola (columna cola_busquedas.fuente). */
export const FUENTE_COLA = 'gosom';

/** Intentos máximos por pendiente. Con 3 intentos fallidos queda en error y no se toca más. */
export const MAXIMO_INTENTOS = 3;

/** Si fallan tantas búsquedas seguidas, se corta la corrida (algo anda mal en general). */
export const MAXIMO_BUSQUEDAS_CON_ERROR_SEGUIDAS = 3;

/** Búsquedas seguidas con 0 resultados que se toman como bloqueo de Google. */
export const CEROS_SEGUIDOS_PARA_BLOQUEO = 2;

/** Pausa al azar entre búsquedas, en segundos. */
export const PAUSA_MINIMA_SEGUNDOS = 20;
export const PAUSA_MAXIMA_SEGUNDOS = 60;

/** Valor por defecto y máximo de "minutos_antes_de_relanzar". */
export const MINUTOS_RELANZAR_POR_DEFECTO = 315;
export const MINUTOS_RELANZAR_MAXIMO = 315;

/** Largo máximo de una consulta (igual que en "Buscar"). */
export const LARGO_MAXIMO_CONSULTA = 200;

// ---------------------------------------------------------------------
// Tipos (filas de la base ya validadas)
// ---------------------------------------------------------------------

export interface Rubro {
  id: string;
  nombre: string;
  texto_busqueda: string | null;
  activo: boolean;
  creado_en: string;
}

export interface Zona {
  id: string;
  pais: string;
  provincia: string;
  localidad: string | null;
  barrio: string | null;
  prioridad: number;
  activo: boolean;
  creado_en: string;
}

export type EstadoPendiente = 'pendiente' | 'en_curso' | 'hecha' | 'error';

export interface Pendiente {
  id: string;
  rubro_id: string;
  zona_id: string;
  estado: EstadoPendiente;
  intentos: number;
}

export interface Par {
  rubro_id: string;
  zona_id: string;
}

// ---------------------------------------------------------------------
// Conversión de filas de la base (defensiva: lo raro se descarta)
// ---------------------------------------------------------------------

const texto = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const textoLleno = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null);
const entero = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return Number(v);
  return null;
};

export function filaARubro(f: Record<string, unknown>): Rubro | null {
  const id = textoLleno(f['id']);
  const nombre = textoLleno(f['nombre']);
  if (!id || !nombre) return null;
  return {
    id,
    nombre,
    texto_busqueda: texto(f['texto_busqueda']),
    activo: f['activo'] === true,
    creado_en: texto(f['creado_en']) ?? '',
  };
}

export function filaAZona(f: Record<string, unknown>): Zona | null {
  const id = textoLleno(f['id']);
  const provincia = textoLleno(f['provincia']);
  if (!id || !provincia) return null;
  return {
    id,
    pais: textoLleno(f['pais']) ?? 'Argentina',
    provincia,
    localidad: textoLleno(f['localidad']),
    barrio: textoLleno(f['barrio']),
    prioridad: entero(f['prioridad']) ?? 100,
    activo: f['activo'] === true,
    creado_en: texto(f['creado_en']) ?? '',
  };
}

const ESTADOS: readonly EstadoPendiente[] = ['pendiente', 'en_curso', 'hecha', 'error'];

export function filaAPendiente(f: Record<string, unknown>): Pendiente | null {
  const id = textoLleno(f['id']);
  const rubro_id = textoLleno(f['rubro_id']);
  const zona_id = textoLleno(f['zona_id']);
  const estado = ESTADOS.find((e) => e === f['estado']);
  if (!id || !rubro_id || !zona_id || !estado) return null;
  return { id, rubro_id, zona_id, estado, intentos: entero(f['intentos']) ?? 0 };
}

// ---------------------------------------------------------------------
// Armar cola
// ---------------------------------------------------------------------

const clavePar = (p: Par): string => `${p.rubro_id}|${p.zona_id}`;

export interface ResultadoArmado {
  zonasActivas: number;
  rubrosActivos: number;
  /** Combinaciones rubro × zona que hay que crear. */
  nuevos: Par[];
  /** Combinaciones activas que ya estaban en la cola (en cualquier estado). */
  yaExistian: number;
}

/**
 * Un pendiente por cada rubro activo × zona activa que todavía no esté en
 * la cola. Lo que ya existe (hecho, con error, lo que sea) no se repite.
 * El orden de "nuevos" sigue el orden de ejecución (zona por prioridad,
 * después rubro), solo para que sea predecible.
 */
export function armarPendientes(rubros: readonly Rubro[], zonas: readonly Zona[], existentes: readonly Par[]): ResultadoArmado {
  const rubrosActivos = ordenarRubros(rubros.filter((r) => r.activo));
  const zonasActivas = ordenarZonas(zonas.filter((z) => z.activo));
  const ya = new Set(existentes.map(clavePar));

  const nuevos: Par[] = [];
  let yaExistian = 0;
  for (const zona of zonasActivas) {
    for (const rubro of rubrosActivos) {
      const par = { rubro_id: rubro.id, zona_id: zona.id };
      const clave = clavePar(par);
      if (ya.has(clave)) {
        yaExistian++;
      } else {
        nuevos.push(par);
        ya.add(clave);
      }
    }
  }
  return { zonasActivas: zonasActivas.length, rubrosActivos: rubrosActivos.length, nuevos, yaExistian };
}

// ---------------------------------------------------------------------
// Orden de ejecución
// ---------------------------------------------------------------------

/**
 * Convierte un timestamp de Postgres (ej. "2026-11-16T10:00:00.123456+00:00")
 * en un número comparable, respetando los microsegundos. Si no se entiende,
 * va al final.
 */
export function instante(valor: string): number {
  const m = /^(.*T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(.*)$/.exec(valor.trim());
  if (!m) return Number.POSITIVE_INFINITY;
  const base = Date.parse(`${m[1]}${m[3] ?? ''}`);
  if (!Number.isFinite(base)) return Number.POSITIVE_INFINITY;
  const micros = Number((m[2] ?? '').padEnd(6, '0').slice(0, 6));
  return base * 1000 + micros;
}

const compararTexto = (a: string, b: string): number => a.localeCompare(b, 'es', { sensitivity: 'base' }) || (a < b ? -1 : a > b ? 1 : 0);
const compararNumero = (a: number, b: number): number => (a === b ? 0 : a < b ? -1 : 1);

/** Rubros en orden de creación; si empatan (se cargaron juntos), alfabético. */
export function compararRubros(a: Rubro, b: Rubro): number {
  return (
    compararNumero(instante(a.creado_en), instante(b.creado_en)) ||
    compararTexto(a.nombre, b.nombre) ||
    compararTexto(a.id, b.id)
  );
}

/** Zonas por prioridad (1 antes que 2); si empatan, por creación y después alfabético. */
export function compararZonas(a: Zona, b: Zona): number {
  return (
    compararNumero(a.prioridad, b.prioridad) ||
    compararNumero(instante(a.creado_en), instante(b.creado_en)) ||
    compararTexto(a.provincia, b.provincia) ||
    compararTexto(a.localidad ?? '', b.localidad ?? '') ||
    compararTexto(a.barrio ?? '', b.barrio ?? '') ||
    compararTexto(a.id, b.id)
  );
}

export const ordenarRubros = (rubros: readonly Rubro[]): Rubro[] => [...rubros].sort(compararRubros);
export const ordenarZonas = (zonas: readonly Zona[]): Zona[] => [...zonas].sort(compararZonas);

/**
 * ¿Se puede tomar este pendiente en una corrida nueva?
 * - "pendiente": sí.
 * - "error": sí, si todavía no llegó a 3 intentos.
 * - "hecha" / "en_curso": no.
 */
export function esElegible(p: Pendiente): boolean {
  if (p.estado === 'pendiente') return true;
  if (p.estado === 'error') return p.intentos < MAXIMO_INTENTOS;
  return false;
}

export interface Tarea {
  pendiente: Pendiente;
  rubro: Rubro;
  zona: Zona;
}

/**
 * Lista de tareas en orden de ejecución: zonas por prioridad y, dentro de
 * cada zona, rubros por orden de creación. Se saltean los pendientes no
 * elegibles y los de rubros o zonas inactivos (o borrados).
 */
export function ordenarCola(pendientes: readonly Pendiente[], rubros: readonly Rubro[], zonas: readonly Zona[]): Tarea[] {
  const rubroPorId = new Map(rubros.map((r) => [r.id, r]));
  const zonaPorId = new Map(zonas.map((z) => [z.id, z]));
  const tareas: Tarea[] = [];
  for (const pendiente of pendientes) {
    if (!esElegible(pendiente)) continue;
    const rubro = rubroPorId.get(pendiente.rubro_id);
    const zona = zonaPorId.get(pendiente.zona_id);
    if (!rubro?.activo || !zona?.activo) continue;
    tareas.push({ pendiente, rubro, zona });
  }
  return tareas.sort(
    (a, b) => compararZonas(a.zona, b.zona) || compararRubros(a.rubro, b.rubro) || compararTexto(a.pendiente.id, b.pendiente.id),
  );
}

// ---------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------

const unaLinea = (s: string): string => s.replace(/\s+/g, ' ').trim();

/**
 * Consulta para Google Maps: "<texto del rubro> en <barrio>, <localidad>,
 * <provincia>, <país>". El texto del rubro es texto_busqueda o, si está
 * vacío, el nombre. Lo vacío se omite. Siempre una sola línea.
 */
export function construirConsulta(rubro: Rubro, zona: Zona): string {
  const textoRubro = unaLinea(rubro.texto_busqueda ?? '') || unaLinea(rubro.nombre);
  const lugar = [zona.barrio, zona.localidad, zona.provincia, zona.pais]
    .map((p) => unaLinea(p ?? ''))
    .filter((p) => p !== '')
    .join(', ');
  const consulta = lugar ? `${textoRubro} en ${lugar}` : textoRubro;
  return consulta.slice(0, LARGO_MAXIMO_CONSULTA).trim();
}

// ---------------------------------------------------------------------
// Bloqueo
// ---------------------------------------------------------------------

/**
 * Señales FUERTES de bloqueo en el log de gosom. "consent" NO está a
 * propósito: da falsas alarmas (avisos de cookies, etc.).
 */
export const SENALES_FUERTES: readonly { etiqueta: string; patron: RegExp }[] = [
  { etiqueta: 'captcha', patron: /captcha/gi },
  { etiqueta: 'blocked', patron: /blocked/gi },
  { etiqueta: '429', patron: /\b429\b/g },
  { etiqueta: 'unusual traffic', patron: /unusual traffic/gi },
];

/** Cuenta las señales fuertes en el texto del log. Devuelve solo números. */
export function contarSenalesFuertes(log: string): { etiqueta: string; cantidad: number }[] {
  return SENALES_FUERTES.map(({ etiqueta, patron }) => ({
    etiqueta,
    cantidad: (log.match(new RegExp(patron.source, patron.flags)) ?? []).length,
  }));
}

export const totalSenales = (conteo: readonly { cantidad: number }[]): number => conteo.reduce((t, c) => t + c.cantidad, 0);

// ---------------------------------------------------------------------
// Resultado de una búsqueda
// ---------------------------------------------------------------------

export interface DatosBusqueda {
  /** Total de señales fuertes en el log de gosom. */
  senalesFuertes: number;
  /** Filas del CSV de gosom. */
  filas: number;
  /** Código de salida de gosom (null = no se pudo ejecutar o lo cortó una señal). */
  codigoGosom: number | null;
  /** Resultado del importador. */
  importacionFatal: boolean;
  erroresImportacion: number;
  codigoError: string | null;
  nuevos: number;
  unidos: number;
  /** Búsquedas seguidas con 0 resultados ANTES de esta (en esta corrida). */
  cerosSeguidosAntes: number;
}

export type MotivoBloqueo = 'senales_fuertes' | 'dos_sin_resultados';

export type ResultadoBusqueda =
  | { tipo: 'hecha'; leadsEncontrados: number; cerosSeguidos: number }
  | { tipo: 'error'; errorMensaje: string; cerosSeguidos: number }
  | { tipo: 'bloqueo'; motivo: MotivoBloqueo; cerosSeguidos: number };

/**
 * Decide cómo terminó una búsqueda. Orden:
 * 1. bloqueo por señales fuertes en el log;
 * 2. bloqueo por 2 búsquedas seguidas con 0 resultados (esta y la anterior);
 * 3. error: importación cortada, filas que no se guardaron, o gosom
 *    terminó con error sin dejar resultados;
 * 4. hecha (aunque tenga 0 resultados, si es la primera con 0).
 * Los mensajes de error son cortos y solo llevan números/códigos.
 */
export function resultadoDeBusqueda(d: DatosBusqueda): ResultadoBusqueda {
  const cerosSeguidos = d.filas === 0 ? d.cerosSeguidosAntes + 1 : 0;

  if (d.senalesFuertes > 0) return { tipo: 'bloqueo', motivo: 'senales_fuertes', cerosSeguidos };
  if (cerosSeguidos >= CEROS_SEGUIDOS_PARA_BLOQUEO) return { tipo: 'bloqueo', motivo: 'dos_sin_resultados', cerosSeguidos };

  const codigo = d.codigoError ?? 'desconocido';
  if (d.importacionFatal) return { tipo: 'error', errorMensaje: `importacion cortada (codigo ${codigo})`, cerosSeguidos };
  if (d.erroresImportacion > 0) {
    return { tipo: 'error', errorMensaje: `${d.erroresImportacion} filas no se guardaron (codigo ${codigo})`, cerosSeguidos };
  }
  if (d.filas === 0 && d.codigoGosom !== 0) {
    return { tipo: 'error', errorMensaje: `gosom fallo sin resultados (codigo ${d.codigoGosom ?? 'desconocido'})`, cerosSeguidos };
  }
  return { tipo: 'hecha', leadsEncontrados: d.nuevos + d.unidos, cerosSeguidos };
}

// ---------------------------------------------------------------------
// Cambios en la fila de cola_busquedas
// ---------------------------------------------------------------------

/** Al tomar un pendiente: en_curso y un intento más. */
export function cambioAlTomar(p: Pendiente, ahora: string): Record<string, unknown> {
  return { estado: 'en_curso', intentos: p.intentos + 1, iniciada_en: ahora, terminada_en: null };
}

/**
 * Al terminar una búsqueda:
 * - hecha: estado hecha, leads_encontrados, sin mensaje de error.
 * - error: estado error con mensaje corto (con 3 intentos ya no se retoma).
 * - bloqueo: vuelve a pendiente y se le devuelve el intento (el bloqueo
 *   no es culpa de la búsqueda).
 */
export function cambioAlTerminar(p: Pendiente, r: ResultadoBusqueda, ahora: string): Record<string, unknown> {
  switch (r.tipo) {
    case 'hecha':
      return { estado: 'hecha', leads_encontrados: r.leadsEncontrados, error_mensaje: null, terminada_en: ahora };
    case 'error':
      return { estado: 'error', error_mensaje: r.errorMensaje, terminada_en: ahora };
    case 'bloqueo':
      return { estado: 'pendiente', intentos: p.intentos, iniciada_en: null, terminada_en: null };
  }
}

/** Mensaje para pendientes que quedaron "en_curso" de una corrida que se cortó. */
export const MENSAJE_INTERRUMPIDA = 'corrida anterior interrumpida';

// ---------------------------------------------------------------------
// Tiempo y relanzamiento
// ---------------------------------------------------------------------

/** Pausa al azar entre 20 y 60 segundos (enteros). */
export function pausaAlAzar(aleatorio: () => number = Math.random): number {
  const r = Math.min(Math.max(aleatorio(), 0), 0.999999);
  return PAUSA_MINIMA_SEGUNDOS + Math.floor(r * (PAUSA_MAXIMA_SEGUNDOS - PAUSA_MINIMA_SEGUNDOS + 1));
}

/**
 * ¿Se puede empezar otra búsqueda? La primera búsqueda de cada corrida se
 * hace SIEMPRE (así cada corrida avanza al menos una y nunca se relanza en
 * vacío). Después, solo si no se llegó al límite de minutos.
 */
export function puedeEmpezarOtra(busquedasEnEstaCorrida: number, minutosTranscurridos: number, minutosLimite: number): boolean {
  return busquedasEnEstaCorrida === 0 || minutosTranscurridos < minutosLimite;
}

export interface DatosFinales {
  bloqueo: boolean;
  fatal: boolean;
  /** Se cortó porque se llegó al límite de minutos. */
  cortadaPorTiempo: boolean;
  /** Pendientes que se podrían tomar en una corrida nueva. */
  quedan: number;
  busquedasEnEstaCorrida: number;
}

/** Se relanza solo si se cortó por tiempo, quedan pendientes, no hubo bloqueo ni error grave, y se avanzó algo. */
export function debeRelanzar(d: DatosFinales): boolean {
  return d.cortadaPorTiempo && !d.bloqueo && !d.fatal && d.quedan > 0 && d.busquedasEnEstaCorrida > 0;
}

export type EstadoCorridaCola = 'ok' | 'error' | 'frenada_por_bloqueo';

export function estadoCorridaCola(d: { fatal: boolean; bloqueo: boolean }): EstadoCorridaCola {
  if (d.fatal) return 'error';
  if (d.bloqueo) return 'frenada_por_bloqueo';
  return 'ok';
}

// ---------------------------------------------------------------------
// Textos (solo números y estados)
// ---------------------------------------------------------------------

export interface Totales {
  busquedasHechas: number;
  busquedasConError: number;
  /** Búsquedas devueltas a pendiente por bloqueo (0 o 1). */
  busquedasDevueltas: number;
  leadsNuevos: number;
  leadsUnidos: number;
}

export const totalesIniciales = (): Totales => ({
  busquedasHechas: 0,
  busquedasConError: 0,
  busquedasDevueltas: 0,
  leadsNuevos: 0,
  leadsUnidos: 0,
});

export function sumarBusqueda(t: Totales, r: ResultadoBusqueda, nuevos: number, unidos: number): Totales {
  return {
    busquedasHechas: t.busquedasHechas + (r.tipo === 'hecha' ? 1 : 0),
    busquedasConError: t.busquedasConError + (r.tipo === 'error' ? 1 : 0),
    busquedasDevueltas: t.busquedasDevueltas + (r.tipo === 'bloqueo' ? 1 : 0),
    leadsNuevos: t.leadsNuevos + nuevos,
    leadsUnidos: t.leadsUnidos + unidos,
  };
}

export interface DatosResumen {
  totales: Totales;
  quedan: number | null;
  estado: EstadoCorridaCola;
  bloqueo: MotivoBloqueo | null;
  relanzar: boolean;
}

export function lineasResumenCola(d: DatosResumen): string[] {
  return [
    '===== RESUMEN PROCESAR COLA =====',
    `Busquedas hechas: ${d.totales.busquedasHechas}`,
    `Busquedas con error: ${d.totales.busquedasConError}`,
    `Busquedas devueltas a pendiente por bloqueo: ${d.totales.busquedasDevueltas}`,
    `Leads nuevos: ${d.totales.leadsNuevos}`,
    `Leads unidos con existentes: ${d.totales.leadsUnidos}`,
    `Pendientes que quedan (incluye errores a reintentar): ${d.quedan ?? 'no se pudo contar'}`,
    `Bloqueo: ${d.bloqueo === null ? 'no' : d.bloqueo === 'senales_fuertes' ? 'si (senales en el log)' : 'si (2 busquedas seguidas sin resultados)'}`,
    `Se relanza sola: ${d.relanzar ? 'si' : 'no'}`,
    `Estado de la corrida: ${d.estado}`,
    '=================================',
  ];
}

export function detalleCorridaCola(d: DatosResumen & { interrumpidas: number; codigoError: string | null; minutos: number }): string {
  const partes = [
    'cola=1',
    `hechas=${d.totales.busquedasHechas}`,
    `con_error=${d.totales.busquedasConError}`,
    `devueltas=${d.totales.busquedasDevueltas}`,
    `nuevos=${d.totales.leadsNuevos}`,
    `unidos=${d.totales.leadsUnidos}`,
    `quedan=${d.quedan ?? 'desconocido'}`,
    `bloqueo=${d.bloqueo ?? 'no'}`,
    `relanzar=${d.relanzar ? 'si' : 'no'}`,
    `interrumpidas=${d.interrumpidas}`,
    `minutos=${d.minutos}`,
  ];
  if (d.codigoError) partes.push(`error=${d.codigoError}`);
  return partes.join(' ');
}
