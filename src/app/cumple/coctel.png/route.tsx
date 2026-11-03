import { ImageResponse } from "next/og";
import {
  CocktailImage,
  PORTRAIT,
} from "@/components/birthday/og/cocktail-image";
import { ogFonts } from "@/lib/birthday/og-fonts";

/**
 * La foto del cóctel para el grupo de la familia. No dice nada personal ni la
 * dirección, así que, como la invitación, se genera una sola vez en el build.
 */
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(<CocktailImage />, {
    ...PORTRAIT,
    fonts: await ogFonts(),
  });
}
