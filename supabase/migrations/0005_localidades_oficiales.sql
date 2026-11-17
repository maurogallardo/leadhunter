-- =====================================================================
-- LeadHunter - Migración 0005: localidades oficiales
-- ---------------------------------------------------------------------
-- Crea la tabla public.localidades_oficiales: la lista oficial de
-- localidades (API Georef de datos.gob.ar, fuente INDEC). Se usa como
-- fuente de verdad para:
--   - validar la localidad de cada lead,
--   - reparar las localidades mal guardadas,
--   - armar las zonas de búsqueda.
--
-- Guarda dos listas de Georef, marcadas en "tipo":
--   - 'localidad'        (endpoint /localidades)
--   - 'localidad_censal' (endpoint /localidades-censales)
--
-- "poblacion_municipio": población del MUNICIPIO o comuna al que pertenece
-- la localidad (Censo 2022, INDEC, tabla por gobierno local). NO es la
-- población de la localidad. Puede quedar vacía.
--
-- La carga la hace un workflow manual con la clave secreta del servidor.
-- Esta migración NO carga datos y NO modifica ni borra datos existentes.
--
-- SEGURIDAD:
-- - RLS activado.
-- - Lectura: solo usuarios con sesión iniciada (authenticated).
-- - Escritura: solo la clave secreta del servidor (service_role).
-- - anon: ningún permiso.
--
-- IMPORTANTE: esta migración NO se edita una vez aplicada.
-- =====================================================================

begin;

create table public.localidades_oficiales (
  tipo                 text        not null
                       check (tipo in ('localidad', 'localidad_censal')),
  id_oficial           text        not null,
  nombre               text        not null,
  nombre_normalizado   text        not null,
  categoria            text,
  provincia            text        not null,
  provincia_id         text        not null,
  departamento         text,
  departamento_id      text,
  municipio            text,
  municipio_id         text,
  localidad_censal     text,
  localidad_censal_id  text,
  lat                  numeric     check (lat is null or lat between -90 and 90),
  lng                  numeric     check (lng is null or lng between -180 and 180),
  poblacion_municipio  integer     check (poblacion_municipio is null or poblacion_municipio >= 0),
  fuente               text        not null,
  cargada_en           timestamptz not null default now(),
  primary key (tipo, id_oficial)
);

comment on table public.localidades_oficiales is
  'Localidades oficiales (Georef / INDEC). Fuente de verdad para validar localidades y armar zonas.';
comment on column public.localidades_oficiales.nombre_normalizado is
  'Nombre en minúsculas, sin tildes, sin caracteres invisibles y con espacios simples (lo calcula el código).';
comment on column public.localidades_oficiales.poblacion_municipio is
  'Población del municipio o comuna (Censo 2022, INDEC). No es la población de la localidad.';

-- Búsqueda por provincia + nombre normalizado (validación de localidades).
create index localidades_oficiales_provincia_nombre_idx
  on public.localidades_oficiales (provincia_id, nombre_normalizado);

-- Seguridad
alter table public.localidades_oficiales enable row level security;

revoke all on table public.localidades_oficiales from public, anon, authenticated, service_role;

-- Mauro logueado: solo leer (RLS aplica).
grant select on table public.localidades_oficiales to authenticated;

-- Workflows con la clave secreta: leer y escribir (saltea RLS).
grant select, insert, update, delete on table public.localidades_oficiales to service_role;

-- Única política: lectura para usuarios con sesión. Ninguna para anon.
create policy "localidades_oficiales: leer (logueado)"
  on public.localidades_oficiales for select to authenticated using (true);

commit;
