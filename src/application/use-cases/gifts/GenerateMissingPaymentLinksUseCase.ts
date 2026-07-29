import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

export interface GenerateMissingPaymentLinksResult {
  generated: number;
  failed: { giftId: string; giftName: string; reason: string }[];
}

export class GenerateMissingPaymentLinksUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly refreshGiftPaymentLinkUseCase: RefreshGiftPaymentLinkUseCase
  ) {}

  async execute(provider: PaymentProvider): Promise<GenerateMissingPaymentLinksResult> {
    const gifts = await this.giftRepository.findAll();
    const missing = gifts.filter((gift) => !gift.hasLinkFor(provider));

    let generated = 0;
    const failed: GenerateMissingPaymentLinksResult["failed"] = [];

    for (const gift of missing) {
      try {
        await this.refreshGiftPaymentLinkUseCase.execute(gift, provider);
        generated++;
      } catch (error) {
        failed.push({
          giftId: gift.id!,
          giftName: gift.name,
          reason: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
    }

    return { generated, failed };
  }
}
