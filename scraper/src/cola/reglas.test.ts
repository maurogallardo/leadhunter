// Pruebas de las reglas de la cola. Datos INVENTADOS (ids y lugares ficticios).
import { describe, expect, it } from 'vitest';
import {
  armarPendientes,
  cambioAlTerminar,
  cambioAlTomar,
  construirConsulta,
  contarSenales,
  type DatosBusqueda,
  debeRelanzar,
  esElegible,
  estadoCorridaCola,
  filaAPendiente,
  filaARubro,
  filaAZona,
  instante,
  lineasResumenCola,
  MAXIMO_INTENTOS,
  ordenarCola,
  ordenarRubros,
  pausaAlAzar,
  type Pendiente,
  puedeEmpezarOtra,
  resultadoDeBusqueda,
  type Rubro,
  sumarBusqueda,
  totalesIniciales,
  totalSenales,
  type Zona,
} from './reglas.js';

const MISMA_HORA = '2026-01-01T10:00:00.123456+00:00';

const rubro = (id: string, nombre: string, extra: Partial<Rubro> = {}): Rubro => ({
  id,
  nombre,
  texto_busqueda: null,
  activo: true,
  creado_en: MISMA_HORA,
  ...extra,
});

const zona = (id: string, localidad: string, prioridad: number, extra: Partial<Zona> = {}): Zona => ({
  id,
  pais: 'Argentina',
  provincia: 'Provincia Ficticia',
  localidad,
  barrio: null,
  prioridad,
  activo: true,
  creado_en: MISMA_HORA,
  ...extra,
});

const pendiente = (id: string, rubro_id: string, zona_id: string, extra: Partial<Pendiente> = {}): Pendiente => ({
  id,
  rubro_id,
  zona_id,
  estado: 'pendiente',
  intentos: 0,
  ...extra,
});

// Los 7 rubros reales se cargaron juntos: misma hora exacta.
const SIETE = [
  rubro('r1', 'Distribuidoras de alimentos y bebidas'),
  rubro('r2', 'Mayoristas'),
  rubro('r3', 'Supermercados'),
  rubro('r4', 'Autoservicios y despensas'),
  rubro('r5', 'Almacenes y fiambrerías'),
  rubro('r6', 'Kioscos y polirrubros'),
  rubro('r7', 'Panaderías y fábricas de pastas'),
];

describe('armarPendientes', () => {
  it('1 zona × 7 rubros = 7 nuevos; la segunda vez, 0 nuevos y 7 ya existían', () => {
    const zonas = [zona('z1', 'Localidad Ficticia', 1)];
    const primera = armarPendientes(SIETE, zonas, []);
    expect(primera).toMatchObject({ zonasActivas: 1, rubrosActivos: 7, yaExistian: 0 });
    expect(primera.nuevos).toHaveLength(7);

    const segunda = armarPendientes(SIETE, zonas, primera.nuevos);
    expect(segunda.nuevos).toEqual([]);
    expect(segunda.yaExistian).toBe(7);
  });

  it('solo crea lo que falta (zona nueva) y no repite pares', () => {
    const zonas = [zona('z1', 'Uno', 1), zona('z2', 'Dos', 2)];
    const existentes = SIETE.map((r) => ({ rubro_id: r.id, zona_id: 'z1' }));
    const r = armarPendientes(SIETE, zonas, [...existentes, ...existentes]);
    expect(r.nuevos).toHaveLength(7);
    expect(r.nuevos.every((p) => p.zona_id === 'z2')).toBe(true);
    expect(r.yaExistian).toBe(7);
    expect(new Set(r.nuevos.map((p) => p.rubro_id)).size).toBe(7);
  });

  it('ignora rubros y zonas inactivos', () => {
    const r = armarPendientes(
      [rubro('r1', 'A'), rubro('r2', 'B', { activo: false })],
      [zona('z1', 'Uno', 1), zona('z2', 'Dos', 1, { activo: false })],
      [],
    );
    expect(r).toEqual({ zonasActivas: 1, rubrosActivos: 1, nuevos: [{ rubro_id: 'r1', zona_id: 'z1' }], yaExistian: 0 });
  });

  it('sin zonas no crea nada', () => {
    expect(armarPendientes(SIETE, [], [])).toEqual({ zonasActivas: 0, rubrosActivos: 7, nuevos: [], yaExistian: 0 });
  });

  it('los nuevos salen en orden de ejecución (zona por prioridad, después rubro)', () => {
    const r = armarPendientes([rubro('rb', 'B'), rubro('ra', 'A')], [zona('z2', 'Dos', 2), zona('z1', 'Uno', 1)], []);
    expect(r.nuevos).toEqual([
      { rubro_id: 'ra', zona_id: 'z1' },
      { rubro_id: 'rb', zona_id: 'z1' },
      { rubro_id: 'ra', zona_id: 'z2' },
      { rubro_id: 'rb', zona_id: 'z2' },
    ]);
  });
});

