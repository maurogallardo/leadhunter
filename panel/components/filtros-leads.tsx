'use client';

import Form from 'next/form';
import Link from 'next/link';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { PARAM, localidadesDe, provinciasDe, type Filtros } from '@/lib/leads/filtros';
import type { Rubro, Ubicacion } from '@/lib/leads/tipos';
import { Triangulo } from './triangulo';

interface Props {
  filtros: Filtros;
  rubros: Rubro[];
  ubicaciones: Ubicacion[];
}

/**
 * Filtros. Se mandan por la URL (GET) y se aplican en la base.
 * Desplegables e interruptores se aplican al cambiar; la búsqueda por
 * nombre, con Enter o con el botón Buscar.
 */
export function FiltrosLeads({ filtros, rubros, ubicaciones }: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const [provincia, setProvincia] = useState(filtros.provincia ?? '');
  const provincias = useMemo(() => provinciasDe(ubicaciones), [ubicaciones]);
  const localidades = useMemo(() => localidadesDe(ubicaciones, provincia || null), [ubicaciones, provincia]);

  // Si la URL trae un valor que ya no está en la lista, se agrega igual para no perderlo.
  const opcionesProvincia = conValorActual(provincias, filtros.provincia);
  const opcionesLocalidad = conValorActual(localidades, provincia === (filtros.provincia ?? '') ? filtros.localidad : null);

  const aplicar = () => formulario.current?.requestSubmit();

  function cambiarProvincia(e: ChangeEvent<HTMLSelectElement>) {
    setProvincia(e.target.value);
    const localidad = formulario.current?.elements.namedItem(PARAM.localidad);
    if (localidad instanceof HTMLSelectElement) localidad.value = '';
    aplicar();
  }

  return (
    <Form action="/" ref={formulario} className="filtros" aria-label="Filtros">
      <div className="filtros-busqueda">
        <label htmlFor="f-q" className="solo-lectores">
          Buscar por nombre
        </label>
        <input
          id="f-q"
          name={PARAM.busqueda}
          type="search"
          placeholder="Buscar por nombre"
          defaultValue={filtros.busqueda ?? ''}
          maxLength={100}
          autoComplete="off"
        />
        <button type="submit" className="boton">
          Buscar
        </button>
      </div>

      <div className="filtros-desplegables">
        <Desplegable id="f-provincia" etiqueta="Provincia" nombre={PARAM.provincia} valor={provincia} onChange={cambiarProvincia}>
          <option value="">Todas</option>
          {opcionesProvincia.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Desplegable>

        <Desplegable id="f-localidad" etiqueta="Localidad" nombre={PARAM.localidad} valorInicial={filtros.localidad ?? ''} onChange={aplicar}>
          <option value="">Todas</option>
          {opcionesLocalidad.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Desplegable>

        <Desplegable id="f-rubro" etiqueta="Rubro" nombre={PARAM.rubro} valorInicial={filtros.rubro ?? ''} onChange={aplicar}>
          <option value="">Todos</option>
          {rubros.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nombre}
            </option>
          ))}
        </Desplegable>
      </div>

      <fieldset className="filtros-interruptores">
        <legend className="solo-lectores">Mostrar solo</legend>
        <Interruptor nombre={PARAM.conCelular} etiqueta="Tiene celular" activo={filtros.conCelular} onChange={aplicar} />
        <Interruptor nombre={PARAM.conEmail} etiqueta="Tiene mail" activo={filtros.conEmail} onChange={aplicar} />
        <Interruptor nombre={PARAM.conWhatsapp} etiqueta="Tiene WhatsApp" activo={filtros.conWhatsapp} onChange={aplicar} />
        <Interruptor nombre={PARAM.conInstagram} etiqueta="Tiene Instagram" activo={filtros.conInstagram} onChange={aplicar} />
        <Interruptor
          nombre={PARAM.mostrarDescartados}
          etiqueta="Mostrar descartados"
          activo={filtros.mostrarDescartados}
          onChange={aplicar}
        />
      </fieldset>

      <Link href="/" className="limpiar">
        Limpiar filtros
      </Link>
    </Form>
  );
}

function conValorActual(lista: string[], actual: string | null): string[] {
  return actual && !lista.includes(actual) ? [actual, ...lista] : lista;
}

function Desplegable({
  id,
  etiqueta,
  nombre,
  valor,
  valorInicial,
  onChange,
  children,
}: {
  id: string;
  etiqueta: string;
  nombre: string;
  valor?: string;
  valorInicial?: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="campo">
      <label htmlFor={id}>{etiqueta}</label>
      <div className="select">
        <select
          id={id}
          name={nombre}
          {...(valor !== undefined ? { value: valor } : { defaultValue: valorInicial })}
          onChange={onChange}
        >
          {children}
        </select>
        <Triangulo direccion="abajo" className="select-flecha" />
      </div>
    </div>
  );
}

function Interruptor({ nombre, etiqueta, activo, onChange }: { nombre: string; etiqueta: string; activo: boolean; onChange: () => void }) {
  return (
    <label className="interruptor">
      <input type="checkbox" role="switch" name={nombre} value="1" defaultChecked={activo} onChange={onChange} />
      <span className="interruptor-pista" aria-hidden="true" />
      <span>{etiqueta}</span>
    </label>
  );
}
