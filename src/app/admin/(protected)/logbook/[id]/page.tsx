import { notFound } from "next/navigation";
import { LogbookEditor } from "@/components/logbook-editor";
import { getEntryById } from "@/lib/logbook/queries";

export const dynamic = "force-dynamic";

export default async function EditLogbookEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // `getEntryById` valida el uuid implícitamente: un id malformado hace fallar
  // la query de Postgres, así que se comprueba antes y se responde 404, que es
  // lo que corresponde a una URL que no existe.
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)) {
    notFound();
  }

  const entry = await getEntryById(id);
  if (!entry) notFound();

  return <LogbookEditor entry={entry} />;
}
