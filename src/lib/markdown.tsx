import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Render de markdown para las notas del logbook.
 *
 * **Nunca se guarda ni se genera HTML.** `react-markdown` construye elementos
 * de React directamente desde el AST, así que en ningún punto del camino hay un
 * string de HTML que alguien pueda inyectar: no se usa
 * `dangerouslySetInnerHTML` en ninguna parte de este archivo, y esa es la
 * garantía principal.
 *
 * Concretamente, esto cierra los dos vectores que importan:
 *
 * 1. **HTML crudo en el markdown.** Sin el plugin `rehype-raw` —que
 *    deliberadamente no se instala—, un `<script>` en el cuerpo se renderiza
 *    como el texto `<script>`, no como una etiqueta.
 * 2. **URLs con esquemas peligrosos.** `[click](javascript:...)` se filtra en
 *    `safeUrl`, que además de la defensa de la librería aplica una allowlist
 *    explícita.
 *
 * Es un Server Component: no lleva `"use client"` y no tiene estado. El
 * markdown se convierte en HTML en el servidor y al browser solo le llega el
 * resultado, así que la librería no entra al bundle del cliente.
 */

/** Los únicos esquemas que se dejan pasar en enlaces e imágenes. */
const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"];

/**
 * Deja pasar la URL si es segura; si no, devuelve `""`.
 *
 * Las relativas (`/logbook/otra`, `#seccion`) se aceptan tal cual: no llevan
 * esquema y no pueden ejecutar nada.
 *
 * `javascript:` es el caso obvio, pero también se descartan `data:` —que
 * permite incrustar un documento HTML entero— y `vbscript:`.
 */
export function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed === "") return "";

  // Sin esquema es relativa. `new URL` necesita una base para resolverla, y el
  // valor de la base da igual porque solo se usa para leer el protocolo.
  let parsed: URL;
  try {
    parsed = new URL(trimmed, "https://roahoki.invalid");
  } catch {
    return "";
  }

  // Una relativa hereda el protocolo de la base, que es https, así que pasa.
  return SAFE_PROTOCOLS.includes(parsed.protocol) ? trimmed : "";
}

/**
 * Componentes con los que se renderiza cada nodo.
 *
 * Los enlaces externos llevan `rel="noopener noreferrer"`: sin `noopener`, la
 * página destino puede manipular la pestaña de origen vía `window.opener`.
 *
 * Todos descartan `node` antes de esparcir el resto de las props.
 * `react-markdown` pasa el nodo del AST con ese nombre, y si se propaga al
 * elemento termina en el HTML como `node="[object Object]"`: un atributo
 * inválido en cada enlace, imagen y tabla de cada nota.
 */
type WithNode = { node?: unknown };

const components = {
  a({
    href,
    children,
    node: _node,
    ...props
  }: React.ComponentProps<"a"> & WithNode) {
    const safe = safeUrl(href ?? "");
    // Un enlace cuya URL se descartó se degrada a texto plano en vez de
    // desaparecer: el contenido de la nota se sigue leyendo entero.
    if (safe === "") return <>{children}</>;

    const isExternal = /^https?:/i.test(safe);
    return (
      <a
        href={safe}
        {...(isExternal
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        {...props}
      >
        {children}
      </a>
    );
  },

  img({
    src,
    alt,
    node: _node,
    ...props
  }: React.ComponentProps<"img"> & WithNode) {
    const safe = safeUrl(typeof src === "string" ? src : "");
    if (safe === "") return null;

    // `next/image` a propósito no: exige declarar el host en `remotePatterns` y
    // conocer las dimensiones. Las imágenes del logbook vienen de Supabase
    // Storage con tamaños arbitrarios, y una `<img>` con `loading="lazy"`
    // resuelve el caso sin agregar una fricción por cada host nuevo.
    // biome-ignore lint/performance/noImgElement: ver comentario
    return <img src={safe} alt={alt ?? ""} loading="lazy" {...props} />;
  },

  // Una tabla de tres columnas no entra en 390px de ancho y se cortaba por la
  // derecha, sin forma de llegar al resto. El contenedor le da scroll propio
  // en vez de desbordar la página entera.
  table({
    children,
    node: _node,
    ...props
  }: React.ComponentProps<"table"> & WithNode) {
    return (
      <div className="overflow-x-auto">
        <table {...props}>{children}</table>
      </div>
    );
  },
} as const;

export function MarkdownContent({ children }: { children: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      urlTransform={safeUrl}
      components={components}
    >
      {children}
    </Markdown>
  );
}

/**
 * Un resumen en texto plano, para `og:description` cuando la nota no tiene
 * `summary` propio.
 *
 * Es deliberadamente tosco: quita la sintaxis de markdown más común y corta.
 * No pretende ser un render — es texto para un meta tag, donde un asterisco de
 * más no rompe nada pero un `#` al principio se ve mal en la preview.
 */
export function markdownToPlainText(markdown: string, maxLength = 200): string {
  const text = markdown
    // Bloques de código enteros: su contenido no describe la nota.
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    // Imágenes antes que enlaces: `![alt](url)` también matchea el patrón de
    // enlace, y al revés quedaría un `!` suelto.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;

  // Corta en el último espacio para no partir una palabra por la mitad.
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
