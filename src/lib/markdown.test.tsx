import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownContent, markdownToPlainText, safeUrl } from "./markdown";

/** Renderiza y devuelve el HTML resultante, para afirmar sobre él. */
function renderMarkdown(markdown: string): string {
  const { container } = render(<MarkdownContent>{markdown}</MarkdownContent>);
  return container.innerHTML;
}

/**
 * Renderiza y devuelve el nodo, para afirmar sobre el DOM y no sobre el string.
 *
 * Para la sanitización la diferencia importa: cuando `react-markdown` escapa
 * HTML crudo, el texto `onerror="…"` **sí aparece** en `innerHTML` —escapado, e
 * inerte—. Buscarlo como substring daría un falso positivo. Lo que hay que
 * comprobar es que no exista el elemento ni el atributo de verdad.
 */
function renderDom(markdown: string): HTMLElement {
  return render(<MarkdownContent>{markdown}</MarkdownContent>).container;
}

/** Si algún elemento del árbol tiene el atributo dado. */
function hasAttributeAnywhere(root: HTMLElement, attribute: string): boolean {
  return root.querySelector(`[${attribute}]`) !== null;
}

describe("safeUrl", () => {
  it.each([
    "https://roahoki.com",
    "http://ejemplo.com/ruta?a=1",
    "mailto:hola@roahoki.com",
    "/logbook/otra-nota",
    "#seccion",
    "../relativa",
  ])("acepta %o", (url) => {
    expect(safeUrl(url)).toBe(url);
  });

  it.each([
    ["javascript", "javascript:alert(1)"],
    ["javascript con mayúsculas", "JavaScript:alert(1)"],
    ["javascript con espacios", "  javascript:alert(1)  "],
    ["data con html", "data:text/html;base64,PHNjcmlwdD4="],
    ["vbscript", "vbscript:msgbox(1)"],
    ["file", "file:///etc/passwd"],
  ])("rechaza %s", (_label, url) => {
    expect(safeUrl(url)).toBe("");
  });

  it("rechaza la cadena vacía", () => {
    expect(safeUrl("")).toBe("");
    expect(safeUrl("   ")).toBe("");
  });
});

describe("MarkdownContent — render", () => {
  it("renderiza encabezados y párrafos", () => {
    const html = renderMarkdown("# Título\n\nUn párrafo.");

    expect(html).toContain("<h1>Título</h1>");
    expect(html).toContain("<p>Un párrafo.</p>");
  });

  it("renderiza listas y énfasis", () => {
    const html = renderMarkdown("- uno\n- **dos**");

    expect(html).toContain("<li>uno</li>");
    expect(html).toContain("<strong>dos</strong>");
  });

  it("renderiza tablas, que son de GFM y no de markdown base", () => {
    const dom = renderDom("| a | b |\n| - | - |\n| 1 | 2 |");

    expect(dom.querySelector("table")).not.toBeNull();
    expect(dom.querySelector("td")?.textContent).toBe("1");
  });

  /**
   * `react-markdown` pasa el nodo del AST como prop `node`. Al esparcir el
   * resto de las props en el elemento, terminaba en el HTML como
   * `node="[object Object]"`, en cada enlace, imagen y tabla de cada nota.
   */
  it("no filtra la prop `node` al DOM", () => {
    const dom = renderDom(
      "| a |\n| - |\n| 1 |\n\n[link](https://x.test)\n\n![alt](https://x.test/a.png)",
    );

    expect(dom.querySelector("[node]")).toBeNull();
    expect(dom.innerHTML).not.toContain("[object Object]");
  });

  // Una tabla ancha se cortaba por la derecha en 390px, sin forma de ver el
  // resto. El contenedor le da scroll propio.
  it("envuelve las tablas en un contenedor con scroll horizontal", () => {
    const dom = renderDom("| a | b |\n| - | - |\n| 1 | 2 |");
    const table = dom.querySelector("table");

    expect(table?.parentElement).toHaveClass("overflow-x-auto");
  });

  it("renderiza bloques de código sin ejecutarlos", () => {
    const html = renderMarkdown("```js\nalert(1)\n```");

    expect(html).toContain("<code");
    expect(html).toContain("alert(1)");
  });
});

