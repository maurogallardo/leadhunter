// Corre antes de cada pantalla. Hace dos cosas:
// 1. Renueva la sesión de Supabase (las cookies) para que no se corte sola.
// 2. Sin sesión, manda al login; con sesión, el login manda al panel.
// Igual, cada pantalla vuelve a validar la sesión en el servidor con getUser().

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { leerConfigSupabase } from '@/lib/supabase/config';

export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const { url, clavePublicable } = leerConfigSupabase();
  const supabase = createServerClient(url, clavePublicable, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesNuevas, encabezados) {
        for (const { name, value } of cookiesNuevas) request.cookies.set(name, value);
        respuesta = NextResponse.next({ request });
        for (const { name, value, options } of cookiesNuevas) respuesta.cookies.set(name, value, options);
        for (const [clave, valor] of Object.entries(encabezados ?? {})) respuesta.headers.set(clave, valor);
      },
    },
  });

  // No poner código entre createServerClient y getUser (lo pide Supabase).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const esLogin = ruta === '/login';

  if (!user && !esLogin) return redirigir(request, respuesta, '/login');
  if (user && esLogin) return redirigir(request, respuesta, '/');
  return respuesta;
}

/** Redirige copiando las cookies renovadas (si no, la sesión se desincroniza). */
function redirigir(request: NextRequest, respuesta: NextResponse, destino: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = destino;
  url.search = '';
  const redireccion = NextResponse.redirect(url);
  for (const cookie of respuesta.cookies.getAll()) redireccion.cookies.set(cookie);
  for (const encabezado of ['cache-control', 'expires', 'pragma']) {
    const valor = respuesta.headers.get(encabezado);
    if (valor) redireccion.headers.set(encabezado, valor);
  }
  return redireccion;
}

export const config = {
  matcher: [
    // Todo menos archivos estáticos de Next y el ícono.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
