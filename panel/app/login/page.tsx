import type { Metadata } from 'next';
import { FormularioLogin } from './formulario-login';

export const metadata: Metadata = { title: 'Entrar · LeadHunter' };

export default function PaginaLogin() {
  return (
    <main className="login">
      <div className="login-caja">
        <h1 className="login-titulo">LeadHunter</h1>
        <p className="login-sub">Entrá con tu mail y contraseña.</p>
        <FormularioLogin />
      </div>
    </main>
  );
}
