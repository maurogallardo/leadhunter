// Exportar CSV: TODOS los leads que coinciden con los filtros de la URL
// (no solo la página). Se leen de la base en tandas de 1000 y se van
// mandando al navegador a medida que llegan (así no hay límite de tamaño).

import { recorrerLeads } from '@/lib/leads/consultas';
import { BOM, encabezadoCsv, filasCsv, nombreArchivoCsv } from '@/lib/leads/csv';
import { leerFiltros } from '@/lib/leads/filtros';
import { crearClienteServidor } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Leer el pedido primero: esta ruta se resuelve siempre en el momento.
  const filtros = leerFiltros(request.nextUrl.searchParams);
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return new Response('Sesión vencida. Volvé a entrar.', { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  const codificador = new TextEncoder();
  const tandas = recorrerLeads(supabase, filtros);

  const cuerpo = new ReadableStream<Uint8Array>({
    start(controlador) {
      controlador.enqueue(codificador.encode(BOM + encabezadoCsv()));
    },
    async pull(controlador) {
      try {
        const siguiente = await tandas.next();
        if (siguiente.done) controlador.close();
        else controlador.enqueue(codificador.encode(filasCsv(siguiente.value)));
      } catch {
        // Corta la descarga: el navegador la marca como fallida
        // (mejor que un CSV incompleto que parece completo).
        controlador.error(new Error('No se pudo leer los leads.'));
      }
    },
    async cancel() {
      await tandas.return(undefined);
    },
  });

  return new Response(cuerpo, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombreArchivoCsv(new Date())}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
