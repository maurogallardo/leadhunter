// Única flecha de la interfaz: un triángulo SVG relleno.
// Nunca usar caracteres (▶ ◀) ni chevrons de trazo.

export type DireccionTriangulo = 'derecha' | 'izquierda' | 'abajo' | 'arriba';

const PUNTOS: Record<DireccionTriangulo, string> = {
  derecha: '4,2 12,8 4,14',
  izquierda: '12,2 4,8 12,14',
  abajo: '2,5 14,5 8,12',
  arriba: '2,11 14,11 8,4',
};

export function Triangulo({ direccion, tamano = 10, className }: { direccion: DireccionTriangulo; tamano?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={tamano}
      height={tamano}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      <polygon points={PUNTOS[direccion]} fill="currentColor" />
    </svg>
  );
}
