-- =====================================================================
-- LeadHunter - Migración 0001: estructura inicial
-- ---------------------------------------------------------------------
-- Crea las 5 tablas (rubros, zonas, leads, cola_busquedas, corridas),
-- el trigger de "actualizado_en" en leads, y la seguridad (RLS + permisos).
--
-- Todo va en UNA transacción: si algo falla, no queda nada a medias.
--
-- IMPORTANTE: esta migración NO se edita una vez aplicada.
-- Cualquier cambio futuro va en una migración nueva (0002, 0003, ...).
--
-- SOBRE LAS CLAVES:
-- - Mauro entra desde el panel con su usuario (rol "authenticated").
-- - El scraper de GitHub Actions entra con la clave secreta
--   (service_role / sb_secret_...). Esa clave SALTEA RLS, pero igual
--   necesita permisos (GRANT) en cada tabla: por eso se los damos abajo.
-- - La clave secreta NUNCA va en el frontend, ni en el repo (es público),
--   ni pegada en un chat. Solo vive en los "Secrets" de GitHub.
-- - El rol "anon" (visitante sin login) NO tiene ningún permiso.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) RUBROS: tipos de negocio que buscamos
-- ---------------------------------------------------------------------
create table public.rubros (
  id         uuid        primary key default gen_random_uuid(),
  nombre     text        not null unique,
  activo     boolean     not null default true,
  creado_en  timestamptz not null default now()
);

-- Carga inicial de los 7 rubros
insert into public.rubros (nombre) values
  ('Distribuidoras de alimentos y bebidas'),
  ('Mayoristas'),
  ('Supermercados'),
  ('Autoservicios y despensas'),
  ('Almacenes y fiambrerías'),
  ('Kioscos y polirrubros'),
  ('Panaderías y fábricas de pastas');

-- ---------------------------------------------------------------------
-- 2) ZONAS: lugares donde buscar
--    prioridad: número más chico = se busca antes
-- ---------------------------------------------------------------------
create table public.zonas (
  id         uuid        primary key default gen_random_uuid(),
  pais       text        not null default 'Argentina',
  provincia  text        not null,
  localidad  text,
  barrio     text,
  lat        numeric,
  lng        numeric,
  prioridad  integer     not null default 100,
  activo     boolean     not null default true,
  creado_en  timestamptz not null default now()
);

-- Evita zonas repetidas. Los vacíos (null) cuentan como texto vacío,
-- así "Córdoba / sin localidad" no se puede cargar dos veces.
create unique index zonas_unica_idx on public.zonas (
  pais,
  provincia,
  coalesce(localidad, ''),
  coalesce(barrio, '')
);

-- ---------------------------------------------------------------------
-- 3) LEADS: los negocios encontrados
--    - Teléfonos en formato internacional (+54...). La normalización la
--      hace el código del scraper, no este SQL.
--    - fuentes: guarda de qué fuente salió cada dato (ej. {"celular": "gosom"}).
--    - Sin campo "estado" (descartado por Mauro).
--    - Sin restricción única en teléfono ni en sitio web: las cadenas
--      comparten web y la unión de repetidos se resuelve en la Etapa 3.
-- ---------------------------------------------------------------------
create table public.leads (
  id                uuid        primary key default gen_random_uuid(),
  nombre            text        not null,
  persona_contacto  text,
  rubro_id          uuid        references public.rubros (id),
  telefono_fijo     text,
  celular           text,
  whatsapp          text,
  email             text,
  instagram         text,
  sitio_web         text,
  direccion         text,
  localidad         text,
  provincia         text,
  pais              text        not null default 'Argentina',
  lat               numeric,
  lng               numeric,
  rating            numeric,
  resenas           integer,
  google_place_id   text,
  fuentes           jsonb       not null default '{}'::jsonb,
  notas             text,
  descartado        boolean     not null default false,
  motivo_descarte   text,
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now()
);

-- Un mismo lugar de Google no se carga dos veces (solo si tiene place_id)
create unique index leads_google_place_id_unico_idx
  on public.leads (google_place_id)
  where google_place_id is not null;

-- Índices para buscar rápido
create index leads_celular_idx       on public.leads (celular);
create index leads_telefono_fijo_idx on public.leads (telefono_fijo);
create index leads_provincia_idx     on public.leads (provincia);
create index leads_localidad_idx     on public.leads (localidad);
create index leads_rubro_id_idx      on public.leads (rubro_id);
create index leads_descartado_idx    on public.leads (descartado);

-- ---------------------------------------------------------------------
-- 4) COLA_BUSQUEDAS: lista de búsquedas pendientes (rubro x zona x fuente)
-- ---------------------------------------------------------------------
create table public.cola_busquedas (
  id                 uuid        primary key default gen_random_uuid(),
  rubro_id           uuid        not null references public.rubros (id),
  zona_id            uuid        not null references public.zonas (id),
  fuente             text        not null default 'gosom',
  estado             text        not null default 'pendiente'
                     check (estado in ('pendiente', 'en_curso', 'hecha', 'error')),
  intentos           integer     not null default 0,
  leads_encontrados  integer,
  error_mensaje      text,
  iniciada_en        timestamptz,
  terminada_en       timestamptz,
  creado_en          timestamptz not null default now()
);

