import { Suspense } from 'react';
import { FiltrosLeads } from '@/components/filtros-leads';
import { ListaLeads } from '@/components/lista-leads';
import { Paginacion } from '@/components/paginacion';
import { leerPaginaLeads, leerRubros, leerUbicaciones } from '@/lib/leads/consultas';
import { leerFiltros, totalDePaginas, urlConFiltros } from '@/lib/leads/filtros';
import { exigirSesion } from '@/lib/supabase/server';
import { salir } from './acciones-sesion';

const formato = new Intl.NumberFormat('es-AR');

export default function PaginaLeads({ searchParams }: PageProps<'/'>) {
  return (
    <div className="pagina">
      <header className="cabecera">
        <h1 className="marca">LeadHunter</h1>
        <form action={salir}>
          <button type="submit" className="boton">
            Cerrar sesión
          </button>
        </form>
      </header>
      {/* Todo lo que depende de la sesión y de la URL se resuelve en el pedido. */}
      <Suspense fallback={<p className="cargando">Cargando leads…</p>}>
        <Panel searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Panel({ searchParams }: { searchParams: PageProps<'/'>['searchParams'] }) {
  const { supabase } = await exigirSesion();
  const filtros = leerFiltros(await searchParams);

  const [rubros, ubicaciones, pagina] = await Promise.all([
    leerRubros(supabase),
    leerUbicaciones(supabase),
    leerPaginaLeads(supabase, filtros),
  ]);

  // Si la página pedida no existe (ej. después de filtrar), se muestra la última.
  const paginas = totalDePaginas(pagina.total);
  const { leads, total } =
    filtros.pagina > paginas ? await leerPaginaLeads(supabase, { ...filtros, pagina: paginas }) : pagina;
  const filtrosVistos = { ...filtros, pagina: Math.min(filtros.pagina, paginas) };

  return (
    <main>
      <FiltrosLeads key={urlConFiltros('/', filtros, false)} filtros={filtros} rubros={rubros} ubicaciones={ubicaciones} />

      <div className="resumen">
        <p aria-live="polite">
          {formato.format(total)} {total === 1 ? 'lead' : 'leads'}
        </p>
        {total > 0 ? (
          <a className="boton boton-principal" href={urlConFiltros('/exportar', filtros, false)} download>
            Exportar CSV
          </a>
        ) : (
          <span className="boton boton-principal deshabilitado" aria-disabled="true">
            Exportar CSV
          </span>
        )}
      </div>

      <ListaLeads leads={leads} />
      <Paginacion filtros={filtrosVistos} total={total} />
    </main>
  );
}