describe('orden', () => {
  it('rubros con la misma hora: alfabético (sin importar tildes ni mayúsculas)', () => {
    expect(ordenarRubros(SIETE).map((r) => r.id)).toEqual(['r5', 'r4', 'r1', 'r6', 'r2', 'r7', 'r3']);
  });

  it('un rubro creado después va al final aunque alfabéticamente vaya antes', () => {
    const nuevo = rubro('r8', 'Aaa Rubro Nuevo', { creado_en: '2026-02-01T00:00:00+00:00' });
    expect(ordenarRubros([nuevo, ...SIETE]).at(-1)?.id).toBe('r8');
  });

  it('respeta microsegundos aunque tengan distinta cantidad de dígitos', () => {
    expect(instante('2026-01-01T10:00:00.5+00:00')).toBeGreaterThan(instante('2026-01-01T10:00:00.123456+00:00'));
    expect(instante('2026-01-01T10:00:00+00:00')).toBeLessThan(instante('2026-01-01T10:00:00.000001+00:00'));
    expect(instante('cualquier cosa')).toBe(Number.POSITIVE_INFINITY);
  });

  it('ordenarCola: zona por prioridad (1 antes que 2), dentro de la zona rubros por creación/alfabético', () => {
    const zonas = [zona('z2', 'Dos', 2), zona('z1', 'Uno', 1)];
    const rubros = [rubro('rb', 'Beta'), rubro('ra', 'Alfa')];
    const pendientes = [
      pendiente('p1', 'rb', 'z2'),
      pendiente('p2', 'ra', 'z2'),
      pendiente('p3', 'rb', 'z1'),
      pendiente('p4', 'ra', 'z1'),
    ];
    expect(ordenarCola(pendientes, rubros, zonas).map((t) => t.pendiente.id)).toEqual(['p4', 'p3', 'p2', 'p1']);
  });

  it('ordenarCola: misma prioridad -> la zona creada antes va primero', () => {
    const zonas = [zona('zb', 'B', 1, { creado_en: '2026-03-01T00:00:00+00:00' }), zona('za', 'Z', 1, { creado_en: '2026-02-01T00:00:00+00:00' })];
    const t = ordenarCola([pendiente('p1', 'r1', 'zb'), pendiente('p2', 'r1', 'za')], [rubro('r1', 'A')], zonas);
    expect(t.map((x) => x.pendiente.id)).toEqual(['p2', 'p1']);
  });

  it('ordenarCola: saltea hechas, en curso, errores agotados, y rubros/zonas inactivos o borrados', () => {
    const rubros = [rubro('r1', 'A'), rubro('r2', 'B', { activo: false })];
    const zonas = [zona('z1', 'Uno', 1), zona('z2', 'Dos', 1, { activo: false })];
    const pendientes = [
      pendiente('ok1', 'r1', 'z1'),
      pendiente('hecha', 'r1', 'z1', { estado: 'hecha', intentos: 1 }),
      pendiente('encurso', 'r1', 'z1', { estado: 'en_curso', intentos: 1 }),
      pendiente('error2', 'r1', 'z1', { estado: 'error', intentos: 2 }),
      pendiente('error3', 'r1', 'z1', { estado: 'error', intentos: 3 }),
      pendiente('rubroInactivo', 'r2', 'z1'),
      pendiente('zonaInactiva', 'r1', 'z2'),
      pendiente('rubroBorrado', 'r9', 'z1'),
    ];
    expect(ordenarCola(pendientes, rubros, zonas).map((t) => t.pendiente.id).sort()).toEqual(['error2', 'ok1']);
  });
});

