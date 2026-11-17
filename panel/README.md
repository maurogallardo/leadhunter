# LeadHunter · panel

Panel web de SOLO LECTURA para ver, filtrar, copiar y exportar los leads que junta el scraper.
No escribe nada en la base y no envía mensajes.

- Next.js (App Router) + Supabase Auth (mail y contraseña, un solo usuario).
- Todo pasa por el servidor del panel: la sesión se valida con `getUser()` en cada pantalla.
- Usa SOLO la clave publicable de Supabase. La seguridad real está en las reglas (RLS) de la base.
- Necesita la vista `leads_ubicaciones` (migración `supabase/migrations/0004_vista_ubicaciones_leads.sql`).

## Variables de entorno

Ver `.env.example` (nombres, sin valores). En Vercel se cargan en Settings → Environment Variables.
Nunca la clave secreta (`sb_secret_...`) ni la service_role.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Comandos

```
npm ci
npm run typecheck
npm test
npm run build
```
