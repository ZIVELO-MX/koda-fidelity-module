import { test, expect, type Page } from "@playwright/test"
import { medirDestinos, faltantes, informe } from "./areas-tactiles"

// Recorrido de la ola 1 en los tres anchos del design system.
//
// Límite conocido: el repositorio no tiene sesión sembrada para las pruebas, y
// las cuatro superficies de la ola viven detrás del login. Aquí se verifica lo
// que sí es alcanzable sin sesión: que el panel redirige en vez de pintar un
// error, y que las rutas públicas no desbordan ni dejan botones por debajo del
// área táctil mínima. Lo demás queda sin marcar en el plan, no dado por bueno.

const ANCHOS = [
  { nombre: "movil", width: 375, height: 812 },
  { nombre: "tableta", width: 768, height: 1024 },
  { nombre: "escritorio", width: 1440, height: 900 },
]

const RUTAS_PUBLICAS = ["/login", "/signup", "/dashboard/my-cards"]

// El ADN pide 40px de área táctil en un control y 44px en un destino de
// navegación. Medido el 2026-09-08 en los tres anchos. Todo lo de aquí vive en
// pantallas de acceso que pertenecen a FID-0013, bloqueada, así que se
// documenta en vez de corregirse.
const CONOCIDOS_FID_0013 = [
  "boton Continuar",         // 36px en /login, el mínimo del control es 40
  "boton Crear Cuenta",      // 36px en /signup con el alta abierta
  "enlace Koda Fidelity",    // 32px, 36 en 1440
  "enlace Más información",  // 18px
  "enlace Solicitar acceso", // 36px, /signup con el alta cerrada
  "enlace Iniciar Sesión",   // 20px
]

// El servidor de pruebas arranca con INVITE_ONLY=false, así que /signup se ve
// con el formulario abierto. Con la bandera puesta enseña la otra cara, y por
// eso la lista lleva los destinos de las dos.

async function desborda(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
}

test.describe("el panel resuelve la sesión antes de cargar datos", () => {
  // El proxy construye su cliente de Supabase antes de que la página responda,
  // así que sin credenciales esta ruta ni siquiera llega al servidor de la app.
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Requiere NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY",
  )

  // Regresión: los redirect() vivían dentro del try, y como funcionan lanzando
  // NEXT_REDIRECT, el catch se los tragaba y pintaba "Error al cargar el panel".
  test("sin sesión, /dashboard manda al login y no muestra el error de carga", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForURL("**/login")
    await expect(page.getByText("Error al cargar el panel")).toHaveCount(0)
    await expect(page.getByText("Iniciar Sesión").first()).toBeVisible()
  })
})

for (const ancho of ANCHOS) {
  test.describe(`${ancho.nombre} (${ancho.width}px)`, () => {
    test.use({ viewport: { width: ancho.width, height: ancho.height } })

    for (const ruta of RUTAS_PUBLICAS) {
      test(`${ruta} no desborda horizontalmente`, async ({ page }) => {
        await page.goto(ruta)
        expect(await desborda(page), `${ruta} desborda en ${ancho.nombre}`).toBe(false)
      })

      test(`${ruta} respeta el área táctil mínima`, async ({ page }) => {
        await page.goto(ruta)
        // `/dashboard/my-cards` arranca en un estado de carga sin botones y
        // luego pinta los suyos. Medir al `load` medía ese fotograma, que el
        // usuario no llega a tocar, y daba verde sin haber medido nada.
        await expect(page.locator(".animate-spin")).toHaveCount(0)

        const destinos = await medirDestinos(page)
        const faltas = faltantes(destinos, CONOCIDOS_FID_0013)
        // Aserción de subconjunto: los conocidos no rompen, uno nuevo sí. Ahora
        // mide las dos dimensiones, así que un control ancho y bajo, o alto y
        // estrecho, deja de pasar por bueno.
        expect(faltas, informe(faltas, `${ruta} a ${ancho.width}px`)).toEqual([])
      })
    }
  })
}
