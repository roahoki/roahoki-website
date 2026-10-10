import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INSTAGRAM_APP_PROFILE_URL, INSTAGRAM_DM_URL } from "@/lib/profile";
import { InstagramDmLink } from "./instagram-dm-link";

const SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const INSTAGRAM_IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.3.23.54 (iPhone15,2; iOS 17_5; es_CL; es; scale=3.00; 1179x2556; 614435213)";

function withUserAgent(userAgent: string) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
}

describe("InstagramDmLink", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fuera de Instagram abre el chat de ig.me en otra pestaña", () => {
    withUserAgent(SAFARI_UA);
    render(<InstagramDmLink>escríbeme</InstagramDmLink>);
    const link = screen.getByRole("link", { name: "escríbeme" });

    expect(link).toHaveAttribute("href", INSTAGRAM_DM_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  // El bug: dentro de Instagram, ig.me abría la versión web de Instagram
  // dentro del mismo navegador interno.
  it("dentro de Instagram abre la app, sin pestaña nueva", () => {
    withUserAgent(INSTAGRAM_IOS_UA);
    render(<InstagramDmLink>escríbeme</InstagramDmLink>);
    const link = screen.getByRole("link", { name: "escríbeme" });

    expect(link).toHaveAttribute("href", INSTAGRAM_APP_PROFILE_URL);
    expect(link).not.toHaveAttribute("target");
  });

  it("pasa la clase al link", () => {
    render(<InstagramDmLink className="text-leaf">escríbeme</InstagramDmLink>);

    expect(screen.getByRole("link", { name: "escríbeme" })).toHaveClass(
      "text-leaf",
    );
  });
});
