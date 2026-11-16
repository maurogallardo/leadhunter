// ¿El lead tiene alguna forma de contacto?
// Cuentan: celular, teléfono fijo, teléfono sin clasificar, WhatsApp,
// email e Instagram. El sitio web solo NO cuenta como contacto.

import { estaVacio, type Lead } from './tipos.js';

type LeadConContacto = Pick<
  Lead,
  'celular' | 'telefono_fijo' | 'telefono_sin_clasificar' | 'whatsapp' | 'email' | 'instagram'
>;

export function tieneContacto(lead: LeadConContacto): boolean {
  return [lead.celular, lead.telefono_fijo, lead.telefono_sin_clasificar, lead.whatsapp, lead.email, lead.instagram].some(
    (valor) => !estaVacio(valor),
  );
}
