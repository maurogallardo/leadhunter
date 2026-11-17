'use server';

import { redirect } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';

export interface EstadoLogin {
  error: string | null;
}

/** Mensaje genérico: no dice si el mail existe o no. */
const ERROR_LOGIN = 'No se pudo entrar. Revisá el mail y la contraseña.';

/** Entrar con mail y contraseña (Supabase Auth). */
export async function entrar(_anterior: EstadoLogin, datos: FormData): Promise<EstadoLogin> {
  const email = String(datos.get('email') ?? '').trim();
  const password = String(datos.get('password') ?? '');
  if (email === '' || password === '' || email.length > 320 || password.length > 1000) return { error: ERROR_LOGIN };

  try {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: ERROR_LOGIN };
  } catch {
    return { error: ERROR_LOGIN };
  }
  redirect('/');
}

/** Cerrar sesión. */
export async function salir(): Promise<void> {
  try {
    const supabase = await crearClienteServidor();
    await supabase.auth.signOut();
  } finally {
    redirect('/login');
  }
}