describe('reintentos (máximo 3 intentos en total)', () => {
  it('esElegible', () => {
    expect(MAXIMO_INTENTOS).toBe(3);
    expect(esElegible(pendiente('p', 'r', 'z'))).toBe(true);
    expect(esElegible(pendiente('p', 'r', 'z', { estado: 'error', intentos: 1 }))).toBe(true);
    expect(esElegible(pendiente('p', 'r', 'z', { estado: 'error', intentos: 2 }))).toBe(true);
    expect(esElegible(pendiente('p', 'r', 'z', { estado: 'error', intentos: 3 }))).toBe(false);
    expect(esElegible(pendiente('p', 'r', 'z', { estado: 'error', intentos: 7 }))).toBe(false);
    expect(esElegible(pendiente('p', 'r', 'z', { estado: 'hecha' }))).toBe(false);
    expect(esElegible(pendiente('p', 'r', 'z', { estado: 'en_curso' }))).toBe(false);
  });

  it('ciclo completo: 3 errores seguidos y queda en error para siempre', () => {
    let p = pendiente('p', 'r', 'z');
    const error = { tipo: 'error', errorMensaje: 'x', cerosSeguidos: 0, senalesDebilesConResultados: false } as const;
    for (let intento = 1; intento <= 3; intento++) {
      expect(esElegible(p)).toBe(true);
      const tomado = cambioAlTomar(p, 'T');
      expect(tomado).toMatchObject({ estado: 'en_curso', intentos: intento });
      p = { ...p, ...(tomado as Partial<Pendiente>) };
      const terminado = cambioAlTerminar({ ...p, intentos: intento - 1 }, error, 'T');
      p = { ...p, ...(terminado as Partial<Pendiente>) };
      expect(p.estado).toBe('error');
    }
    expect(p.intentos).toBe(3);
    expect(esElegible(p)).toBe(false);
  });

  it('bloqueo: vuelve a pendiente y NO gasta el intento', () => {
    const p = pendiente('p', 'r', 'z', { estado: 'error', intentos: 2 });
    const cambio = cambioAlTerminar(p, { tipo: 'bloqueo', motivo: 'senales_fuertes', cerosSeguidos: 0 }, 'T');
    expect(cambio).toEqual({ estado: 'pendiente', intentos: 2, iniciada_en: null, terminada_en: null });
  });

  it('hecha: guarda leads_encontrados y limpia el error', () => {
    const cambio = cambioAlTerminar(pendiente('p', 'r', 'z'), { tipo: 'hecha', leadsEncontrados: 12, cerosSeguidos: 0, senalesDebilesConResultados: false }, 'T');
    expect(cambio).toEqual({ estado: 'hecha', leads_encontrados: 12, error_mensaje: null, terminada_en: 'T' });
  });
});

