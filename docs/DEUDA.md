# Deuda del proyecto (LeadHunter)

Temas pendientes conocidos, ordenados por riesgo (primero los más altos).
Cuando un tema se resuelve, se cambia su estado a "cerrado" con la fecha.

| # | Tema | Riesgo | Fecha | Estado |
|---|------|--------|-------|--------|
| 1 | Localidades mal guardadas | medio | 2026-11-16 | cerrado (2026-11-17) |
| 2 | Sin copias automáticas en el plan Free de Supabase | medio | 2026-11-16 | abierto |
| 3 | Claves y contraseñas a renovar | medio | 2026-11-16 | abierto |
| 4 | Bloqueo de Google y relanzamiento sin verificar en un caso real | medio | 2026-11-16 | abierto |
| 11 | La regla de "dos búsquedas seguidas sin resultados" frena la cola en pueblos chicos | medio | 2026-11-16 | abierto |
| 5 | Workflows programados de GitHub pueden retrasarse o desactivarse | bajo | 2026-11-16 | abierto |
| 6 | Faltan zonas de Córdoba fuera de la capital | bajo | 2026-11-16 | abierto |
| 7 | Unos 70 resultados como máximo por búsqueda | bajo | 2026-11-16 | abierto |
| 8 | Datos de baja calidad | bajo | 2026-11-16 | abierto |
| 9 | Etapas 6b y 6c: exportación diaria y descarga automática | bajo | 2026-11-16 | abierto |
| 10 | Etapas futuras (7 a 10) | bajo | 2026-11-16 | abierto |
| 12 | 7 localidades censales con nombre repetido no se cargan como zona | bajo | 2026-11-16 | abierto |
| 13 | Copia fija del censo 2022 en el repo; reemplazar a mano si INDEC publica una corrección | bajo | 2026-11-17 | abierto |
| 14 | Localidad "Paraje" en el panel: revisar si es un nombre real o un resto de antes de la regla nueva | bajo | 2026-11-17 | abierto |
| 15 | docs/DECISIONES.md no existe aunque la constitución manda leerlo | bajo | 2026-11-17 | abierto |

---

## Riesgo medio

### 1. Localidades mal guardadas

- **Qué es:** la columna `localidad` de `leads` tiene códigos postales argentinos (ej. X5000AVJ) o fragmentos (AAU, AES, FDC…) en lugar del nombre real de la localidad. Probable causa: la regla que extrae la localidad de la dirección.
- **Por qué importa:** el filtro de localidad del panel y la exportación muestran valores que no sirven, y los leads de una misma localidad quedan repartidos en opciones distintas.
- **Qué hay que hacer:** corregir la regla y reparar los leads ya guardados, exportando antes la tabla.
- **Riesgo:** medio.
- **Fecha:** 2026-11-16.
- **Estado:** cerrado (2026-11-17).
- **Verificación (2026-11-17):** lista oficial cargada con "Cargar localidades oficiales" (1046 guardadas); reparación aplicada con "Reparar localidades" (30 actualizadas, errores 0); Mauro revisó el desplegable de Localidad del panel desde el celular: sin códigos.
- **Avance (2026-11-17):**
  - La causa real no es una regla nuestra sobre la dirección: gosom toma la localidad ("city") de una posición fija de los datos de Google, que a veces trae el código postal.
  - Regla nueva en el scraper (commits f143dbb y adc5935 en main).
  - En la rama `prueba/localidades`: validación contra la lista oficial (Georef / INDEC, tabla `localidades_oficiales`) y el workflow "Reparar localidades".
  - Se cierra recién cuando la reparación esté aplicada y verificada (vista previa, aplicar y filtro del panel sin códigos).

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

### 11. La regla de "dos búsquedas seguidas sin resultados" frena la cola en pueblos chicos

- **Qué es:** "Procesar cola" toma como bloqueo de Google dos búsquedas seguidas con 0 resultados. En localidades chicas es normal que varios rubros den 0 resultados seguidos.
- **Por qué importa:** con las zonas de toda Córdoba, la cola se frenaría seguido sin que haya bloqueo real, y cada vez hay que relanzarla a mano.
- **Qué hay que hacer:** decidir cómo tratar esa regla ANTES de activar zonas chicas (las zonas de Córdoba se cargan desactivadas y se activan por tandas).
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
- **Avance (2026-11-17, sin verificar todavía):** en la rama `prueba/localidades` están los SQL de `supabase/datos/` (resumen, orden por población del municipio, carga desactivada y activación por tandas), que salen de la lista oficial. Se cierra cuando las zonas estén cargadas y verificadas.

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

### 12. 7 localidades censales con nombre repetido no se cargan como zona

- **Qué es:** en la lista oficial de Córdoba hay 7 nombres de localidades censales que existen en dos departamentos distintos (14 localidades): Corralito, La Puerta, Las Vertientes, Los Chañaritos, San Pedro, San Vicente y Villa Sarmiento.
- **Por qué importa:** no se cargan como zona porque una búsqueda como "Kioscos en La Puerta, Córdoba" es ambigua para Google. Esas localidades quedan sin buscar.
- **Qué hay que hacer:** si hacen falta, decidir cómo buscarlas sin ambigüedad (por ejemplo, agregando el departamento a la búsqueda, lo que cambia código de la cola).
- **Riesgo:** bajo.
- **Fecha:** 2026-11-16.
- **Estado:** abierto.

### 13. Copia fija del censo 2022 en el repo; reemplazar a mano si INDEC publica una corrección

- **Qué es:** "Cargar localidades oficiales" lee la población por municipio de una copia fija del CSV del Censo 2022 (INDEC) guardada en `scraper/datos/` (ver `scraper/datos/LEEME.md`), porque censo.gob.ar manda su certificado incompleto y la descarga automática falla.
- **Por qué importa:** si INDEC publica una versión corregida, la copia queda vieja y el orden de las zonas usa números desactualizados. El archivo actual ya dice que INDEC lo reemplazó el 03/06/2026.
- **Qué hay que hacer:** reemplazar el archivo a mano (mismo nombre) cuando haya una corrección y actualizar la fecha en el LEEME.
- **Riesgo:** bajo.
- **Fecha:** 2026-11-17.
- **Estado:** abierto.

### 14. Localidad "Paraje" en el panel: revisar si es un nombre real o un resto de antes de la regla nueva

- **Qué es:** en el desplegable de Localidad del panel aparece "Paraje".
- **Por qué importa:** si no es una localidad real, ensucia el filtro igual que los códigos postales que se repararon.
- **Qué hay que hacer:** revisarlo con una consulta de solo lectura (cuántos leads la tienen, de qué provincia y de qué fuente) y decidir con Mauro si se corrige.
- **Riesgo:** bajo.
- **Fecha:** 2026-11-17.
- **Estado:** abierto.

### 15. docs/DECISIONES.md no existe aunque la constitución manda leerlo

- **Qué es:** las instrucciones de trabajo piden leer `docs/DECISIONES.md` antes de empezar, pero ese archivo no existe en el repo.
- **Por qué importa:** las decisiones ya tomadas (por ejemplo, la opción 2 de localidad o la copia fija del censo) quedan repartidas en los informes y no en un solo lugar.
- **Qué hay que hacer:** decidir con Mauro si se crea el archivo o si se saca esa regla de las instrucciones.
- **Riesgo:** bajo.
- **Fecha:** 2026-11-17.
- **Estado:** abierto.
