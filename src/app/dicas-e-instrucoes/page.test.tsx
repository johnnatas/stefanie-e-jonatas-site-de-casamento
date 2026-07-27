import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { redirect } from "next/navigation";
import TipsPage from "./page";
import {
  tipsCerimoniaContentSchema,
  tipsTrajeContentSchema,
  tipsHospedagemContentSchema,
} from "@/application/content/schemas";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/infrastructure/composition", () => ({
  getSiteContentOrDefault: vi.fn(async (slug: string) => {
    if (slug === "tips-cerimonia") return tipsCerimoniaContentSchema.parse({});
    if (slug === "tips-traje") return tipsTrajeContentSchema.parse({});
    if (slug === "tips-hospedagem") return tipsHospedagemContentSchema.parse({});
    throw new Error(`Unexpected slug: ${slug}`);
  }),
}));

describe("TipsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to the ceremony theme when no tema is provided", async () => {
    render(await TipsPage({ searchParams: Promise.resolve({}) }));

    expect(redirect).toHaveBeenCalledWith("/dicas-e-instrucoes?tema=cerimonia");
  });

  it("redirects to the ceremony theme when tema is invalid", async () => {
    render(await TipsPage({ searchParams: Promise.resolve({ tema: "xpto" }) }));

    expect(redirect).toHaveBeenCalledWith("/dicas-e-instrucoes?tema=cerimonia");
  });

  it("does not redirect when tema is a valid theme", async () => {
    render(await TipsPage({ searchParams: Promise.resolve({ tema: "vestimenta" }) }));

    expect(redirect).not.toHaveBeenCalled();
  });
});
