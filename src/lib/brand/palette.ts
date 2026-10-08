/**
 * Paleta de roahoki, tal como la define el brand book (§5.3) y `tokens.json`.
 *
 * Los nombres van en inglés como el resto del código; entre paréntesis, el
 * token de la marca. Los mismos valores están declarados en `globals.css`
 * como variables CSS: el test de este módulo compara ambos para que no se
 * desincronicen, porque el CSS no puede importar TypeScript.
 */
export const palette = {
  // (fondo) Crema verdosa. Nunca blanco puro.
  paper: "#EEECE3",
  // (texto) Verde casi negro: cuerpo, títulos y borde de botones e inputs.
  ink: "#101610",
  // (atenuado) Fechas, formato, metadata.
  faded: "#62695C",
  // (borde) Divisores. Es línea, no texto.
  rule: "#BFC3BB",
  // (acento) Links, el `:)` y el fondo de la selección.
  leaf: "#027816",
  // (botella) Color distintivo: tags, portada tipográfica, avatar.
  bottle: "#173F2A",
} as const;

export type PaletteColor = keyof typeof palette;

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa según WCAG 2.x, para un color `#RRGGBB`. */
export function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Color inválido: ${hex}`);
  const [r, g, b] = match.slice(1).map((h) => channel(Number.parseInt(h, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste WCAG entre dos colores; el orden no importa. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (dark + 0.05);
}
