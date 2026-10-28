import { InvitationPile } from "./invitation-pile";

/**
 * La invitación (Figma: "cumple · invitación A"). La misma para todos.
 *
 * El texto es texto de verdad, encima de la pila de rokis en SVG. Los tamaños
 * van en `cqw` (porcentaje del ancho de la tarjeta) para que la composición
 * sea idéntica a la de Figma a cualquier ancho: 112 px de título sobre 1080 de
 * tarjeta son 10,37 cqw.
 *
 * La tarjeta no recorta su pila: algunos rokis se salen por los lados, como en
 * Figma. Quien la muestra decide dónde cortar (`ScratchGate` la deja salir
 * hasta el borde de la pantalla); cortarla en el borde de la tarjeta, que es
 * papel sobre papel, dejaba cabezas cortadas por una línea que no se ve.
 */
export function Invitation() {
  return (
    <div className="relative aspect-[9/16] w-full bg-paper [container-type:inline-size]">
      <InvitationPile
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
        }}
      />
      <div className="absolute top-[6.25%] left-[7.4%] w-[85.2%]">
        <p className="text-[10.37cqw] leading-[0.95] font-bold tracking-[-0.02em] text-ink">
          oficialmente
          <br />
          te invito a la celebración de los 25 años de{" "}
          <s className="decoration-ink">roahoki</s> joky!
        </p>
        <p className="mt-[3.2cqw] text-[4.07cqw] leading-[1.25] text-ink">
          ojito que mi cumple es el 4 de noviembre pero haré más de una cosita
          esa semana <span className="text-leaf">:)</span>
        </p>
      </div>
    </div>
  );
}
