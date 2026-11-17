# Datos fijos del scraper

## censo2022_gobierno_local.csv

- **Fuente:** INDEC, Censo Nacional de Población, Hogares y Viviendas 2022, resultados definitivos.
  Cuadro de población y viviendas por gobierno local (municipio o comuna), todo el país.
  Publicado en censo.gob.ar (sección "Gobiernos locales"):
  https://censo.gob.ar/wp-content/uploads/2024/07/c2022_tp_gobierno_local_c1.csv
- **Fecha de descarga:** 2026-11-17.
- **Contenido:** solo códigos de gobierno local (CODGL) y números (viviendas y población).
  Al final trae notas del propio INDEC (fuente, signos convencionales, fecha de reemplazo).
  Ningún dato de negocios.
- **Uso:** el workflow "Cargar localidades oficiales" lo lee para completar `poblacion_municipio`
  en `localidades_oficiales` (con eso se ordenan las zonas).
- **Por qué es una copia fija:** censo.gob.ar manda su certificado de seguridad incompleto y la
  descarga automática desde Node falla (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`).
- **Si INDEC publica una versión corregida, reemplazar a mano** este archivo (mismo nombre)
  y actualizar la fecha de descarga de arriba. El archivo actual ya dice que fue reemplazado
  por INDEC el 03/06/2026.
