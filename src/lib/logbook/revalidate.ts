import { revalidatePath } from "next/cache";

/**
 * Invalida el caché de las páginas públicas del logbook.
 *
 * `/logbook` y `/logbook/[slug]` son ISR (`revalidate = 3600`): Next sirve el
 * HTML que generó y solo lo regenera cuando vence la hora. Escribir en la base
 * no le avisa a nadie, así que sin esto **publicar una nota no se ve hasta una
 * hora después** — y si el listado se prerenderizó con la base vacía, el índice
 * queda sin un solo link durante esa hora.
 *
 * Con esta llamada, el `revalidate` de las páginas deja de ser el mecanismo por
 * el que aparece lo nuevo y pasa a ser la red de seguridad para lo que se edite
 * fuera del panel.
 *
 * El listado se invalida siempre: cualquier mutación lo cambia, incluido pasar
 * una nota a borrador, que la saca de la lista sin tocar su contenido.
 */
export function revalidateLogbook(
  ...slugs: (string | null | undefined)[]
): void {
  revalidatePath("/logbook");

  // En una edición corriente el slug viejo y el nuevo son el mismo, y sin el
  // `Set` se revalidaría dos veces la misma ruta. En un renombre son distintos
  // y hay que invalidar **los dos**: la página del slug viejo se prerenderizó
  // con la nota adentro y seguiría sirviéndola aunque en la base ya no exista
  // esa URL.
  for (const slug of new Set(slugs)) {
    if (slug) revalidatePath(`/logbook/${slug}`);
  }
}
