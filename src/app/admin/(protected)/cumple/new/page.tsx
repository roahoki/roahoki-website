import { BackBar } from "@/components/birthday/admin/back-bar";
import { GuestForm } from "@/components/birthday/admin/guest-form";

export default function NewBirthdayGuestPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <BackBar href="/admin/cumple" label="cumple" />
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col md:pt-6">
        <GuestForm />
      </main>
    </div>
  );
}
