'use client';

import { useActionState, useState } from 'react';
import { entrar, type EstadoLogin } from '../acciones-sesion';

const INICIAL: EstadoLogin = { error: null };

export function FormularioLogin() {
  const [estado, accion, enviando] = useActionState(entrar, INICIAL);
  const [verPassword, setVerPassword] = useState(false);

  return (
    <form action={accion} className="login-form">
      <div className="campo">
        <label htmlFor="email">Mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>

      <div className="campo">
        <label htmlFor="password">Contraseña</label>
        {/* El botón del ojo va FUERA del label. */}
        <div className="password">
          <input
            id="password"
            name="password"
            type={verPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="ojo"
            onClick={() => setVerPassword((v) => !v)}
            aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={verPassword}
            aria-controls="password"
          >
            <IconoOjo tachado={verPassword} />
          </button>
        </div>
      </div>

      <p className="login-error" role="alert" aria-live="polite">
        {estado.error}
      </p>

      <button type="submit" className="boton boton-principal" disabled={enviando}>
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}

function IconoOjo({ tachado }: { tachado: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 5C6.5 5 2.7 8.6 1 12c1.7 3.4 5.5 7 11 7s9.3-3.6 11-7c-1.7-3.4-5.5-7-11-7Zm0 11.5A4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 0 1 0 9Zm0-7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"
      />
      {tachado && <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />}
    </svg>
  );
}
