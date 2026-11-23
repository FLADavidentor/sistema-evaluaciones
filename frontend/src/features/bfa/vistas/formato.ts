// Sin límite configurado (E2 puede traer tiempo nulo) se muestra «sin límite».
export const formatoTiempo = (segundos: number | null) =>
  segundos === null
    ? 'sin límite'
    : `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
