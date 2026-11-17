// Lista de leads: tabla en pantallas anchas, tarjetas en pantallas chicas.
// Solo lectura: los únicos botones copian datos o abren WhatsApp.

import { linkSitioWeb, linkWhatsapp, nombreParaCopiar, numeroParaCopiar, numeroWhatsapp, textoParaCopiar } from '@/lib/leads/contacto';
import type { LeadPanel } from '@/lib/leads/tipos';
import { BotonCopiar } from './boton-copiar';

const formatoRating = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function ListaLeads({ leads }: { leads: LeadPanel[] }) {
  if (leads.length === 0) {
    return <p className="vacio">No hay leads con estos filtros.</p>;
  }
  return (
    <>
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Rubro</th>
              <th scope="col">Localidad</th>
              <th scope="col">Provincia</th>
              <th scope="col">Teléfono fijo</th>
              <th scope="col">Celular</th>
              <th scope="col">WhatsApp</th>
              <th scope="col">Mail</th>
              <th scope="col">Instagram</th>
              <th scope="col">Sitio web</th>
              <th scope="col" className="num">
                Rating
              </th>
              <th scope="col">Sin clasificar</th>
              <th scope="col">Copiar</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className={lead.descartado ? 'descartado' : undefined}>
                <td className="nombre">
                  <Nombre lead={lead} />
                </td>
                <td>{lead.rubro ?? <Vacio />}</td>
                <td>{lead.localidad ?? <Vacio />}</td>
                <td>{lead.provincia ?? <Vacio />}</td>
                <td className="mono">{lead.telefono_fijo ?? <Vacio />}</td>
                <td className="mono">{lead.celular ?? <Vacio />}</td>
                <td className="mono">{numeroWhatsapp(lead.whatsapp) ?? <Vacio />}</td>
                <td className="cortar">{lead.email ?? <Vacio />}</td>
                <td className="cortar">{lead.instagram ?? <Vacio />}</td>
                <td className="cortar">
                  <SitioWeb valor={lead.sitio_web} />
                </td>
                <td className="num">
                  <Rating lead={lead} />
                </td>
                <td>
                  <SinClasificar numero={lead.telefono_sin_clasificar} />
                </td>
                <td>
                  <BotonesCopiar lead={lead} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="tarjetas">
        {leads.map((lead) => (
          <li key={lead.id} className={`tarjeta${lead.descartado ? ' descartado' : ''}`}>
            <div className="tarjeta-cabeza">
              <Nombre lead={lead} />
              <span className="tarjeta-rating">
                <Rating lead={lead} />
              </span>
            </div>
            <p className="tarjeta-sub">{[lead.rubro, lead.localidad, lead.provincia].filter(Boolean).join(' · ') || 'Sin rubro ni ubicación'}</p>
            <dl className="tarjeta-datos">
              <Dato titulo="Teléfono fijo" valor={lead.telefono_fijo} mono />
              <Dato titulo="Celular" valor={lead.celular} mono />
              <Dato titulo="WhatsApp" valor={numeroWhatsapp(lead.whatsapp)} mono />
              <Dato titulo="Mail" valor={lead.email} />
              <Dato titulo="Instagram" valor={lead.instagram} />
              {lead.sitio_web && (
                <div>
                  <dt>Sitio web</dt>
                  <dd className="cortar">
                    <SitioWeb valor={lead.sitio_web} />
                  </dd>
                </div>
              )}
              {lead.telefono_sin_clasificar && (
                <div>
                  <dt>Sin clasificar</dt>
                  <dd>
                    <SinClasificar numero={lead.telefono_sin_clasificar} />
                  </dd>
                </div>
              )}
            </dl>
            <div className="tarjeta-copiar">
              <span>Copiar</span>
              <BotonesCopiar lead={lead} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Vacio() {
  return (
    <span className="vacio-celda" aria-label="sin dato">
      —
    </span>
  );
}

function Nombre({ lead }: { lead: LeadPanel }) {
  return (
    <span className="nombre-texto">
      <strong>{lead.nombre}</strong>
      {lead.persona_contacto && <span className="persona">{lead.persona_contacto}</span>}
      {lead.descartado && <span className="etiqueta">Descartado</span>}
    </span>
  );
}

function Rating({ lead }: { lead: LeadPanel }) {
  if (lead.rating === null) return <Vacio />;
  return (
    <>
      {formatoRating.format(lead.rating)}
      {lead.resenas !== null && <span className="resenas"> ({lead.resenas})</span>}
    </>
  );
}

function SitioWeb({ valor }: { valor: string | null }) {
  if (!valor) return <Vacio />;
  const link = linkSitioWeb(valor);
  if (!link) return <>{valor}</>;
  return (
    <a href={link} target="_blank" rel="noopener noreferrer">
      {valor.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
    </a>
  );
}

function Dato({ titulo, valor, mono }: { titulo: string; valor: string | null; mono?: boolean }) {
  if (!valor) return null;
  return (
    <div>
      <dt>{titulo}</dt>
      <dd className={mono ? 'mono' : 'cortar'}>{valor}</dd>
    </div>
  );
}

/** Número que no se sabe si es fijo o celular (suele ser +54 351... sin el 9). */
function SinClasificar({ numero }: { numero: string | null }) {
  const paraCopiar = numeroParaCopiar(numero);
  if (!numero) return <Vacio />;
  const link = linkWhatsapp(numero);
  return (
    <div className="sin-clasificar">
      <span className="mono">{numero}</span>
      <div className="botones">
        {paraCopiar && <BotonCopiar texto={paraCopiar} etiqueta="Copiar número" />}
        {link && (
          <a className="boton boton-chico" href={link} target="_blank" rel="noopener noreferrer">
            Probar en WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

function BotonesCopiar({ lead }: { lead: LeadPanel }) {
  const whatsapp = numeroWhatsapp(lead.whatsapp);
  const email = textoParaCopiar(lead.email);
  const instagram = textoParaCopiar(lead.instagram);
  const nombre = nombreParaCopiar(lead);
  return (
    <div className="botones">
      {whatsapp && <BotonCopiar texto={whatsapp} etiqueta="WhatsApp" titulo="Copiar WhatsApp" />}
      {email && <BotonCopiar texto={email} etiqueta="Mail" titulo="Copiar mail" />}
      {nombre && (
        <BotonCopiar texto={nombre} etiqueta="Nombre" titulo={lead.persona_contacto ? 'Copiar persona de contacto' : 'Copiar nombre del negocio'} />
      )}
      {instagram && <BotonCopiar texto={instagram} etiqueta="Instagram" titulo="Copiar Instagram" />}
    </div>
  );
}
