import { describe, expect, it } from "vitest";
import { isInstagramInAppBrowser } from "./profile";

describe("isInstagramInAppBrowser", () => {
  it.each([
    [
      "iOS",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.3.23.54 (iPhone15,2; iOS 17_5; es_CL; es; scale=3.00; 1179x2556; 614435213)",
    ],
    [
      "Android",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36 Instagram 343.0.0.33.101 Android (34/14; 420dpi; 1080x2400; Google/google; Pixel 8; shiba; shiba; es_CL; 627400398)",
    ],
  ])("reconoce el navegador interno de Instagram en %s", (_, userAgent) => {
    expect(isInstagramInAppBrowser(userAgent)).toBe(true);
  });

  it.each([
    [
      "Safari",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    ],
    [
      "Chrome",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
    ],
  ])("no confunde %s con Instagram", (_, userAgent) => {
    expect(isInstagramInAppBrowser(userAgent)).toBe(false);
  });
});
