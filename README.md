# LeadHunter

Herramienta personal para conseguir leads de negocios de alimentos y distribución en Argentina.
Usa Google Maps (con el scraper gosom/google-maps-scraper) para encontrar negocios y sus datos de contacto.
Los leads (resultados, CSV, teléfonos, direcciones) NUNCA se suben a este repositorio: es público.
Las claves y archivos `.env` tampoco se suben; están excluidos en `.gitignore`.

## Cola de búsquedas

La cola recorre búsquedas pendientes de a una: cada pendiente es **un rubro + una zona**
(tabla `cola_busquedas`). Hay dos workflows manuales (GitHub → Actions → Run workflow).
Los dos solo imprimen números.

### 1. Cargar zonas (a mano, con SQL)

Las zonas son localidades. Se cargan en el SQL Editor de Supabase. Ejemplo con una zona:
`supabase/ejemplos/zona_de_muestra.sql`.

```sql
insert into public.zonas (pais, provincia, localidad, prioridad)
values ('Argentina', 'Córdoba', 'Córdoba', 1)
on conflict do nothing;
```

- `prioridad`: 1 se busca antes que 2.
- Para dejar de buscar una zona o un rubro sin borrarlo: `activo = false`.
- Texto de búsqueda de un rubro (opcional): columna `rubros.texto_busqueda`. Si está vacía se usa el nombre.
  La consulta queda así: `<texto del rubro> en <localidad>, <provincia>, <país>`.
- Para borrar la prueba (zona de muestra y sus pendientes): `supabase/ejemplos/borrar_prueba_cola.sql`.

### 2. "Armar cola"

Crea un pendiente por cada rubro activo × zona activa que todavía no esté en la cola.
Correrlo dos veces no repite nada. Imprime: zonas activas, rubros activos, pendientes nuevos, ya existían.

### 3. "Procesar cola"

- Toma los pendientes en orden: zonas por prioridad y, dentro de cada zona, rubros por orden
  de creación (si empatan, alfabético).
- Por cada uno corre gosom (profundidad fija, apunta a ~100 resultados) e importa a Supabase con
  la misma limpieza y reglas de duplicados que "Buscar".
- Marca el pendiente como `hecha` (con `leads_encontrados`) o `error` (con un mensaje corto).
  Un pendiente con error se reintenta en corridas siguientes hasta 3 intentos en total.
- Pausa al azar de 20 a 60 segundos entre búsquedas. No tiene tope de búsquedas.
- **Bloqueo de Google** (captcha, blocked, 429 o unusual traffic en el log de gosom, o dos búsquedas
  seguidas sin resultados): frena todo, la corrida queda `frenada_por_bloqueo` y la búsqueda en curso
  vuelve a `pendiente`. No sigue hasta que se lance de nuevo a mano.
- **Límite de 6 horas de GitHub:** a los 315 minutos (input `minutos_antes_de_relanzar`) deja de empezar
  búsquedas y, si quedan pendientes y no hubo bloqueo, se relanza sola.
  Si el relanzamiento falla por permisos, revisar en GitHub
  **Settings → Actions → General → Workflow permissions**: tiene que permitir que los workflows
  lancen otros (probar con "Read and write permissions").
- Si una corrida se corta a la fuerza (cancelada), la búsqueda que estaba en curso pasa a `error`
  al empezar la corrida siguiente (cuenta como un intento).
