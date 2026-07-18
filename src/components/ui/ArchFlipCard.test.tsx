import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArchFlipCard } from "@/components/ui/ArchFlipCard";

describe("ArchFlipCard", () => {
  it("renders the number on the front face and the details on the back face", () => {
    render(
      <ArchFlipCard
        number="01."
        image={<span>foto do começo</span>}
        title="O começo"
        date="10 de abril de 2018"
        description="Um encontro casual que mudou tudo."
      />
    );

    expect(screen.getByText("01.")).toBeInTheDocument();
    expect(screen.getByText("foto do começo")).toBeInTheDocument();
    expect(screen.getByText("O começo")).toBeInTheDocument();
    expect(screen.getByText("10 de abril de 2018")).toBeInTheDocument();
    expect(screen.getByText("Um encontro casual que mudou tudo.")).toBeInTheDocument();
  });
});
