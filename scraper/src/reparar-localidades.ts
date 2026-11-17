// "Reparar localidades": corrige las localidades sospechosas ya guardadas
// (códigos postales, pedazos como AAU, números) usando la dirección guardada
// y la lista oficial de localidades. Nunca toca localidades cargadas a mano.
// Se corre en GitHub Actions (workflow "Reparar localidades").
//
// Variables de entorno:
//   SUPABASE_URL, SUPABASE_SECRET_KEY  (Secrets de GitHub, solo en ese paso)
//   MODO                               "vista_previa" (solo cuenta) o "aplicar"
//
// REGLA DE ORO: por consola solo salen números. Nunca localidades,
// direcciones, nombres ni datos de negocios.

import { crearCliente } from './importacion/base.js';
import { codigoDeErrorSeguro } from './importacion/decision.js';
import { leerListaLocalidades } from './localidades/base-localidades.js';
import { actualizarLocalidad, leerLeadsParaReparar } from './localidades/base-reparacion.js';
import { leerConfiguracionLocalidades } from './localidades/modo.js';
import { fuentesReparadas, planificarReparacion, resumirReparacion } from './localidades/reparacion.js';

async function principal(): Promise<number> {
  const resultado = leerConfiguracionLocalidades(process.env);
  if (!resultado.ok) {
    for (const error of resultado.errores) console.log(`ERROR: ${error}`);
    return 1;
  }
  const { supabaseUrl, supabaseClave, modo } = resultado.config;
  const db = crearCliente(supabaseUrl, supabaseClave);

  let planes;
  let provinciasConLista = false;
  try {
    const [lista, leads] = await Promise.all([leerListaLocalidades(db), leerLeadsParaReparar(db)]);
    provinciasConLista = lista.tieneLista('Córdoba');
    planes = leads.map((lead) => planificarReparacion(lead, lista));
  } catch (error) {
    console.log(`ERROR: no se pudieron leer los leads o las localidades oficiales (codigo ${codigoDeErrorSeguro(error)}).`);
    return 1;
  }
  const resumen = resumirReparacion(planes);

  if (modo === 'aplicar' && !provinciasConLista) {
    console.log('ERROR: la lista oficial de Cordoba no esta cargada. Primero corre "Cargar localidades oficiales" en modo aplicar.');
    return 1;
  }

  let actualizadas = 0;
  let cambiaronMientrasTanto = 0;
  let errores = 0;
  let codigoError: string | null = null;
  if (modo === 'aplicar') {
    for (const plan of planes) {
      if (plan.tipo !== 'cambiar') continue;
      try {
        const ok = await actualizarLocalidad(db, plan.id, plan.anterior, plan.nueva, fuentesReparadas(plan.fuentesOriginales, plan.nueva));
        if (ok) actualizadas++;
        else cambiaronMientrasTanto++;
      } catch (error) {
        errores++;
        codigoError = codigoDeErrorSeguro(error);
      }
    }
  }

  console.log('===== RESUMEN REPARAR LOCALIDADES =====');
  console.log(`Modo: ${modo === 'aplicar' ? 'aplicar' : 'vista previa (no se cambio nada)'}`);
  console.log(`Lista oficial de Cordoba cargada: ${provinciasConLista ? 'si' : 'no'}`);
  console.log(`Leads revisados: ${resumen.revisados}`);
  console.log(`Localidades sospechosas: ${resumen.sospechosas}`);
  console.log(`Salteadas por estar cargadas a mano: ${resumen.salteadasManual}`);
  console.log(`${modo === 'aplicar' ? 'Pasan' : 'Pasarian'} a un nombre: ${resumen.conNombre}`);
  console.log(`  de ellas, de provincias sin lista oficial: ${resumen.conNombreSinLista}`);
  console.log(`${modo === 'aplicar' ? 'Quedan' : 'Quedarian'} vacias: ${resumen.quedanVacias}`);
  console.log(`Sospechosas sin direccion guardada: ${resumen.sinDireccion}`);
  if (modo === 'aplicar') {
    console.log(`Actualizadas: ${actualizadas}`);
    console.log(`No actualizadas (cambiaron mientras tanto): ${cambiaronMientrasTanto}`);
    console.log(`Errores: ${errores}`);
    if (codigoError) console.log(`Ultimo codigo de error: ${codigoError}`);
  }
  console.log('=======================================');
  return errores > 0 ? 1 : 0;
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
