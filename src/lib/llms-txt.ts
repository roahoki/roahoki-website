import type { LogbookEntry } from "@/db/schema";
import { markdownToPlainText } from "@/lib/markdown";
import {
  BIO,
  FULL_NAME,
  HANDLE,
  PROFILE_LINKS,
  STACK,
  SUMMARY,
} from "@/lib/profile";
import { PUBLIC_ROUTES } from "@/lib/public-routes";
import { absoluteUrl } from "@/lib/site";

/**
 * Arma el contenido de `/llms.txt`.
 *
 * El formato es el de llmstxt.org: un `# título`, un `> blurb`, prosa suelta y
 * secciones `##` con listas de links. Es markdown a propósito y no JSON —un
 * modelo lo lee sin parsear nada— y es un índice, no un volcado del sitio: cada
 * línea dice qué hay detrás de una URL para que el agente decida cuál abrir.
 *
 * Es una función pura y no el route handler para poder testear el texto sin
 * levantar Next. El handler solo la llama y le pone los headers.
 */

/** Aplana a una línea: un salto en medio de un ítem rompe la lista. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function linkItem(title: string, url: string, description: string): string {
  const suffix = description === "" ? "" : `: ${oneLine(description)}`;
  return `- [${oneLine(title)}](${url})${suffix}`;
}

/**
 * La descripción de una nota.
 *
 * Prefiere el `summary` que escribió el autor; si no hay, deriva del cuerpo con
 * el mismo helper que arma `og:description`. Más corto que en el meta tag: acá
 * conviven decenas de notas en un archivo y la lista tiene que seguir siendo
 * hojeable.
 */
function entryDescription(entry: LogbookEntry): string {
  return entry.summary ?? markdownToPlainText(entry.bodyMd, 140);
}

export function renderLlmsTxt(entries: LogbookEntry[]): string {
  const sections: string[] = [
    `# ${FULL_NAME} (${HANDLE})`,
    `> ${oneLine(SUMMARY)}`,
    BIO.map(oneLine).join("\n\n"),
    `Stack habitual: ${STACK.join(", ")}.`,
    "## Páginas",
    PUBLIC_ROUTES.map((route) =>
      linkItem(route.title, absoluteUrl(route.path), route.description),
    ).join("\n"),
  ];

  // Sin notas se omite la sección entera. Un `## Logbook` seguido de nada le
  // dice al agente que el sitio tiene un logbook vacío, que rara vez es cierto:
  // lo normal es que la base no haya respondido.
  if (entries.length > 0) {
    sections.push(
      "## Logbook",
      entries
        .map((entry) =>
          linkItem(
            entry.title,
            absoluteUrl(`/logbook/${entry.slug}`),
            entryDescription(entry),
          ),
        )
        .join("\n"),
    );
  }

  sections.push(
    "## Contacto",
    PROFILE_LINKS.map((link) =>
      linkItem(link.title, link.url, link.description),
    ).join("\n"),
    `El sitio completo está listado en ${absoluteUrl("/sitemap.xml")}. Todo el contenido está en español.`,
  );

  // Salto final: sin él, algunos clientes concatenan la última línea con lo que
  // venga después.
  return `${sections.join("\n\n")}\n`;
}
