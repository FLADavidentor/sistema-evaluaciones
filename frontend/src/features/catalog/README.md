# Módulo de catálogo de tests — GEN-01-FE

## Descripción

Módulo frontend encargado de consultar y presentar los tests disponibles en el sistema de evaluaciones, así como sus configuraciones y subpruebas.

## Estructura

```text
catalog/
├── README.md
├── rutas.tsx
├── components/
│   └── CatalogoPage.tsx
├── services/
│   └── catalogoService.ts
└── types/
    └── catalogo.types.ts
```

## Responsabilidades

- Consultar los tests activos del catálogo.
- Mostrar la información general de cada test.
- Permitir seleccionar un test.
- Consultar y presentar el detalle y sus subpruebas.
- Gestionar estados de carga, errores y respuestas vacías.

## Integración con API

El módulo utiliza el servicio HTTP compartido ubicado en `src/services/http.ts`.

Operaciones previstas según el contrato aprobado en `docs/api/openapi.yaml` (DOC-05):

| Método | Endpoint                 | Operación                      |
| ------ | ------------------------ | ------------------------------ |
| GET    | `/api/v1/tests`          | Consultar tests disponibles    |
| GET    | `/api/v1/tests/{testId}` | Consultar detalle y subpruebas |

## Dependencias pendientes

La integración funcional requiere que el backend implemente los endpoints E1 y E2 del contrato aprobado.

Mientras estos endpoints no estén disponibles, las solicitudes pueden devolver HTTP 404.

También está pendiente verificar la integración de autenticación mediante Bearer Token, conforme a los requisitos de seguridad del contrato.

## Estado técnico

- Interfaz del catálogo implementada.
- Servicios HTTP implementados.
- Tipos TypeScript definidos.
- Rutas del módulo registradas.
- Estilos integrados con el sistema visual compartido.
- Validaciones TypeScript, ESLint, pruebas automatizadas y compilación de producción satisfactorias.

La integración completa con el backend permanece pendiente de la implementación y disponibilidad de los endpoints correspondientes.
