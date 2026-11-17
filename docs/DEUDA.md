# Deuda del proyecto (LeadHunter)

Temas pendientes conocidos, ordenados por riesgo (primero los más altos).
Cuando un tema se resuelve, se cambia su estado a "cerrado" con la fecha.

| # | Tema | Riesgo | Fecha | Estado |
|---|------|--------|-------|--------|
| 1 | Localidades mal guardadas | medio | 2026-11-16 | abierto |
| 2 | Sin copias automáticas en el plan Free de Supabase | medio | 2026-11-16 | abierto |
| 3 | Claves y contraseñas a renovar | medio | 2026-11-16 | abierto |
| 4 | Bloqueo de Google y relanzamiento sin verificar en un caso real | medio | 2026-11-16 | abierto |
| 5 | Workflows programados de GitHub pueden retrasarse o desactivarse | bajo | 2026-11-16 | abierto |
| 6 | Faltan zonas de Córdoba fuera de la capital | bajo | 2026-11-16 | abierto |
| 7 | Unos 70 resultados como máximo por búsqueda | bajo | 2026-11-16 | abierto |
| 8 | Datos de baja calidad | bajo | 2026-11-16 | abierto |
| 9 | Etapas 6b y 6c: exportación diaria y descarga automática | bajo | 2026-11-16 | abierto |
| 10 | Etapas futuras (7 a 10) | bajo | 2026-11-16 | abierto |

---

## Riesgo medio

### 1. Localidades mal guardadas

- **Qué es:** la columna `localidad` de `leads` tiene códigos postales argentinos (ej. X5000AVJ) o fragmentos (AAU, AES, FDC…) en lugar del nombre real de la localidad. Probable causa: la regla que extrae la localidad de la dirección.
- **Por qué importa:** el filtro de localidad del panel y la exportación muestran valores que no sirven, y los leads de una misma localidad quedan repartidos en opciones distintas.
- **Qué hay que hacer:** corregir la regla y reparar los leads ya guardados, exportando antes la tabla.
- **Riesgo:** medio.
- **Fecha:** 2026-11-16.
- **Estado:** abierto.

### 2. Sin copias automáticas en el plan Free de Supabase

- **Qué es:** el plan Free de Supabase no hace copias de seguridad automáticas de la base.
- **Por qué importa:** si se borra o se rompe algo, no hay de dónde recuperar los leads.
- **Qué hay que hacer:** exportar la base a mano una vez por semana hasta pasar a Pro.
- **Riesgo:** medio.
- **Fecha:** 2026-11-16.
- **Estado:** abierto.

### 3. Claves y contraseñas a renovar

- **Qué es:** la clave `sb_secret` del proyecto viejo "Scraping MAU" sigue vigente, y una contraseña se pegó en un chat al inicio.
- **Por qué importa:** una clave o contraseña que estuvo a la vista puede ser usada por otra persona.
- **Qué hay que hacer:** regenerar la clave `sb_secret` del proyecto "Scraping MAU" y cambiar esa contraseña.
- **Riesgo:** medio.
- **Fecha:** 2026-11-16.
- **Estado:** abierto.

### 4. Bloqueo de Google y relanzamiento sin verificar en un caso real

- **Qué es:** no se vio todavía cómo se comporta "Procesar cola" ante un bloqueo real de Google, ni el relanzamiento automático a los 315 minutos.
- **Por qué importa:** si alguno falla, la cola puede quedar frenada sin aviso o seguir buscando durante un bloqueo.
- **Qué hay que hacer:** revisar el resumen de la primera corrida que llegue a un bloqueo o a los 315 minutos.
- **Riesgo:** medio.
- **Fecha:** 2026-11-16.
- **Estado:** abierto.

## Riesgo bajo

### 5. Workflows programados de GitHub pueden retrasarse o desactivarse

- **Qué es:** GitHub puede retrasar los workflows programados y los desactiva después de 60 días sin actividad en el repo.
- **Por qué importa:** una tarea programada podría dejar de correr sin que nadie lo note.
- **Qué hay que hacer:** tenerlo en cuenta cuando se agreguen tareas programadas (por ejemplo, la exportación diaria) y revisar que sigan activas.
- **Riesgo:** bajo.
- **Fecha:** 2026-11-16.
- **Estado:** abierto.

### 6. Faltan zonas de Córdoba fuera de la capital

- **Qué es:** solo existe la zona Córdoba capital. Faltan Río Cuarto, Río Tercero, las sierras, etc.
- **Por qué importa:** la cola no busca negocios en el resto de la provincia.
- **Qué hay que hacer:** cargarlas como datos desde una lista oficial.
- **Riesgo:** bajo.
- **Fecha:** 2026-11-16.
- **Estado:** abierto.

### 7. Unos 70 resultados como máximo por búsqueda

- **Qué es:** cada búsqueda devuelve unos 70 resultados como máximo.
- **Por qué importa:** en zonas grandes quedan negocios sin encontrar.
- **Qué hay que hacer:** evaluar más profundidad o zonas más chicas.
- **Riesgo:** bajo.
- **Fecha:** 2026-11-16.
- **Estado:** abierto.

### 8. Datos de baja calidad

- **Qué es:** hay mails basura (ej. tu@email.com) y señales débiles falsas de bloqueo.
- **Por qué importa:** ensucian la lista de leads y los resúmenes de las corridas.
- **Qué hay que hacer:** filtrar esos mails y revisar las señales débiles.
- **Riesgo:** bajo.
- **Fecha:** 2026-11-16.
- **Estado:** abierto.

### 9. Etapas 6b y 6c: exportación diaria y descarga automática

- **Qué es:**
  - Etapa 6b: exportación diaria automática a las 00:00 (hora Argentina) a Supabase Storage privado, con lista "Exportaciones" en el panel.
  - Etapa 6c: descarga automática a la PC de Mauro.
- **Por qué importa:** deja una copia diaria de los leads sin hacerlo a mano.
- **Riesgo:** bajo.
- **Fecha:** 2026-11-16.
- **Estado:** abierto.

### 10. Etapas futuras (7 a 10)

- **Qué es:**
  - Etapa 7: botón "Buscar ahora".
  - Etapa 8: rastreo de sitios web para mail, WhatsApp e Instagram.
  - Etapa 9: fuentes OSM/Overture.
  - Etapa 10: búsqueda completa de Córdoba y otras provincias.
- **Por qué importa:** son las próximas mejoras planeadas.
- **Riesgo:** bajo.
- **Fecha:** 2026-11-16.
- **Estado:** abierto.
