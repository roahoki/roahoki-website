import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { firstErrorMessage, uploadImageSchema } from "@/lib/schemas/logbook";
import {
  BUCKETS,
  contentTypeFor,
  extensionOf,
  objectPath,
} from "@/lib/storage";
import { createServerStorage } from "@/lib/storage/supabase-storage";

/**
 * Subida de imágenes del editor.
 *
 * Va por el servidor y no directo desde el browser —como sí hace el formulario
 * de testimonios— por dos razones:
 *
 * 1. El bucket del logbook no necesita política de escritura para `anon`. Si el
 *    editor subiera con la anon key, cualquiera con esa clave —que está en el
 *    bundle— podría escribir en él.
 * 2. La validación de tipo y peso ocurre donde no se puede saltear. En el
 *    cliente es una cortesía; acá es la regla.
 *
 * Recibe `multipart/form-data` y no JSON con base64: base64 infla el cuerpo un
 * 33% contra un límite de request de Vercel que ya es de 4.5 MB.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Se esperaba multipart/form-data." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }

  // La extensión sale del nombre y no del `type` que declara el navegador: ese
  // valor lo controla quien sube. Además es lo que determina el Content-Type
  // con el que Supabase va a servir el archivo después.
  const extension = extensionOf(file.name);
  const parsed = uploadImageSchema.safeParse({
    extension: extension ?? "",
    size: file.size,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: firstErrorMessage(parsed.error) },
      { status: 400 },
    );
  }

  const contentType = contentTypeFor(parsed.data.extension);
  if (!contentType) {
    return NextResponse.json(
      { error: "Formato no admitido." },
      { status: 400 },
    );
  }

  try {
    const { url } = await createServerStorage().upload({
      bucket: BUCKETS.logbookImages,
      path: objectPath(parsed.data.extension, { prefix: "entries" }),
      body: file,
      contentType,
    });

    // El editor inserta `![](url)` en el cursor con esto.
    return NextResponse.json({ url }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "No se pudo subir la imagen." },
      { status: 500 },
    );
  }
}
