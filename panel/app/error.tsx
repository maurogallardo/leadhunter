'use client';

// Si falla la lectura de la base. Mensaje genérico: sin detalles técnicos
// ni datos de negocios.

export default function ErrorPanel({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="error-pagina">
      <h1>No se pudieron cargar los leads</h1>
      <p>Puede ser un corte de conexión o que la sesión venció.</p>
      <div className="botones">
        <button type="button" className="boton boton-principal" onClick={() => retry()}>
          Reintentar
        </button>
        <a className="boton" href="/login">
          Ir al login
        </a>
      </div>
    </main>
  );
}
