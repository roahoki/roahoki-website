import { redirect } from "next/navigation";

/** Al entrar al panel se ven las notas: es lo que más se hace acá. */
export default function AdminPage() {
  redirect("/admin/logbook");
}
