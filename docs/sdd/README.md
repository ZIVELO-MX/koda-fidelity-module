# Specification-Driven Development

Este directorio inicia el trabajo de especificación de Koda Fidelity sobre la
base de código `1.2.0` en `dev`. La primera especificación describe el sistema
que existe en esa base. Los cambios futuros deben partir de ella y declarar
qué comportamiento nuevo o modificado se propone para `1.3.0`.

Una especificación describe comportamiento observable y sus límites. No
autoriza por sí sola una implementación ni convierte una idea del roadmap en
alcance comprometido.

## Ciclo propuesto

1. Registrar el problema, usuarios afectados, resultado esperado y lo que queda
   fuera.
2. Escribir requisitos comprobables y escenarios de aceptación, incluidos
   errores, permisos y estados límite.
3. Describir contratos de UI/API, datos, identidad, tenant e integraciones que
   cambian. Marcar las incógnitas sin evidencia como `Pendiente de definir.`
4. Revisar la especificación y resolver decisiones que bloqueen el diseño.
5. Derivar un plan de implementación y pruebas desde los requisitos aceptados.
6. Al cerrar, enlazar requisitos con código, migraciones, pruebas y evidencia de
   despliegue; actualizar la especificación si el comportamiento aprobado
   cambió.

## Estructura mínima de una especificación

- Contexto, problema y resultado esperado.
- Alcance y exclusiones.
- Usuarios, permisos y estados relevantes.
- Requisitos numerados, expresados como comportamiento observable.
- Escenarios de aceptación, incluyendo fallos y concurrencia cuando aplique.
- Contratos, modelo de datos, seguridad y migración afectados.
- Observabilidad, operación y reversión.
- Trazabilidad a pruebas y evidencia.
- Decisiones, riesgos e incógnitas.

El documento [Línea base del sistema 1.2.0](./1.2.0-baseline.md) es un
inventario observado del código; no es una promesa de producto ni una lista de
requisitos nuevos.

## Línea base 1.2.0

- [Inventario y corte de código](./1.2.0-baseline.md).
- [Requisitos, actores y criterios de aceptación](./1.2.0-requisitos.md).
- [Brechas, decisiones y trazabilidad](./1.2.0-brechas.md).

Benji confirma las decisiones de producto. Cada comportamiento dudoso se le
consulta: ni una función existente ni una recomendación histórica equivale a
un requisito aprobado. La revisión diferencia lo confirmado, lo observado y
lo no determinado, e identifica contradicciones con el código.

El SDD corresponde a **1.2.0**. Wallet se incorporará y validará en 1.3.0;
cobros automáticos y automatización de eliminación se evaluarán para la salida
regional. Temporadas y reinicios mensuales son propuestas sin versión asignada.
Las decisiones, las brechas abiertas y el criterio de cierre están en el registro de brechas.

- [Validación de los 35 requisitos y evidencia](./1.2.0-validacion.md).

## Propuestas para 1.3.0

[Ideas iniciales](./1.3.0-propuestas.md): selección visual de temas y escenarios
para desarrollo local. Pendientes de especificar; no representan alcance aprobado.
