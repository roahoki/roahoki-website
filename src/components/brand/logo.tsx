import { LogoMark } from "./logo-mark";

type LogoProps = {
  /** Tamaño de la palabra en px. La figura y la separación salen de este. */
  size?: number;
  className?: string;
};

/**
 * El logo de roahoki (brand book §5.2): la figura cerca de la palabra
 * "roahoki" en Bricolage Grotesque Bold, en minúscula.
 *
 * La palabra es texto de verdad y no un dibujo: se lee, se selecciona y es el
 * nombre accesible del link que la envuelva. La figura es decorativa al lado
 * del nombre, para que un lector de pantalla no diga "roahoki" dos veces.
 *
 * Proporciones del lockup de Figma: la figura mide 1,3 veces el tamaño de la
 * letra y queda a 0,3 em de la palabra. `items-baseline` apoya el borde
 * inferior de la figura —los hombros— en la línea base del texto. Toma el
 * color del texto que la rodea.
 */
export function Logo({ size = 20, className = "" }: LogoProps) {
  return (
    <span
      className={`inline-flex items-baseline gap-[0.3em] font-brand leading-none font-bold tracking-[-0.015em] ${className}`}
      style={{ fontSize: size }}
    >
      <LogoMark size={Math.round(size * 1.3)} />
      <span>roahoki</span>
    </span>
  );
}
