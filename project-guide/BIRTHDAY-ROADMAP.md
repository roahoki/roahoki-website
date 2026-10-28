# Roadmap: el cumpleaños

Joaquín cumple 25 el 4 de noviembre de 2026 y lo celebra con cuatro planes. En
vez de un Excel compartido, cada invitado recibe un link personal a
`roahoki.com/cumple/<token>`, raspa su invitación, ve sus planes, dibuja su roki y
confirma. Joaquín sigue la asistencia y da soporte desde `/admin/cumple`.

Cada fila de las tablas es **una PR atómica**. Van encadenadas: cada una sale de la anterior y se mergean en orden. El flujo y las convenciones están
en [`../CLAUDE.md`](../CLAUDE.md); el stack, en [`STACK.md`](STACK.md).

## Qué es y qué no

**Es:** una página por invitado, sin cuenta, para ver los planes a los que está
invitado, confirmar o bajarse, ver quién más va y guardar la invitación y el
cronograma en la galería. Un panel para
cargar invitados, mandarles su link por WhatsApp y seguir las respuestas.

**No es:** un sistema de eventos reutilizable, ni una página pública. Termina
cuando pasa el último plan; después solo muestra el álbum de fotos.

## Programa

| Plan | Día | Horario | Dónde |
| --- | --- | --- | --- |
| cóctel (cumpleaños y titulación) | mié 4 nov | 19:00 a 22:00 | en mi casa |
| trote por el San Cristóbal | sáb 7 nov | 09:00 a 12:30 | de metro Baquedano a metro Pedro de Valdivia |
| carrete | sáb 7 nov | 21:00 a 05:00 | en mi casa. Temática: trae cualquier cosa que te sirva para tomar, excepto un vaso o tazón |
| subida al Manquehue | dom 8 nov | 16:00 a 21:00 | metro Escuela Militar |

La dirección de la casa **no se escribe** en la página ni en el repo: el cóctel y
el carrete dicen "en mi casa" y Joaquín la manda por WhatsApp.

## Diseño

El flujo y las pantallas están cerrados en Figma. No se programa nada que no esté
ahí; si algo cambia, se cambia primero en Figma.

