import type { BirthdayEvent } from "./events";

/**
 * El plan como archivo `.ics`, para "agregar al calendario". Un archivo y no un
 * link de Google Calendar porque abre en cualquier calendario: el de iPhone, el
 * de Android o el de Google.
 *
 * Lleva el link a la página del plan y no la dirección: la de la casa no se
 * escribe en ningún lado (ver `events.ts`).
 */

/** "2026-11-07T09:00:00-03:00" → "20261107T120000Z" */
function utc(iso: string): string {
  return `${new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/** RFC 5545 §3.3.11: comas, punto y coma, barras y saltos van escapados. */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, ";")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * RFC 5545 §3.1: ninguna línea pasa de 75 bytes; las largas siguen en la
 * siguiente con un espacio adelante. Se corta por bytes y no por caracteres
 * porque "ó" ocupa dos.
 */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (encoder.encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function eventIcs({
  event,
  guestId,
  url,
  now = new Date(),
}: {
  event: BirthdayEvent;
  guestId: string;
  url: string;
  now?: Date;
}): string {
  const description = [
    ...event.details.map((detail) => `${detail.label} ${detail.value}`),
    "",
    url,
  ].join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//roahoki//cumple//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Estable por invitado y plan: volver a descargarlo actualiza el mismo
    // evento en vez de duplicarlo.
    `UID:${event.slug}-${guestId}@roahoki.com`,
    `DTSTAMP:${utc(now.toISOString())}`,
    `DTSTART:${utc(event.startsAt)}`,
    `DTEND:${utc(event.endsAt)}`,
    `SUMMARY:${escapeText(`${event.title} · los 25 de joky`)}`,
    `LOCATION:${escapeText(event.place)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
