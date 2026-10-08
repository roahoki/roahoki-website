import { Bricolage_Grotesque } from "next/font/google";

/**
 * Bricolage Grotesque, la familia única de la marca (brand book §5.4).
 *
 * Se carga con el eje `opsz`: el navegador ajusta el tamaño óptico solo según
 * el tamaño del texto (`font-optical-sizing: auto` es el valor por defecto),
 * así el cuerpo chico se lee neutro y los títulos grandes ganan carácter sin
 * declarar nada por estilo. No hay itálica: la familia no la trae.
 */
export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  axes: ["opsz"],
  display: "swap",
});
