import { absoluteUrl } from "@/lib/site";
import type { BirthdayEvent } from "./events";

/**
 * Los links del cumpleaños: el personal de cada invitado y los de WhatsApp que
 * arma el panel.
 *
 * El mensaje sale armado para que mandar 30 links sea tocar un botón 30 veces y
 * no escribir 30 mensajes. Joaquín lo puede cambiar en WhatsApp antes de
 * enviarlo.
 */

/** El link personal: lo que el invitado abre y lo que lo identifica. */
export function guestUrl(token: string): string {
  return absoluteUrl(`/cumple/${token}`);
}

/** El link de un plan dentro de la página del invitado. */
export function guestEventUrl(token: string, event: BirthdayEvent): string {
  return absoluteUrl(`/cumple/${token}/${event.path}`);
}

/**
 * El número para `wa.me`: solo dígitos y con código de país.
 *
 * Un celular chileno escrito a la chilena (`9 8765 4321`) no trae el 56, y
 * `wa.me` sin código de país abre un chat con un número que no existe. Si el
 * teléfono no sirve, `null`: el link abre WhatsApp para elegir el contacto a
 * mano.
 */
export function whatsappNumber(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (/^9\d{8}$/.test(digits)) return `56${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}

export function whatsappLink(
  phone: string | null | undefined,
  text: string,
): string {
  const number = whatsappNumber(phone);
  const query = `text=${encodeURIComponent(text)}`;
  return number
    ? `https://wa.me/${number}?${query}`
    : `https://wa.me/?${query}`;
}

/** El nombre como saludo: "cata" pasa a "Cata". */
function capitalized(name: string): string {
  return name.charAt(0).toLocaleUpperCase("es-CL") + name.slice(1);
}

/** El mensaje con que se manda el link la primera vez. */
export function inviteMessage(name: string, token: string): string {
  return `${capitalized(name)}! te tengo una invitación, revísala acá :)\n${guestUrl(token)}`;
}

/** El recordatorio para quien no ha respondido un plan. */
export function reminderMessage(
  name: string,
  token: string,
  event: BirthdayEvent,
): string {
  return `${capitalized(name)}! te falta confirmar el ${event.title} :) acá puedes:\n${guestEventUrl(token, event)}`;
}
