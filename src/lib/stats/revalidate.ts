import { revalidatePath } from "next/cache";

/**
 * Invalida el caché de la página pública de stats.
 *
 * `/stats` va a ser ISR (PR 3): Next sirve el HTML que generó hasta que vence
 * el `revalidate`. Insertar una fila en la base no le avisa a nadie, así que
 * sin esto **el número que se ve en público quedaría atrasado** respecto del
 * que muestra el panel, y el desfase duraría lo que dure el intervalo.
 *
 * Que la ruta todavía no exista no es un problema: `revalidatePath` sobre una
 * ruta sin caché generado no hace nada. Va en esta PR y no en la siguiente
 * porque pertenece al flujo de escritura —quien muta invalida—, y agregarlo
 * después significaría volver a abrir el handler para arreglar un bug cuyo
 * síntoma aparece lejos de su causa.
 */
export function revalidateStats(): void {
  revalidatePath("/stats");
}