describe('construirConsulta', () => {
  it('rubro + localidad + provincia + país', () => {
    expect(construirConsulta(rubro('r', 'Mayoristas'), zona('z', 'Localidad Ficticia', 1))).toBe(
      'Mayoristas en Localidad Ficticia, Provincia Ficticia, Argentina',
    );
  });

  it('usa texto_busqueda si está cargado; si está vacío, el nombre', () => {
    const z = zona('z', 'Uno', 1);
    expect(construirConsulta(rubro('r', 'Almacenes y fiambrerías', { texto_busqueda: 'fiambrerías' }), z)).toBe(
      'fiambrerías en Uno, Provincia Ficticia, Argentina',
    );
    expect(construirConsulta(rubro('r', 'Mayoristas', { texto_busqueda: '   ' }), z)).toBe('Mayoristas en Uno, Provincia Ficticia, Argentina');
  });

  it('incluye el barrio si existe y omite la localidad vacía', () => {
    expect(construirConsulta(rubro('r', 'Kioscos'), zona('z', 'Uno', 1, { barrio: 'Barrio Ficticio' }))).toBe(
      'Kioscos en Barrio Ficticio, Uno, Provincia Ficticia, Argentina',
    );
    expect(construirConsulta(rubro('r', 'Kioscos'), zona('z', '', 1, { localidad: null }))).toBe('Kioscos en Provincia Ficticia, Argentina');
  });

  it('siempre una sola línea y como máximo 200 caracteres', () => {
    const c = construirConsulta(rubro('r', 'Rubro\ncon  saltos\r\nde línea'), zona('z', 'Uno\nDos', 1));
    expect(c).toBe('Rubro con saltos de línea en Uno Dos, Provincia Ficticia, Argentina');
    expect(construirConsulta(rubro('r', 'x'.repeat(500)), zona('z', 'Uno', 1)).length).toBe(200);
  });
});

describe('bloqueo', () => {
  it('cuenta señales fuertes y débiles por separado; "consent" NO cuenta; 4290 no es 429', () => {
    const log = 'Captcha detectado\nrequest BLOCKED\nstatus 429\nid 4290\nconsent.google.com\nUnusual Traffic\ncaptcha otra vez';
    const conteo = contarSenales(log);
    expect(conteo).toEqual([
      { etiqueta: 'captcha', tipo: 'fuerte', cantidad: 2 },
      { etiqueta: 'blocked', tipo: 'debil', cantidad: 1 },
      { etiqueta: '429', tipo: 'debil', cantidad: 1 },
      { etiqueta: 'unusual traffic', tipo: 'fuerte', cantidad: 1 },
    ]);
    expect(totalSenales(conteo)).toBe(5);
    expect(totalSenales(conteo, 'fuerte')).toBe(3);
    expect(totalSenales(conteo, 'debil')).toBe(2);
    expect(totalSenales(contarSenales('consent consent consent'))).toBe(0);
    expect(totalSenales(contarSenales(''))).toBe(0);
  });

  it('contar dos veces da lo mismo (sin estado escondido en las expresiones)', () => {
    expect(contarSenales('captcha')).toEqual(contarSenales('captcha'));
  });

  const base: DatosBusqueda = {
    senalesFuertes: 0,
    senalesDebiles: 0,
    filas: 20,
    codigoGosom: 0,
    importacionFatal: false,
    erroresImportacion: 0,
    codigoError: null,
    nuevos: 15,
    unidos: 5,
    cerosSeguidosAntes: 0,
  };

  it('normal -> hecha con nuevos + unidos', () => {
    expect(resultadoDeBusqueda(base)).toEqual({ tipo: 'hecha', leadsEncontrados: 20, cerosSeguidos: 0, senalesDebilesConResultados: false });
  });

  it('señales fuertes -> bloqueo aunque haya filas', () => {
    expect(resultadoDeBusqueda({ ...base, senalesFuertes: 1 })).toMatchObject({ tipo: 'bloqueo', motivo: 'senales_fuertes' });
  });

  it('primera con 0 resultados -> hecha con 0; segunda seguida -> bloqueo', () => {
    const cero = { ...base, filas: 0, nuevos: 0, unidos: 0 };
    const primera = resultadoDeBusqueda(cero);
    expect(primera).toEqual({ tipo: 'hecha', leadsEncontrados: 0, cerosSeguidos: 1, senalesDebilesConResultados: false });
    const segunda = resultadoDeBusqueda({ ...cero, cerosSeguidosAntes: primera.cerosSeguidos });
    expect(segunda).toEqual({ tipo: 'bloqueo', motivo: 'dos_sin_resultados', cerosSeguidos: 2 });
  });

  it('una con resultados en el medio reinicia la cuenta de ceros', () => {
    const r = resultadoDeBusqueda({ ...base, cerosSeguidosAntes: 1 });
    expect(r).toMatchObject({ tipo: 'hecha', cerosSeguidos: 0 });
  });

  it('gosom falló sin resultados -> error (y cuenta como cero); el segundo cero seguido es bloqueo', () => {
    const fallo = { ...base, filas: 0, nuevos: 0, unidos: 0, codigoGosom: 124 };
    expect(resultadoDeBusqueda(fallo)).toEqual({ tipo: 'error', errorMensaje: 'gosom fallo sin resultados (codigo 124)', cerosSeguidos: 1, senalesDebilesConResultados: false });
    expect(resultadoDeBusqueda({ ...fallo, cerosSeguidosAntes: 1 })).toMatchObject({ tipo: 'bloqueo' });
    expect(resultadoDeBusqueda({ ...fallo, codigoGosom: null })).toMatchObject({ errorMensaje: 'gosom fallo sin resultados (codigo desconocido)' });
  });

  it('gosom con código de error pero con filas -> hecha (se importa igual, como en Buscar)', () => {
    expect(resultadoDeBusqueda({ ...base, codigoGosom: 124 })).toMatchObject({ tipo: 'hecha' });
  });

  it('errores de importación -> error con mensaje corto, solo números y códigos', () => {
    expect(resultadoDeBusqueda({ ...base, importacionFatal: true, codigoError: '08006' })).toMatchObject({
      tipo: 'error',
      errorMensaje: 'importacion cortada (codigo 08006)',
    });
    expect(resultadoDeBusqueda({ ...base, erroresImportacion: 2, codigoError: '23505' })).toMatchObject({
      tipo: 'error',
      errorMensaje: '2 filas no se guardaron (codigo 23505)',
    });
  });
});

