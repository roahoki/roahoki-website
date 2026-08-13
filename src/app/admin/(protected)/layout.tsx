import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  // Antes esto comparaba la cookie contra `process.env.ADMIN_PASSWORD` directo,
  // y sin la variable definida los dos lados daban `undefined`: el panel
  // quedaba abierto. `verifySessionToken` no tiene ese caso degenerado — sin
  // clave de firma no hay token que verifique.
  if (!(await verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value))) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      {children}
    </div>
  );
}
