import { useEffect, useState } from 'react';

/** Reloj solo cuando hay finLimite; sin límite (null) no se muestra nada. */
export function TiempoRestante({ finLimite }: { finLimite: string | null }) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (finLimite === null) return;
    const temporizador = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(temporizador);
  }, [finLimite]);

  if (finLimite === null) return null;
  const segundos = Math.max(0, Math.floor((Date.parse(finLimite) - ahora) / 1000));
  const texto = `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
  return (
    <time
      className="test-timer"
      dateTime={`PT${segundos}S`}
      aria-label={`Tiempo restante ${texto}`}
    >
      {texto}
    </time>
  );
}