- **Flujos** (FigJam): [flujo del invitado v4 y del panel v3](https://www.figma.com/board/06y0hVyeApXkHGhqVfNqFq).
- **Página del invitado** (archivo roahoki, página "cumple"): [sección invitado v3](https://www.figma.com/design/nRme62QhDf67cbH8vypD32?node-id=153-1576).
- **Panel**: [sección panel v1](https://www.figma.com/design/nRme62QhDf67cbH8vypD32?node-id=159-1075).
- **Laboratorio** de interacciones, probado con amigos: [artifact](https://claude.ai/artifact/A1ehng5ZPxCWqtyGSgwo3t).

Los componentes nuevos de Figma (`cumple/plan-tarjeta`, `cumple/boton`,
`cumple/marca`, `icono/*`) viven en la columna izquierda de la página "cumple".

## Decisiones tomadas

| Decisión | Elección | Razón |
| --- | --- | --- |
| Identidad | El token del link es el invitado: sin cuenta, clave ni cookie | Funciona en cualquier celular y abre con un toque desde WhatsApp |
| Privacidad | `noindex`, fuera del sitemap, token de ~60 bits | La página solo existe para quien tiene el link |
| Invitación por plan | `invited_events` por invitado; por defecto todos menos el cóctel | Joaquín no quiere cupos: un aforo le parece poco respetuoso. Un plan no invitado no existe para ese invitado |
| Contenido | Planes en código (`src/lib/birthday/`); respuestas en la base | Cambian poco y solo los edita Joaquín, igual que `src/lib/stats/exercises.ts` |
| Regalos | Sin wishlist en la página | Joaquín comparte ideas de regalo por WhatsApp a quien le pregunte |
| Color | Un color por plan: cóctel `#173F2A`, carrete `#0E2A47`, trote `#C42B1C`, manquehue `#3F2D5C` | El cumple es una edición hermana unida por roki, con el mismo precedente que roatoni (brand book §5.6) |
| Roki del invitado | Trazos normalizados en `jsonb`, no imágenes | Se dibuja en cualquier tamaño, pesa poco y el ojo se puede animar |
| Ojo del roki | Se reconoce solo: el trazo chico y cerrado dentro de la cabeza | Dibujo en un paso. Si no aparece, el roki entra igual, sin parpadear |
| Raspar | `scratched_at` en la base, no en `localStorage` | El navegador interno de WhatsApp no siempre conserva el almacenamiento |
| Física de la pila | `matter.js` en un componente de cliente, solo en la página del plan | Arrastrar, apilar y sacudir rokis con el dedo; se aprueba como dependencia en su PR |
| Íconos | `lucide-react`, que ya es dependencia | Línea redondeada, como el trazo de roki |
| Terremoto | Solo en la pantalla de quien lo toca | Nadie necesita que sea simultáneo |
| "Ya pasó" | Al día siguiente del término de cada plan | El carrete termina a las 05:00 del domingo y cambia recién el lunes |

## Modelo de datos

Una migración con `drizzle-kit`, con RLS habilitado en las tres tablas y solo la
política de service role (el patrón de `testimonials`): nada se lee con la anon key.

- `birthday_guests`: `id`, `name`, `token` (único), `personal_message`, `phone`,
  `invited_events text[]` (check contra `EVENT_SLUGS`, no vacío), `roki jsonb`,
  `scratched_at`, `first_seen_at`, `last_seen_at`, `created_at`.
- `birthday_rsvps`: `guest_id`, `event_slug`, `status` (`going` | `not_going`),
  `updated_at`. Único por invitado y plan. Sin fila es sin responder.
- `birthday_event_albums`: `event_slug` (único), `url`. Lo pega Joaquín desde el
  panel.

El handler de respuestas rechaza un plan que no esté en `invited_events` del
token, o cualquiera podría anotarse al cóctel armando la petición a mano.

## Rutas

| Ruta | Qué es |
| --- | --- |
| `/cumple/[token]` | Raspa, invitación, saludo, lineup y para guardar. Raíz propia con su layout |
| `/cumple/[token]/[event]` | La página del plan: datos, voy o no voy, quiénes van, calendario |
| `/cumple/[token]/opengraph-image` | La vista previa del link en WhatsApp, con el nombre del invitado |
| `/cumple/[token]/[event]/calendar.ics` | El plan para agregar al calendario |
| `/admin/cumple` | El panel, dentro de `(protected)` |

`/cumple` va en español porque es la URL que se ve en WhatsApp; el código va en
inglés (`birthday`).

---

## Bloque 1: lo mínimo para mandar los links

| # | Rama | Contenido |
| --- | --- | --- |
| 1 | `docs/birthday-roadmap` | Este roadmap |
| 2 (#64) | `feat/birthday-schema` | Catálogo de planes en código, las tres tablas con RLS, queries y esquemas zod |
| 3 (#65) | `feat/birthday-admin` | `/admin/cumple`: inicio con puntitos por plan, vista por plan, ficha del invitado, nuevo invitado, link listo con el mensaje de WhatsApp, regenerar link, álbum |
| 4 (#66) | `feat/birthday-page` | `/cumple/[token]`: layout propio, raspa, invitación, saludo, lineup con las tarjetas de plan, link inválido, `noindex` y la vista previa con el nombre. Agrega Bricolage en TTF, que la vista previa necesita |
| 5 (#67) | `feat/birthday-rsvp` | `/cumple/[token]/[event]`: el color que llena la pantalla, datos, voy o no voy con UI optimista, quiénes van como foto de curso con rokis genéricos, `.ics`, "ya pasó" con el álbum |

> Con la PR 5 mergeada los links se pueden mandar. Lo que sigue aparece en la
> página de cada invitado a medida que se mergea, sin volver a mandar nada.

## Bloque 2: lo que la hace especial

| # | Rama | Contenido |
| --- | --- | --- |
| 6 (#68) | `feat/birthday-roki-drawing` | Dibuja tu roki en un paso, reconocimiento del ojo, parpadeo, redibujar y "dibújalo después" |
| 7 (#69) | `feat/birthday-pile` | El montoncito con física, el carrusel con flechas y puntos, terremoto. Agrega `matter.js` |
| 8 (#70) | `feat/birthday-manquehue-climb` | La cumbre: arrastrar el roki cerro arriba para confirmar, con "confirmar sin subir" |
| 9 (#71) | `feat/birthday-save-images` | Invitación y cronograma 9:16 con `next/og` y la hoja de guardar en fotos |

Queda para `BACKLOG.md`: el dorsal del trote, un pase de cumbre del Manquehue y
mostrar las fotos de cada plan dentro de la página.

## Verificación de punta a punta

- Crear un invitado en `/admin/cumple`, mandarse el link y abrirlo en el celular
  desde WhatsApp: la vista previa trae el nombre.
- Raspar, confirmar y bajarse de un plan, y ver el cambio en el panel.
- Un link inválido o regenerado muestra "este link no existe".
- Un plan no invitado no aparece, y la API lo rechaza si se pide a mano.
- La página lleva `noindex` y no aparece en `sitemap.xml`.
