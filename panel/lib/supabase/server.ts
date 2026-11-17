import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { leerConfigSupabase } from './config';

/**
 * Cliente de Supabase para el servidor (páginas, Server Actions y rutas).
 * Se crea uno nuevo en cada pedido: nunca se guarda en una variable global.
 */
export async function crearClienteServidor() {
  // Primero las cookies: así Next sabe que esto se resuelve en cada pedido
  // (nunca al compilar).
  const almacen = await cookies();
  const { url, clavePublicable } = leerConfigSupabase();
  return createServerClient(url, clavePublicable, {
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(cookiesNuevas) {
        try {
          for (const { name, value, options } of cookiesNuevas) almacen.set(name, value, options);
        } catch {
          // Llamado desde un Server Component (no puede escribir cookies).
          // No pasa nada: proxy.ts ya renueva la sesión en cada pedido.
        }
      },
    },
  });
}

/**
 * Exige sesión. Valida el usuario contra el servidor de Supabase con
 * getUser() (no confía en la cookie sin validar). Sin sesión: al login.
 */
export async function exigirSesion() {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect('/login');
  return { supabase, usuario: data.user };
}
