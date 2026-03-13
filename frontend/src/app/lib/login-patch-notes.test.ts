import { describe, expect, test } from "vitest";
import { parseLoginPatchNotes } from "./login-patch-notes";

describe("parseLoginPatchNotes", () => {
  test("extracts version, updatedAt and section bullets from markdown", () => {
    const markdown = `
# v3.1.0
> Atualizado em 2026-03-12

## O que mudou
- Novo relatorio anual
- Melhorias de performance

## Instrucoes importantes
- Fazer refresh apos login
- Rever categorias inativas
`;

    const parsed = parseLoginPatchNotes(markdown);

    expect(parsed.visible).toBe(true);
    expect(parsed.version).toBe("v3.1.0");
    expect(parsed.updatedAt).toBe("Atualizado em 2026-03-12");
    expect(parsed.changes).toEqual(["Novo relatorio anual", "Melhorias de performance"]);
    expect(parsed.instructions).toEqual(["Fazer refresh apos login", "Rever categorias inativas"]);
  });

  test("hides card when trigger is set to false", () => {
    const markdown = `
<!-- show-patch-notes: false -->
# v3.1.0
## O que mudou
- Pequeno ajuste visual
`;

    const parsed = parseLoginPatchNotes(markdown);

    expect(parsed.visible).toBe(false);
  });

  test("hides card when no content exists", () => {
    const parsed = parseLoginPatchNotes("# v3.1.0");

    expect(parsed.visible).toBe(false);
    expect(parsed.changes).toEqual([]);
    expect(parsed.instructions).toEqual([]);
  });
});