describe('regla de bloqueo: señales fuertes siempre, débiles solo con 0 filas', () => {
  // Del texto (inventado) del log a la decisión, igual que en procesar-cola.ts.
  const decidirConLog = (log: string, filas: number, cerosSeguidosAntes = 0) => {
    const conteo = contarSenales(log);
    return resultadoDeBusqueda({
      senalesFuertes: totalSenales(conteo, 'fuerte'),
      senalesDebiles: totalSenales(conteo, 'debil'),
      filas,
      codigoGosom: 0,
      importacionFatal: false,
      erroresImportacion: 0,
      codigoError: null,
      nuevos: filas,
      unidos: 0,
      cerosSeguidosAntes,
    });
  };

  it('captcha con filas = bloqueo', () => {
    expect(decidirConLog('pagina con captcha', 70)).toMatchObject({ tipo: 'bloqueo', motivo: 'senales_fuertes' });
  });

  it('unusual traffic con filas = bloqueo', () => {
    expect(decidirConLog('Our systems have detected unusual traffic', 70)).toMatchObject({ tipo: 'bloqueo', motivo: 'senales_fuertes' });
  });

  it('429 con filas = NO bloqueo (el caso de la primera corrida real: 70 filas, 429=12)', () => {
    const log = Array.from({ length: 12 }, (_, i) => `web-ficticia-${i}.test respondio 429`).join('\n');
    expect(decidirConLog(log, 70)).toEqual({ tipo: 'hecha', leadsEncontrados: 70, cerosSeguidos: 0, senalesDebilesConResultados: true });
  });

  it('429 con 0 filas = bloqueo', () => {
    expect(decidirConLog('status 429', 0)).toMatchObject({ tipo: 'bloqueo', motivo: 'senales_debiles_sin_resultados' });
  });

  it('blocked con filas = NO bloqueo', () => {
    expect(decidirConLog('request blocked by web-ficticia.test', 5)).toMatchObject({ tipo: 'hecha', senalesDebilesConResultados: true });
  });

  it('blocked con 0 filas = bloqueo', () => {
    expect(decidirConLog('request blocked', 0)).toMatchObject({ tipo: 'bloqueo', motivo: 'senales_debiles_sin_resultados' });
  });

  it('dos búsquedas seguidas con 0 (sin señales) = bloqueo', () => {
    const primera = decidirConLog('', 0);
    expect(primera).toMatchObject({ tipo: 'hecha', cerosSeguidos: 1 });
    expect(decidirConLog('', 0, primera.cerosSeguidos)).toMatchObject({ tipo: 'bloqueo', motivo: 'dos_sin_resultados' });
  });

  it('"consent" sola no cuenta, ni con 0 filas', () => {
    expect(decidirConLog('consent.google.com consent', 10)).toMatchObject({ tipo: 'hecha', senalesDebilesConResultados: false });
    expect(decidirConLog('consent.google.com', 0)).toMatchObject({ tipo: 'hecha', cerosSeguidos: 1 });
  });

  it('"4290" no cuenta como 429, ni con 0 filas', () => {
    expect(decidirConLog('id 4290', 10)).toMatchObject({ tipo: 'hecha', senalesDebilesConResultados: false });
    expect(decidirConLog('id 4290', 0)).toMatchObject({ tipo: 'hecha', cerosSeguidos: 1 });
  });

  it('captcha más 429 con filas: gana el bloqueo y no se cuenta como señal débil', () => {
    const r = decidirConLog('captcha y 429', 30);
    expect(r).toMatchObject({ tipo: 'bloqueo', motivo: 'senales_fuertes' });
    expect(sumarBusqueda(totalesIniciales(), r, 30, 0).busquedasConSenalesDebiles).toBe(0);
  });

  it('señal débil con filas pero error al guardar: queda en error y se cuenta como señal débil', () => {
    const r = resultadoDeBusqueda({
      senalesFuertes: 0,
      senalesDebiles: 3,
      filas: 10,
      codigoGosom: 0,
      importacionFatal: false,
      erroresImportacion: 1,
      codigoError: '23505',
      nuevos: 9,
      unidos: 0,
      cerosSeguidosAntes: 0,
    });
    expect(r).toMatchObject({ tipo: 'error', senalesDebilesConResultados: true });
    expect(sumarBusqueda(totalesIniciales(), r, 9, 0).busquedasConSenalesDebiles).toBe(1);
  });

  it('el resumen nombra el motivo del bloqueo por señales débiles', () => {
    const lineas = lineasResumenCola({
      totales: totalesIniciales(),
      quedan: 1,
      estado: 'frenada_por_bloqueo',
      bloqueo: 'senales_debiles_sin_resultados',
      relanzar: false,
    });
    expect(lineas).toContain('Bloqueo: si (blocked o 429 en el log y 0 resultados)');
  });
});

