'use client';

import { useEffect, useRef, useState } from 'react';

/** Copia un texto al portapapeles y muestra "Copiado" un momento. */
export function BotonCopiar({ texto, etiqueta, titulo }: { texto: string; etiqueta: string; titulo?: string }) {
  const [estado, setEstado] = useState<'listo' | 'copiado' | 'error'>('listo');
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  async function copiar() {
    const ok = await escribirPortapapeles(texto);
    setEstado(ok ? 'copiado' : 'error');
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setEstado('listo'), 1600);
  }

  return (
    <button
      type="button"
      className={`boton boton-chico${estado === 'copiado' ? ' boton-copiado' : ''}${estado === 'error' ? ' boton-error' : ''}`}
      onClick={copiar}
      title={titulo}
    >
      <span aria-live="polite">{estado === 'copiado' ? 'Copiado' : estado === 'error' ? 'No se pudo' : etiqueta}</span>
    </button>
  );
}

async function escribirPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Plan B para navegadores que no dejan usar el portapapeles moderno.
    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}
