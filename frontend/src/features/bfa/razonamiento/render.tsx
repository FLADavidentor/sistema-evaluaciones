import type { ReactNode } from 'react';
import { EnunciadoRazonamiento } from './EnunciadoRazonamiento';
import { OpcionRazonamiento } from './OpcionRazonamiento';

export const renderEnunciadoRazonamiento = (enunciado: string): ReactNode => (
  <EnunciadoRazonamiento texto={enunciado} />
);

export const renderOpcionRazonamiento = (texto: string): ReactNode => (
  <OpcionRazonamiento texto={texto} />
);
