import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TipsThemeMenu } from "@/components/tips/TipsThemeMenu";

describe("TipsThemeMenu", () => {
  it("links each theme to its ?tema= URL", () => {
    render(<TipsThemeMenu active="cerimonia" />);

    expect(screen.getByRole("link", { name: "a cerimônia" })).toHaveAttribute(
      "href",
      "/dicas-e-instrucoes?tema=cerimonia"
    );
    expect(screen.getByRole("link", { name: "código de vestimenta" })).toHaveAttribute(
      "href",
      "/dicas-e-instrucoes?tema=vestimenta"
    );
    expect(screen.getByRole("link", { name: "hospedagem" })).toHaveAttribute(
      "href",
      "/dicas-e-instrucoes?tema=hospedagem"
    );
  });

  it("marks the active theme with aria-current and the script style", () => {
    render(<TipsThemeMenu active="vestimenta" />);

    const active = screen.getByRole("link", { name: "código de vestimenta" });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(active).toHaveClass("font-script", "italic", "text-moss");

    const inactive = screen.getByRole("link", { name: "a cerimônia" });
    expect(inactive).not.toHaveAttribute("aria-current");
  });
});
