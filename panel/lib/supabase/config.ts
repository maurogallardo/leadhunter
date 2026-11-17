// Variables de entorno del panel. SOLO la URL del proyecto y la clave
// PUBLICABLE (sb_publishable_...). Nunca la clave secreta ni service_role:
// la seguridad real está en las reglas (RLS) de la base.

export interface ConfigSupabase {
  url: string;
  clavePublicable: string;
}

export function leerConfigSupabase(): ConfigSupabase {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const clavePublicable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  if (url === '' || clavePublicable === '') {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  }
  // Defensa: si por error se cargó la clave secreta, no se usa.
  if (clavePublicable.startsWith('sb_secret_')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tiene una clave secreta. Usá la publicable.');
  }
  return { url, clavePublicable };
}
