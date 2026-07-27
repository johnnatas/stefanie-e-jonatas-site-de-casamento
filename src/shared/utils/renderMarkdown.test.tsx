import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderMarkdown } from "@/shared/utils/renderMarkdown";

describe("renderMarkdown", () => {
  it("renders bold and italic segments within a single paragraph", () => {
    render(<div>{renderMarkdown("Chegue às **16h** em ponto, *por favor*.")}</div>);

    expect(screen.getByText("16h").tagName).toBe("STRONG");
    expect(screen.getByText("por favor").tagName).toBe("EM");
  });

  it("splits blank-line-separated text into separate paragraphs", () => {
    const { container } = render(<div>{renderMarkdown("Primeiro parágrafo.\n\nSegundo parágrafo.")}</div>);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent("Primeiro parágrafo.");
    expect(paragraphs[1]).toHaveTextContent("Segundo parágrafo.");
  });

  it("renders single line breaks within a paragraph as <br />, not a run-on line", () => {
    const { container } = render(
      <div>{renderMarkdown("1. Siga pela BR-040.\n2. Vire à direita.\n3. Chegue ao local.")}</div>
    );

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs).toHaveLength(1);
    expect(paragraphs[0].querySelectorAll("br")).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent("1. Siga pela BR-040.2. Vire à direita.3. Chegue ao local.");
  });

  it("treats \\r\\n line endings the same as \\n", () => {
    const { container } = render(<div>{renderMarkdown("Linha um.\r\nLinha dois.")}</div>);

    expect(container.querySelectorAll("br")).toHaveLength(1);
  });

  it("never renders raw HTML tags as markup — they show as literal text", () => {
    render(<div>{renderMarkdown("<script>alert('x')</script>")}</div>);

    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText(/alert/)).toBeInTheDocument();
  });
});
