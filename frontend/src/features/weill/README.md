# Inteligencia de Weill

Prueba No Verbal, Forma A: 5 láminas × 12 ítems, 8 piezas por ítem. Basado en los borradores DOC-02 v04, DOC-03, DOC-05 y DOC-06.

- Rutas: `/weill`, `/weill/intentos/:id`, `/weill/intentos/:id/constancia`, `/weill/intentos/:id/resultado`.
- API: sin rutas hasta DOC-09; se usa `services/weill.mock.ts` (estado en localStorage). El adaptador real `services/weill.ts` falla a propósito.
- Figuras de ejemplo de MaRs-IB (CC BY-NC 3.0) en `public/material/weill`; no son ítems de Weill.
- Pendientes: H-08 (retroceso, bandera `permitirRetroceso`), H-10 (instrucciones y práctica), reglas de calificación y baremos.
