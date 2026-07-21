import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TipsCerimoniaForm } from "@/components/admin/TipsCerimoniaForm";
import { tipsCerimoniaContentSchema } from "@/application/content/schemas";

describe("TipsCerimoniaForm", () => {
  it("renders no route fields when there are no existing routes", () => {
    const content = tipsCerimoniaContentSchema.parse({});
    render(<TipsCerimoniaForm defaultValues={content} />);

    expect(screen.getByText("Nenhuma rota adicionada ainda.")).toBeInTheDocument();
  });

  it("renders one block per existing route", () => {
    const content = tipsCerimoniaContentSchema.parse({
      routes: [
        { originLabel: "Vindo de BH", instructions: "Siga pela BR-040.", mapUrl: null },
        { originLabel: "Vindo de SP", instructions: "Siga pela Fernão Dias.", mapUrl: null },
      ],
    });
    render(<TipsCerimoniaForm defaultValues={content} />);

    expect(screen.getByDisplayValue("Vindo de BH")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Vindo de SP")).toBeInTheDocument();
    expect(screen.getAllByText("× Remover esta rota")).toHaveLength(2);
  });

  it("adds a new route block when clicking + Adicionar rota", async () => {
    const user = userEvent.setup();
    const content = tipsCerimoniaContentSchema.parse({});
    render(<TipsCerimoniaForm defaultValues={content} />);

    await user.click(screen.getByText("+ Adicionar rota"));

    expect(screen.getByLabelText("Vindo de...")).toBeInTheDocument();
  });

  it("removes a route block when clicking its × Remover esta rota button", async () => {
    const user = userEvent.setup();
    const content = tipsCerimoniaContentSchema.parse({
      routes: [{ originLabel: "Vindo de BH", instructions: "Siga pela BR-040.", mapUrl: null }],
    });
    render(<TipsCerimoniaForm defaultValues={content} />);

    await user.click(screen.getByText("× Remover esta rota"));

    expect(screen.queryByDisplayValue("Vindo de BH")).not.toBeInTheDocument();
  });
});