describe('tiempo y relanzamiento', () => {
  it('la primera búsqueda se hace siempre; después, solo antes del límite', () => {
    expect(puedeEmpezarOtra(0, 999, 5)).toBe(true);
    expect(puedeEmpezarOtra(1, 4.9, 5)).toBe(true);
    expect(puedeEmpezarOtra(1, 5, 5)).toBe(false);
    expect(puedeEmpezarOtra(3, 316, 315)).toBe(false);
  });

  const base = { bloqueo: false, fatal: false, cortadaPorTiempo: true, quedan: 4, busquedasEnEstaCorrida: 2 };

  it('se relanza: cortada por tiempo, quedan pendientes, sin bloqueo ni error grave', () => {
    expect(debeRelanzar(base)).toBe(true);
  });

  it('no se relanza en ningún otro caso', () => {
    expect(debeRelanzar({ ...base, cortadaPorTiempo: false })).toBe(false);
    expect(debeRelanzar({ ...base, bloqueo: true })).toBe(false);
    expect(debeRelanzar({ ...base, fatal: true })).toBe(false);
    expect(debeRelanzar({ ...base, quedan: 0 })).toBe(false);
    expect(debeRelanzar({ ...base, busquedasEnEstaCorrida: 0 })).toBe(false);
  });

  it('pausa al azar entre 20 y 60 segundos', () => {
    expect(pausaAlAzar(() => 0)).toBe(20);
    expect(pausaAlAzar(() => 0.999999)).toBe(60);
    expect(pausaAlAzar(() => 1)).toBe(60);
    expect(pausaAlAzar(() => -1)).toBe(20);
    for (let i = 0; i < 500; i++) {
      const s = pausaAlAzar();
      expect(Number.isInteger(s) && s >= 20 && s <= 60).toBe(true);
    }
  });

  it('estado de la corrida', () => {
    expect(estadoCorridaCola({ fatal: false, bloqueo: false })).toBe('ok');
    expect(estadoCorridaCola({ fatal: false, bloqueo: true })).toBe('frenada_por_bloqueo');
    expect(estadoCorridaCola({ fatal: true, bloqueo: true })).toBe('error');
  });
});

