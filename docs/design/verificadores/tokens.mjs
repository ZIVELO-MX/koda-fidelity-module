// Barrido de contraste de los pares de tokens del design system, en claro y en
// oscuro. Comprueba cada combinación de texto sobre superficie que el documento
// autoriza, no una muestra.

import { contraste } from "./contraste.mjs";

const AA_NORMAL = 4.5;
const AA_GRANDE = 3.0;
const AA_NO_TEXTO = 3.0; // bordes y elementos de interfaz

const TEMAS = {
  claro: {
    bg: "#FAFAF7", "bg-2": "#F5F4EE", surface: "#FFFFFF", "surface-2": "#F7F6F1",
    border: "#EBE9E0", "border-strong": "#D9D6C9",
    ink: "#1C1B17", "ink-2": "#5E5A51", "ink-3": "#8E897C", "ink-4": "#B5B0A4",
    brand: "#FF6B35", "brand-soft": "#FFF1E9", "brand-ink": "#5A1F08",
    exito: "#15803D", "exito-soft": "#E8F5EE",
    aviso: "#B45309", "aviso-soft": "#FDF2DC",
    error: "#B91C1C", "error-soft": "#FBEAE9",
    info: "#1E6DB8", "info-soft": "#E7F0FA",
  },
  oscuro: {
    bg: "#0D0C0A", "bg-2": "#141210", surface: "#1A1814", "surface-2": "#221F1A",
    border: "#2F2B25", "border-strong": "#3D3830",
    ink: "#FAFAF7", "ink-2": "#CBC6B9", "ink-3": "#8E897C", "ink-4": "#5E5A51",
    brand: "#FF7A47", "brand-soft": "#2A1810", "brand-ink": "#FFE1CF",
    exito: "#34D399", "exito-soft": "#0E2A1E",
    aviso: "#FBBF24", "aviso-soft": "#2A1F0C",
    error: "#F87171", "error-soft": "#2C1414",
    info: "#60A5FA", "info-soft": "#E7F0FA",
  },
};

// [texto, fondo, umbral, para qué sirve]
const PARES = [
  ["ink", "bg", AA_NORMAL, "texto principal sobre el fondo de la aplicación"],
  ["ink", "surface", AA_NORMAL, "texto principal sobre tarjeta"],
  ["ink", "surface-2", AA_NORMAL, "texto principal sobre superficie en hover"],
  ["ink-2", "bg", AA_NORMAL, "texto secundario sobre el fondo"],
  ["ink-2", "surface", AA_NORMAL, "texto secundario sobre tarjeta"],
  ["ink-3", "bg", AA_GRANDE, "etiquetas y texto terciario, solo en tamaño grande"],
  ["ink-3", "surface", AA_GRANDE, "etiquetas sobre tarjeta"],
  ["ink-4", "surface", AA_NO_TEXTO, "marcadores de posición e íconos inactivos"],
  ["border-strong", "surface", AA_NO_TEXTO, "borde de campo sobre tarjeta"],
  ["brand", "bg", AA_NO_TEXTO, "contorno de foco sobre el fondo"],
  ["brand", "surface", AA_NO_TEXTO, "contorno de foco sobre tarjeta"],
  ["brand-ink", "brand-soft", AA_NORMAL, "texto de marca sobre su fondo suave"],
  ["exito", "exito-soft", AA_NORMAL, "texto de éxito sobre su fondo suave"],
  ["aviso", "aviso-soft", AA_NORMAL, "texto de aviso sobre su fondo suave"],
  ["error", "error-soft", AA_NORMAL, "texto de error sobre su fondo suave"],
  ["info", "info-soft", AA_NORMAL, "texto informativo sobre su fondo suave"],
];

export function evaluarTokens() {
  const filas = [];
  for (const [tema, t] of Object.entries(TEMAS)) {
    for (const [texto, fondo, umbral, uso] of PARES) {
      const r = contraste(t[texto], t[fondo]);
      filas.push({
        tema, texto, fondo, uso, umbral,
        ratio: Number(r.toFixed(2)),
        pasa: r >= umbral,
      });
    }
  }
  return filas;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filas = evaluarTokens();
  const fallan = filas.filter((f) => !f.pasa);
  for (const f of filas) {
    console.log(
      `${f.pasa ? "ok   " : "FALLA"} ${f.tema.padEnd(7)} ${(f.texto + " sobre " + f.fondo).padEnd(30)} ` +
      `${String(f.ratio).padStart(6)}  mínimo ${f.umbral}   ${f.uso}`
    );
  }
  console.log(`\n${filas.length} pares, ${fallan.length} por debajo del mínimo`);
  process.exit(fallan.length === 0 ? 0 : 1);
}
