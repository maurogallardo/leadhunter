import { describe, expect, it } from 'vitest';
import {
  FILTROS_VACIOS,
  aplicarCondiciones,
  condicionesDeFiltros,
  filtrosAParametros,
  leerFiltros,
  localidadesDe,
  patronBusqueda,
  provinciasDe,
  rangoDePagina,
  totalDePaginas,
  urlConFiltros,
  type ConsultaFiltrable,
} from './filtros';

const RUBRO = '0f1e2d3c-4b5a-4968-8776-655443322110';

describe('leerFiltros', () => {
  it('sin parámetros: todo vacío, página 1, sin descartados', () => {
    expect(leerFiltros({})).toEqual(FILTROS_VACIOS);
  });

  it('lee todos los filtros desde la URL', () => {
    const f = leerFiltros(
      new URLSearchParams(
        `provincia=Provincia+Inventada&localidad=Villa+Ficticia&rubro=${RUBRO}&celular=1&mail=1&whatsapp=1&instagram=1&descartados=1&q=almacen&pagina=3`,
      ),
    );
    expect(f).toEqual({
      provincia: 'Provincia Inventada',
      localidad: 'Villa Ficticia',
      rubro: RUBRO,
      conCelular: true,
      conEmail: true,
      conWhatsapp: true,
      conInstagram: true,
      mostrarDescartados: true,
      busqueda: 'almacen',
      pagina: 3,
    });
  });

  it('ignora rubro que no es uuid, página inválida e interruptores con otro valor', () => {
    const f = leerFiltros({ rubro: "1' or 1=1", pagina: '-2', celular: 'true', q: '   ' });
    expect(f.rubro).toBeNull();
    expect(f.pagina).toBe(1);
    expect(f.conCelular).toBe(false);
    expect(f.busqueda).toBeNull();
    expect(leerFiltros({ pagina: '2.5' }).pagina).toBe(1);
    expect(leerFiltros({ pagina: 'abc' }).pagina).toBe(1);
  });

  it('acepta arrays (toma el primero) y limpia espacios', () => {
    expect(leerFiltros({ provincia: ['  Uno  Dos ', 'Otra'] }).provincia).toBe('Uno Dos');
  });

  it('corta textos largos', () => {
    expect(leerFiltros({ q: 'x'.repeat(500) }).busqueda).toHaveLength(100);
  });
});

describe('filtrosAParametros y urlConFiltros', () => {
  it('ida y vuelta da los mismos filtros', () => {
    const f = { ...FILTROS_VACIOS, provincia: 'Provincia Ñandú', rubro: RUBRO, conEmail: true, busqueda: 'café & té', pagina: 4 };
    expect(leerFiltros(filtrosAParametros(f))).toEqual(f);
  });

  it('sin filtros, la URL queda limpia; la página 1 no se escribe', () => {
    expect(urlConFiltros('/', FILTROS_VACIOS)).toBe('/');
    expect(urlConFiltros('/', { ...FILTROS_VACIOS, pagina: 1, conCelular: true })).toBe('/?celular=1');
  });

  it('puede omitir la página (para exportar)', () => {
    expect(urlConFiltros('/exportar', { ...FILTROS_VACIOS, pagina: 7, conInstagram: true }, false)).toBe('/exportar?instagram=1');
  });
});

describe('paginación', () => {
  it('100 por página', () => {
    expect(rangoDePagina(1)).toEqual({ desde: 0, hasta: 99 });
    expect(rangoDePagina(3)).toEqual({ desde: 200, hasta: 299 });
    expect(rangoDePagina(0)).toEqual({ desde: 0, hasta: 99 });
  });

  it('total de páginas (mínimo 1)', () => {
    expect(totalDePaginas(0)).toBe(1);
    expect(totalDePaginas(100)).toBe(1);
    expect(totalDePaginas(101)).toBe(2);
  });
});