describe('totales y resumen', () => {
  it('suma por tipo y el resumen solo tiene números y estados', () => {
    let t = totalesIniciales();
    t = sumarBusqueda(t, { tipo: 'hecha', leadsEncontrados: 3, cerosSeguidos: 0, senalesDebilesConResultados: true }, 2, 1);
    t = sumarBusqueda(t, { tipo: 'error', errorMensaje: 'x', cerosSeguidos: 0, senalesDebilesConResultados: false }, 0, 0);
    t = sumarBusqueda(t, { tipo: 'bloqueo', motivo: 'dos_sin_resultados', cerosSeguidos: 2 }, 0, 0);
    expect(t).toEqual({
      busquedasHechas: 1,
      busquedasConError: 1,
      busquedasDevueltas: 1,
      busquedasConSenalesDebiles: 1,
      leadsNuevos: 2,
      leadsUnidos: 1,
    });

    const lineas = lineasResumenCola({ totales: t, quedan: 5, estado: 'frenada_por_bloqueo', bloqueo: 'dos_sin_resultados', relanzar: false });
    expect(lineas).toContain('Busquedas hechas: 1');
    expect(lineas).toContain('Busquedas con error: 1');
    expect(lineas).toContain('Busquedas con senales debiles pero con resultados (no es bloqueo): 1');
    expect(lineas).toContain('Bloqueo: si (2 busquedas seguidas sin resultados)');
    expect(lineas).toContain('Leads nuevos: 2');
    expect(lineas).toContain('Leads unidos con existentes: 1');
    expect(lineas).toContain('Pendientes que quedan (incluye errores a reintentar): 5');
    expect(lineas).toContain('Estado de la corrida: frenada_por_bloqueo');
  });
});

describe('conversión de filas', () => {
  it('filaARubro / filaAZona / filaAPendiente aceptan lo correcto y descartan lo raro', () => {
    expect(filaARubro({ id: 'r', nombre: 'A', texto_busqueda: null, activo: true, creado_en: MISMA_HORA })).toEqual(rubro('r', 'A'));
    expect(filaARubro({ id: '', nombre: 'A' })).toBeNull();
    expect(filaAZona({ id: 'z', provincia: 'P', localidad: '  ', prioridad: '2', activo: true })).toMatchObject({
      localidad: null,
      prioridad: 2,
      pais: 'Argentina',
    });
    expect(filaAZona({ id: 'z' })).toBeNull();
    expect(filaAPendiente({ id: 'p', rubro_id: 'r', zona_id: 'z', estado: 'error', intentos: 2 })).toEqual(
      pendiente('p', 'r', 'z', { estado: 'error', intentos: 2 }),
    );
    expect(filaAPendiente({ id: 'p', rubro_id: 'r', zona_id: 'z', estado: 'rarisimo' })).toBeNull();
  });
});
