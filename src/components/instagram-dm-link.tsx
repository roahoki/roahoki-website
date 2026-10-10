"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  INSTAGRAM_APP_PROFILE_URL,
  INSTAGRAM_DM_URL,
  isInstagramInAppBrowser,
} from "@/lib/profile";

/**
 * Link para escribirle a roahoki por Instagram.
 *
 * El servidor renderiza el link a `ig.me`, que en un navegador normal abre el
 * chat en la app. Si el visitante llegó desde Instagram (link de la bio, una
 * historia), está en el navegador interno de Instagram, donde `ig.me` carga la
 * versión web: ahí se cambia por el esquema de la app. El user agent solo se
 * conoce en el browser —leerlo en el servidor sacaría a la página de ISR—, por
 * eso el cambio ocurre después de montar.
 */
export function InstagramDmLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [inInstagram, setInInstagram] = useState(false);

  useEffect(() => {
    setInInstagram(isInstagramInAppBrowser(navigator.userAgent));
  }, []);

  if (inInstagram) {
    // Sin `target="_blank"`: una pestaña nueva del navegador interno no le
    // pasa el esquema a la app.
    return (
      <a href={INSTAGRAM_APP_PROFILE_URL} className={className}>
        {children}
      </a>
    );
  }

  return (
    <a
      href={INSTAGRAM_DM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
