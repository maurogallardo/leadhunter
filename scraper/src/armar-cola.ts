// "Armar cola": crea un pendiente por cada rubro activo × zona activa que
// todavía no esté en cola_busquedas. Correrlo dos veces no repite nada.
// Se corre en GitHub Actions (workflow "Armar cola").
//
// Variables de entorno: SUPABASE_URL, SUPABASE_SECRET_KEY (Secrets de GitHub).
// Por consola solo salen números.

import { crearCliente } from './importacion/base.js';
import { codigoDeErrorSeguro } from './importacion/decision.js';
import { insertarPendientes, leerParesExistentes, leerRubros, leerZonas } from './cola/base-cola.js';
import { leerConfiguracionArmar } from './cola/configuracion-cola.js';
import { armarPendientes } from './cola/reglas.js';

async function principal(): Promise<number> {
  const resultado = leerConfiguracionArmar(process.env);
  if (!resultado.ok) {
    for (const error of resultado.errores) console.log(`ERROR: ${error}`);
    return 1;
  }
  const db = crearCliente(resultado.config.supabaseUrl, resultado.config.supabaseClave);

  let armado;
  try {
    const [rubros, zonas, existentes] = await Promise.all([leerRubros(db), leerZonas(db), leerParesExistentes(db)]);
    armado = armarPendientes(rubros, zonas, existentes);
  } catch (error) {
    console.log(`ERROR: no se pudieron leer rubros, zonas o la cola (codigo ${codigoDeErrorSeguro(error)}).`);
    return 1;
  }

  let insertados: number;
  try {
    insertados = await insertarPendientes(db, armado.nuevos);
  } catch (error) {
    console.log(`ERROR: no se pudieron crear los pendientes (codigo ${codigoDeErrorSeguro(error)}).`);
    return 1;
  }

  // Si otro proceso creó alguno entre la lectura y la inserción, cuenta como "ya existía".
  const yaExistian = armado.yaExistian + (armado.nuevos.length - insertados);

  console.log('===== RESUMEN ARMAR COLA =====');
  console.log(`Zonas activas: ${armado.zonasActivas}`);
  console.log(`Rubros activos: ${armado.rubrosActivos}`);
  console.log(`Pendientes nuevos: ${insertados}`);
  console.log(`Ya existian: ${yaExistian}`);
  console.log('==============================');
  if (armado.zonasActivas === 0) console.log('Aviso: no hay zonas activas. Cargalas con SQL (ver README).');
  return 0;
}

principal().then(
  (codigo) => {
    process.exitCode = codigo;
  },
  (error: unknown) => {
    console.log(`ERROR inesperado (codigo ${codigoDeErrorSeguro(error)}).`);
    process.exitCode = 1;
  },
);
