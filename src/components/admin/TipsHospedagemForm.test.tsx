import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TipsHospedagemForm } from "@/components/admin/TipsHospedagemForm";
import { tipsHospedagemContentSchema } from "@/application/content/schemas";

describe("TipsHospedagemForm", () => {
  it("renders one row per existing distance/hotel/airport", () => {
    const content = tipsHospedagemContentSchema.parse({
      distances: [{ label: "Belo Horizonte", km: "120 km" }],
      hotels: [{ name: "Pousada Serra Verde", distanceLabel: "500m", url: null }],
      airports: [{ name: "Aeroporto de Confins", distanceLabel: "90 km", driveTimeLabel: "1h20" }],
    });
    render(<TipsHospedagemForm defaultValues={content} />);

    expect(screen.getByDisplayValue("Belo Horizonte")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Pousada Serra Verde")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Aeroporto de Confins")).toBeInTheDocument();
  });

  it("adds a new distance row when clicking + Adicionar distância", async () => {
    const user = userEvent.setup();
    const content = tipsHospedagemContentSchema.parse({});
    render(<TipsHospedagemForm defaultValues={content} />);

    await user.click(screen.getByText("+ Adicionar distância"));

    expect(screen.getByLabelText("Cidade/local")).toBeInTheDocument();
  });

  it("removes a hotel row when clicking its remove button", async () => {
    const user = userEvent.setup();
    const content = tipsHospedagemContentSchema.parse({
      hotels: [{ name: "Pousada Serra Verde", distanceLabel: null, url: null }],
    });
    render(<TipsHospedagemForm defaultValues={content} />);

    await user.click(screen.getByText("× Remover este hotel"));

    expect(screen.queryByDisplayValue("Pousada Serra Verde")).not.toBeInTheDocument();
  });
});