-- No encolar dos veces la misma búsqueda
create unique index cola_busquedas_unica_idx
  on public.cola_busquedas (rubro_id, zona_id, fuente);

create index cola_busquedas_estado_idx on public.cola_busquedas (estado);

-- ---------------------------------------------------------------------
-- 5) CORRIDAS: registro de cada ejecución del scraper
--    "detalle" es para notas técnicas: NUNCA datos de negocios.
-- ---------------------------------------------------------------------
create table public.corridas (
  id                 uuid        primary key default gen_random_uuid(),
  fuente             text        not null,
  iniciada_en        timestamptz not null default now(),
  terminada_en       timestamptz,
  estado             text        not null default 'en_curso'
                     check (estado in ('en_curso', 'ok', 'error', 'frenada_por_bloqueo')),
  busquedas_hechas   integer     not null default 0,
  leads_nuevos       integer     not null default 0,
  bloqueo_detectado  boolean     not null default false,
  detalle            text
);

-- ---------------------------------------------------------------------
-- 6) TRIGGER: actualizar "actualizado_en" en cada cambio de un lead
-- ---------------------------------------------------------------------
create function public.fijar_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger leads_fijar_actualizado_en
  before update on public.leads
  for each row
  execute function public.fijar_actualizado_en();

-- Nadie puede llamar a esta función a mano (el trigger sigue funcionando).
revoke all on function public.fijar_actualizado_en() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7) SEGURIDAD: RLS activado en las 5 tablas
--    (Supabase ya lo activa solo; lo dejamos explícito igual)
-- ---------------------------------------------------------------------
alter table public.rubros         enable row level security;
alter table public.zonas          enable row level security;
alter table public.leads          enable row level security;
alter table public.cola_busquedas enable row level security;
alter table public.corridas       enable row level security;

-- ---------------------------------------------------------------------
-- 8) SEGURIDAD: permisos (GRANT)
--    Primero sacamos TODO a todos los roles de la Data API, y después
--    damos solo lo justo. Ningún permiso para anon ni public.
--    Nota: no hay secuencias (los id son uuid), así que no hay nada
--    que revocar ahí.
-- ---------------------------------------------------------------------
revoke all on table
  public.rubros, public.zonas, public.leads, public.cola_busquedas, public.corridas
  from public, anon, authenticated, service_role;

-- Mauro logueado: leer, crear, editar y borrar (RLS aplica)
grant select, insert, update, delete on table
  public.rubros, public.zonas, public.leads, public.cola_busquedas, public.corridas
  to authenticated;

-- Scraper (clave secreta): leer, crear, editar y borrar (saltea RLS)
grant select, insert, update, delete on table
  public.rubros, public.zonas, public.leads, public.cola_busquedas, public.corridas
  to service_role;

-- ---------------------------------------------------------------------
-- 9) SEGURIDAD: políticas RLS, una por operación, solo "authenticated".
--    Usamos "true" porque hay un único usuario (Mauro) y el registro
--    abierto está desactivado: cualquiera logueado es Mauro.
--    No hay ninguna política para anon.
-- ---------------------------------------------------------------------

-- rubros
create policy "rubros: leer (logueado)"   on public.rubros for select to authenticated using (true);
create policy "rubros: crear (logueado)"  on public.rubros for insert to authenticated with check (true);
create policy "rubros: editar (logueado)" on public.rubros for update to authenticated using (true) with check (true);
create policy "rubros: borrar (logueado)" on public.rubros for delete to authenticated using (true);

-- zonas
create policy "zonas: leer (logueado)"   on public.zonas for select to authenticated using (true);
create policy "zonas: crear (logueado)"  on public.zonas for insert to authenticated with check (true);
create policy "zonas: editar (logueado)" on public.zonas for update to authenticated using (true) with check (true);
create policy "zonas: borrar (logueado)" on public.zonas for delete to authenticated using (true);

-- leads
create policy "leads: leer (logueado)"   on public.leads for select to authenticated using (true);
create policy "leads: crear (logueado)"  on public.leads for insert to authenticated with check (true);
create policy "leads: editar (logueado)" on public.leads for update to authenticated using (true) with check (true);
create policy "leads: borrar (logueado)" on public.leads for delete to authenticated using (true);

-- cola_busquedas
create policy "cola_busquedas: leer (logueado)"   on public.cola_busquedas for select to authenticated using (true);
create policy "cola_busquedas: crear (logueado)"  on public.cola_busquedas for insert to authenticated with check (true);
create policy "cola_busquedas: editar (logueado)" on public.cola_busquedas for update to authenticated using (true) with check (true);
create policy "cola_busquedas: borrar (logueado)" on public.cola_busquedas for delete to authenticated using (true);

-- corridas
create policy "corridas: leer (logueado)"   on public.corridas for select to authenticated using (true);
create policy "corridas: crear (logueado)"  on public.corridas for insert to authenticated with check (true);
create policy "corridas: editar (logueado)" on public.corridas for update to authenticated using (true) with check (true);
create policy "corridas: borrar (logueado)" on public.corridas for delete to authenticated using (true);

commit;
