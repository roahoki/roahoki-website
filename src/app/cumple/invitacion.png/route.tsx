import { ImageResponse } from "next/og";
import {
  InvitationImage,
  STORY,
} from "@/components/birthday/og/invitation-image";
import { ogFonts } from "@/lib/birthday/og-fonts";

/**
 * La invitación para guardar en la galería, 1080 × 1920. Es la misma para
 * todos y no dice nada personal, así que se genera una sola vez en el build.
 */
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(<InvitationImage />, {
    ...STORY,
    fonts: await ogFonts(),
  });
}
