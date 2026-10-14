# FID-0030: alcance funcional acordado el 2026-09-27

La decisión es priorizar un producto funcional y usable, sin sobreingeniería.
El objetivo del 80% no es una medición de cobertura ni autoriza pérdida de datos
o declarar aprobadas pruebas sin ejecutarlas.

Este cambio convierte las 15 anidaciones Link/Button encontradas en dev 742ab1f
en un solo enlace mediante Button asChild. Corrige tres avisos de texto
alternativo, tres de efectos en pantallas utilizadas y la exportación de ESLint.

Quedan 12 avisos de lint, expresamente diferidos y sin reglas silenciadas:

- Nueve recomendaciones de next/no-img-element: dashboard, portal de tarjetas,
  dos mocks de Next Image, CustomerCardListIcon, dos imágenes de IconPicker
  y dos de LoyaltyCardPreview. No se cambia el tratamiento de imágenes privadas
  ni se introduce un optimizador para cerrar avisos.
- Tres avisos en componentes UI sin consumidores encontrados en app/components:
  Carousel (set-state-in-effect), SidebarMenuSkeleton (purity) y la copia de
  use-mobile bajo components/ui (set-state-in-effect). El sidebar utilizado
  por el dashboard es components/dashboard/sidebar.tsx.

FID-0030 queda parcialmente resuelta; la deuda diferida sigue visible.
Contraste y API Error sin reproducción están asignados a Rulaxx.
Apple/FID-0001 sigue bloqueada y FID-0002 depende de ella.
