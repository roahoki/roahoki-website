import Link from "next/link";

/**
 * 404 del logbook.
 *
 * Cae acá tanto un slug inexistente como un borrador: `getPublishedEntryBySlug`
 * filtra por estado, así que desde afuera no se distingue una nota que no
 * existe de una que todavía no se publicó. Es lo que se quiere — el mensaje no
 * debe delatar que la nota existe.
 */
export default function LogbookNotFound() {
  return (
    <main className="max-w-2xl mx-auto px-5 py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">
        Esta nota no existe
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Puede que el link esté mal o que la nota ya no esté publicada.
      </p>
      <Link
        href="/logbook"
        className="mt-6 inline-block text-sm text-brand hover:underline"
      >
        Ver todas las notas
      </Link>
    </main>
  );
}
