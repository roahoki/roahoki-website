import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { countWords, editorExtensions } from "./extensions";

let editor: Editor | undefined;

function roundTrip(markdown: string): string {
  editor = new Editor({
    element: document.createElement("div"),
    extensions: editorExtensions(),
    content: markdown,
    contentType: "markdown",
  });
  return editor.getMarkdown();
}

afterEach(() => {
  editor?.destroy();
  editor = undefined;
});

/**
 * El editor guarda markdown: abrir una nota y guardarla sin tocarla no puede
 * cambiar lo que dice. Estos casos son lo que usan las notas existentes.
 */
describe("ida y vuelta del markdown", () => {
  it.each([
    ["párrafos", "Primer párrafo.\n\nSegundo párrafo."],
    ["título de nivel 1", "# un título"],
    ["subtítulo", "## lo que cambió"],
    ["negrita", "No fue la **técnica**, fue el orden."],
    ["link", "Lo vi en [el video](https://youtube.com/watch?v=x)."],
    [
      "imagen",
      "![](https://xutwlpliollsczaatoxd.supabase.co/storage/v1/object/public/logbook-images/a.jpg)",
    ],
    ["lista", "- marcar\n- cortar"],
    ["cita", "> alguien dijo algo"],
  ])("conserva %s", (_, markdown) => {
    expect(roundTrip(markdown).trim()).toBe(markdown);
  });

  // Las notas viejas tienen itálica con guion bajo. El editor la reescribe con
  // asterisco, que significa lo mismo; lo que no puede pasar es que se pierda.
  it("conserva la itálica de las notas viejas", () => {
    expect(roundTrip("dijo _alguien_ ayer").trim()).toMatch(
      /dijo [*_]alguien[*_] ayer/,
    );
  });

  // Lo que ya viene en el markdown lo filtra el render público (`safeUrl`);
  // acá lo que importa es que el editor no deje crear uno nuevo.
  it("no deja crear un link con un esquema peligroso", () => {
    roundTrip("click");
    editor?.commands.selectAll();

    expect(editor?.commands.setLink({ href: "javascript:alert(1)" })).toBe(
      false,
    );
    expect(editor?.getMarkdown()).not.toContain("javascript:");
  });
});

describe("atajos", () => {
  function press(key: string) {
    const view = editor?.view;
    if (!view) throw new Error("sin editor");
    const event = new KeyboardEvent("keydown", { key, ctrlKey: true });
    return view.someProp("handleKeyDown", (handle) => handle(view, event));
  }

  // Sin itálica en la marca: Ctrl I no hace nada.
  it("Ctrl I no aplica itálica", () => {
    roundTrip("hola");
    editor?.commands.selectAll();

    expect(press("i")).toBeFalsy();
    expect(editor?.getMarkdown()).toBe("hola");
  });

  // El control: los atajos sí funcionan.
  it("Ctrl B aplica negrita", () => {
    roundTrip("hola");
    editor?.commands.selectAll();

    expect(press("b")).toBe(true);
    expect(editor?.getMarkdown()).toBe("**hola**");
  });

  it("no registra el subrayado", () => {
    roundTrip("hola");
    const names = editor?.extensionManager.extensions.map((e) => e.name);

    expect(names).not.toContain("underline");
    expect(names).toEqual(expect.arrayContaining(["bold", "heading", "image"]));
  });
});

describe("countWords", () => {
  it.each([
    ["", 0],
    ["   ", 0],
    ["una", 1],
    ["la segunda  manga\nsalió derecha", 5],
  ])("%o tiene %i palabras", (text, words) => {
    expect(countWords(text)).toBe(words);
  });
});