/**
 * Lo que el roadmap pide probar: sanitización de HTML malicioso.
 *
 * `react-markdown` no interpreta HTML crudo salvo que se instale `rehype-raw`,
 * que deliberadamente no está. Estos tests fijan esa propiedad, para que
 * agregar el plugin después rompa la suite en vez de abrir un XSS en silencio.
 */
describe("MarkdownContent — sanitización", () => {
  it("no ejecuta un <script> del cuerpo: lo muestra como texto", () => {
    const source = '<script>alert("xss")</script>';
    const dom = renderDom(source);

    expect(dom.querySelector("script")).toBeNull();
    // El markup sobrevive como contenido de texto, que es lo que se quiere ver.
    expect(dom.textContent).toContain(source);
  });

  it("no deja pasar un <img onerror>", () => {
    const dom = renderDom('<img src="x" onerror="alert(1)">');

    // No existe el elemento ni el handler: el markup quedó como texto inerte.
    expect(dom.querySelector("img")).toBeNull();
    expect(hasAttributeAnywhere(dom, "onerror")).toBe(false);
  });

  it("no deja pasar un <iframe>", () => {
    const dom = renderDom('<iframe src="https://evil.test"></iframe>');

    expect(dom.querySelector("iframe")).toBeNull();
  });

  it("no deja pasar atributos de evento en HTML crudo", () => {
    const dom = renderDom('<div onclick="alert(1)">hola</div>');

    expect(dom.querySelector("div[onclick]")).toBeNull();
    expect(hasAttributeAnywhere(dom, "onclick")).toBe(false);
  });

  it("degrada a texto un enlace con javascript:", () => {
    const html = renderMarkdown("[haz click](javascript:alert(1))");

    expect(html).not.toContain("javascript:");
    // El texto del enlace sobrevive: la nota se sigue leyendo entera.
    expect(screen.getByText("haz click")).toBeDefined();
  });

  it("descarta una imagen con src peligroso", () => {
    const html = renderMarkdown("![x](javascript:alert(1))");

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<img");
  });

  it("descarta una imagen con data:text/html", () => {
    const html = renderMarkdown("![x](data:text/html;base64,PHNjcmlwdD4=)");

    expect(html).not.toContain("<img");
  });
});

describe("MarkdownContent — enlaces", () => {
  it("los externos abren en pestaña nueva con noopener", () => {
    const html = renderMarkdown("[fuera](https://ejemplo.com)");

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  // Sin `noopener` la página destino puede manipular la pestaña de origen.
  it("los internos no abren en pestaña nueva", () => {
    const html = renderMarkdown("[dentro](/logbook/otra)");

    expect(html).not.toContain('target="_blank"');
    expect(html).toContain('href="/logbook/otra"');
  });
});

describe("markdownToPlainText", () => {
  it("quita la sintaxis de encabezados y énfasis", () => {
    expect(
      markdownToPlainText("# Título\n\nUn **párrafo** con _énfasis_."),
    ).toBe("Título Un párrafo con énfasis.");
  });

  it("conserva el texto de los enlaces y descarta la URL", () => {
    expect(markdownToPlainText("Mira [esto](https://ejemplo.com).")).toBe(
      "Mira esto.",
    );
  });

  it("descarta las imágenes enteras, incluido el alt", () => {
    expect(markdownToPlainText("Antes ![una foto](/a.png) después")).toBe(
      "Antes después",
    );
  });

  it("descarta los bloques de código", () => {
    expect(markdownToPlainText("Texto\n\n```js\nalert(1)\n```\n\nMás")).toBe(
      "Texto Más",
    );
  });

  it("quita las marcas de cita", () => {
    expect(markdownToPlainText("> una cita")).toBe("una cita");
  });

  it("corta al largo pedido sin partir palabras", () => {
    const result = markdownToPlainText("palabra ".repeat(50), 20);

    expect(result.length).toBeLessThanOrEqual(21); // 20 + el carácter «…»
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toContain("palab…");
  });

  it("no agrega puntos suspensivos si el texto ya entra", () => {
    expect(markdownToPlainText("Corto", 200)).toBe("Corto");
  });
});