describe('patronBusqueda', () => {
  const coincide = (busqueda: string, nombre: string): boolean => {
    const patron = patronBusqueda(busqueda);
    if (patron === null) throw new Error('sin patrón');
    return new RegExp(patron, 'i').test(nombre);
  };

  it('no distingue tildes ni mayúsculas', () => {
    expect(coincide('cordoba', 'Almacén Córdoba Ficticio')).toBe(true);
    expect(coincide('CÓRDOBA', 'almacen cordoba ficticio')).toBe(true);
    expect(coincide('almacen', 'ALMACÉN DE PRUEBA')).toBe(true);
    expect(coincide('pena', 'La Peña Inventada')).toBe(true);
    expect(coincide('panaderia', 'Panadería Ejemplo')).toBe(true);
    expect(coincide('kiosco', 'Almacén de Prueba')).toBe(false);
  });

  it('escapa los caracteres especiales (se buscan tal cual)', () => {
    expect(coincide('a.b', 'axb')).toBe(false);
    expect(coincide('a.b', 'a.b')).toBe(true);
    expect(coincide('(prueba)', 'Negocio (prueba)')).toBe(true);
    expect(coincide('1+1', '1+1 Kiosco')).toBe(true);
    expect(coincide('[x]', 'x')).toBe(false);
  });

  it('vacío -> null', () => {
    expect(patronBusqueda(null)).toBeNull();
    expect(patronBusqueda('   ')).toBeNull();
  });
});

describe('condicionesDeFiltros', () => {
  it('por defecto solo oculta los descartados', () => {
    expect(condicionesDeFiltros(FILTROS_VACIOS)).toEqual([{ op: 'igual', columna: 'descartado', valor: false }]);
  });

  it('"Mostrar descartados" saca esa condición', () => {
    expect(condicionesDeFiltros({ ...FILTROS_VACIOS, mostrarDescartados: true })).toEqual([]);
  });

  it('arma todas las condiciones', () => {
    const c = condicionesDeFiltros({
      ...FILTROS_VACIOS,
      provincia: 'Provincia Inventada',
      localidad: 'Villa Ficticia',
      rubro: RUBRO,
      conCelular: true,
      conEmail: true,
      conWhatsapp: true,
      conInstagram: true,
      busqueda: 'ab',
    });
    expect(c).toEqual([
      { op: 'igual', columna: 'descartado', valor: false },
      { op: 'igual', columna: 'provincia', valor: 'Provincia Inventada' },
      { op: 'igual', columna: 'localidad', valor: 'Villa Ficticia' },
      { op: 'igual', columna: 'rubro_id', valor: RUBRO },
      { op: 'conDato', columna: 'celular' },
      { op: 'conDato', columna: 'email' },
      { op: 'conDato', columna: 'whatsapp' },
      { op: 'conDato', columna: 'instagram' },
      { op: 'regexSinMayusculas', columna: 'nombre', patron: '[aáàäâãAÁÀÄÂÃ]b' },
    ]);
  });

  it('aplicarCondiciones llama a la base con los operadores correctos', () => {
    class Falsa implements ConsultaFiltrable<Falsa> {
      llamadas: string[] = [];
      eq(c: string, v: string | boolean): Falsa {
        this.llamadas.push(`eq ${c} ${String(v)}`);
        return this;
      }
      not(c: string, o: string, v: null): Falsa {
        this.llamadas.push(`not ${c} ${o} ${String(v)}`);
        return this;
      }
      neq(c: string, v: string): Falsa {
        this.llamadas.push(`neq ${c} '${v}'`);
        return this;
      }
      regexIMatch(c: string, p: string): Falsa {
        this.llamadas.push(`imatch ${c} ${p}`);
        return this;
      }
    }
    const falsa = new Falsa();
    aplicarCondiciones(falsa, condicionesDeFiltros({ ...FILTROS_VACIOS, conCelular: true, busqueda: 'x' }));
    expect(falsa.llamadas).toEqual(['eq descartado false', 'not celular is null', "neq celular ''", 'imatch nombre x']);
  });
});

describe('opciones de provincia y localidad', () => {
  const ubicaciones = [
    { provincia: 'Provincia B', localidad: 'Zeta' },
    { provincia: 'Provincia A', localidad: 'Ála' },
    { provincia: 'Provincia A', localidad: 'Beta' },
    { provincia: 'Provincia B', localidad: 'Beta' },
    { provincia: null, localidad: 'Suelta' },
    { provincia: 'Provincia C', localidad: null },
  ];

  it('provincias sin repetir, ordenadas', () => {
    expect(provinciasDe(ubicaciones)).toEqual(['Provincia A', 'Provincia B', 'Provincia C']);
  });

  it('localidades de una provincia, o todas', () => {
    expect(localidadesDe(ubicaciones, 'Provincia A')).toEqual(['Ála', 'Beta']);
    expect(localidadesDe(ubicaciones, null)).toEqual(['Ála', 'Beta', 'Suelta', 'Zeta']);
  });
});
