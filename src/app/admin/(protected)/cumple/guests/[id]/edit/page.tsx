import { notFound } from "next/navigation";
import { BackBar } from "@/components/birthday/admin/back-bar";
import { GuestForm } from "@/components/birthday/admin/guest-form";
import { idSchema } from "@/lib/birthday/http";
import { getGuestById } from "@/lib/birthday/queries";

export const dynamic = "force-dynamic";

export default async function EditBirthdayGuestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const guest = await getGuestById(id);
  if (!guest) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <BackBar href={`/admin/cumple/guests/${guest.id}`} label={guest.name} />
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col md:pt-6">
        <GuestForm
          initial={{
            id: guest.id,
            name: guest.name,
            phone: guest.phone ?? "",
            personalMessage: guest.personalMessage ?? "",
            invitedEvents: guest.invitedEvents,
          }}
        />
      </main>
    </div>
  );
}
