import Link from 'next/link';
import { totalDePaginas, urlConFiltros, type Filtros } from '@/lib/leads/filtros';
import { Triangulo } from './triangulo';

const formato = new Intl.NumberFormat('es-AR');

export function Paginacion({ filtros, total }: { filtros: Filtros; total: number }) {
  const paginas = totalDePaginas(total);
  const actual = Math.min(filtros.pagina, paginas);
  const ir = (pagina: number) => urlConFiltros('/', { ...filtros, pagina });

  return (
    <nav className="paginacion" aria-label="Páginas">
      {actual > 1 ? (
        <Link className="boton" href={ir(actual - 1)} rel="prev">
          <Triangulo direccion="izquierda" /> Anterior
        </Link>
      ) : (
        <span className="boton deshabilitado" aria-disabled="true">
          <Triangulo direccion="izquierda" /> Anterior
        </span>
      )}
      <span className="paginacion-texto">
        Página {formato.format(actual)} de {formato.format(paginas)}
      </span>
      {actual < paginas ? (
        <Link className="boton" href={ir(actual + 1)} rel="next">
          Siguiente <Triangulo direccion="derecha" />
        </Link>
      ) : (
        <span className="boton deshabilitado" aria-disabled="true">
          Siguiente <Triangulo direccion="derecha" />
        </span>
      )}
    </nav>
  );
}
