// Calcula el contraste WCAG del contenido de la tarjeta sobre cada tema.
// La tarjeta pone texto blanco sobre el acento de su categoría.

const CATEGORIAS = [
  ["Panadería", "#b45309"], ["Taquería", "#dc2626"], ["Cafetería", "#6f4e37"],
  ["Hamburguesas", "#a16207"], ["Pizzería", "#b91c1c"], ["Barbería", "#334155"],
  ["Salón de Belleza", "#be185d"], ["Gimnasio", "#0f766e"], ["Fútbol", "#15803d"],
  ["Sushi", "#0e7490"], ["Veterinaria", "#7c3aed"], ["Farmacia", "#0369a1"],
  ["Heladería", "#db2777"],
];

const BLANCO = "#ffffff";
const AA_NORMAL = 4.5;
const AA_GRANDE = 3.0;

function canal(v) {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminancia(hex) {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

export function contraste(a, b) {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [alto, bajo] = la > lb ? [la, lb] : [lb, la];
  return (alto + 0.05) / (bajo + 0.05);
}

// El patrón blanco a intensidad máxima aclara el fondo. Se modela como una
// mezcla del acento con blanco al porcentaje de intensidad.
export function mezclarConBlanco(hex, porcentaje) {
  const n = hex.replace("#", "");
  const mezcla = (i) => {
    const c = parseInt(n.slice(i, i + 2), 16);
    return Math.round(c + (255 - c) * porcentaje);
  };
  return "#" + [0, 2, 4].map((i) => mezcla(i).toString(16).padStart(2, "0")).join("");
}

export function evaluar() {
  return CATEGORIAS.map(([nombre, acento]) => {
    const base = contraste(BLANCO, acento);
    const conPatron = contraste(BLANCO, mezclarConBlanco(acento, 0.40));
    return {
      nombre,
      acento,
      base: Number(base.toFixed(2)),
      conPatron: Number(conPatron.toFixed(2)),
      pasaNormal: base >= AA_NORMAL,
      pasaGrande: base >= AA_GRANDE,
      pasaConPatron: conPatron >= AA_GRANDE,
    };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const filas = evaluar();
  const fallan = filas.filter((f) => !f.pasaGrande || !f.pasaConPatron);
  for (const f of filas) {
    console.log(
      `${f.pasaGrande && f.pasaConPatron ? "ok  " : "FALLA"} ${f.nombre.padEnd(18)} ${f.acento}  ` +
      `base ${String(f.base).padStart(5)}  con patrón ${String(f.conPatron).padStart(5)}  ` +
      `${f.pasaNormal ? "texto normal AA" : "solo texto grande"}`
    );
  }
  console.log(`\n${filas.length} categorías, ${fallan.length} por debajo de AA`);
  process.exit(fallan.length === 0 ? 0 : 1);
}
