import { LogoMark } from "@/components/brand/logo-mark";
import { WHATSAPP_URL } from "@/lib/profile";

/**
 * Un link que no existe: mal copiado, o regenerado desde el panel. No da pistas
 * de quién es ni de qué hay detrás.
 */
export default function BirthdayLinkNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col gap-4 px-4 pt-28">
      <LogoMark size={160} className="text-faded" />
      <h1 className="text-entry-title">este link no existe</h1>
      <p className="text-entry-body">
        Puede que se haya copiado mal o que te haya mandado uno nuevo. Pídeme el
        tuyo :)
      </p>
      <a
        href={WHATSAPP_URL}
        className="mt-2 inline-flex h-11 items-center self-start rounded-md border border-ink px-4 text-action"
      >
        escríbeme
      </a>
    </main>
  );
}
