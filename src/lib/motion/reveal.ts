/**
 * Cuánto lleva corriendo el respaldo del CSS que muestra `el` (la animación
 * `motion-fallback-reveal` de `globals.css`), en ms. Se compara contra
 * `REVEAL_DEADLINE_MS`.
 *
 * A diferencia de `performance.now()`, que cuenta desde la carga de la página,
 * esto cuenta desde que el elemento entró al DOM: tras una navegación del
 * cliente el respaldo arranca de cero, y lo que recién aparece todavía se
 * puede animar. Sirve para lo que tiene que entrar cada vez que se llega (el
 * título de una nota), no para lo que no debe repetirse al volver (la grilla
 * del home).
 *
 * Sin la API de animaciones, o si el respaldo no corre, cae en
 * `performance.now()`.
 */
export function revealElapsedMs(el: Element): number {
  const fallback = el
    .getAnimations?.()
    .find(
      (animation) =>
        "animationName" in animation &&
        animation.animationName === "motion-fallback-reveal",
    );
  if (!fallback) return performance.now();

  // Recién creada, antes del primer cuadro, todavía no tiene tiempo: acaba de
  // empezar.
  const time = fallback.currentTime;
  return typeof time === "number" ? time : 0;
}
