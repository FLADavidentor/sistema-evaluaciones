import type { ConfiguracionSubprueba } from '../types/catalogo.types';

/** Subpruebas en el orden oficial de aplicación (campo `orden` de E2). */
export function ordenarSubpruebas(subpruebas: ConfiguracionSubprueba[] = []) {
  return [...subpruebas].sort(
    (a, b) => (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER),
  );
}

/** Ruta donde se inicia la aplicación de un test; null si ese módulo aún no existe. */
export function rutaDeInicio(codigo: string | undefined): string | null {
  return codigo === 'BFA' ? '/bfa' : null;
}
