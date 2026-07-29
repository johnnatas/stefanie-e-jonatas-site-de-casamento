import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import {
  GenerateMissingPaymentLinksResult,
  GenerateMissingPaymentLinksUseCase,
} from "@/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

export interface UpdateActivePaymentProviderInput {
  provider: PaymentProvider;
  infinitePayHandle?: string;
}

export class UpdateActivePaymentProviderUseCase {
  constructor(
    private readonly securitySettingsRepository: AdminSecuritySettingsRepository,
    private readonly generateMissingPaymentLinksUseCase: GenerateMissingPaymentLinksUseCase
  ) {}

  async execute(input: UpdateActivePaymentProviderInput): Promise<GenerateMissingPaymentLinksResult> {
    if (input.provider === "infinite_pay") {
      const handle = input.infinitePayHandle?.trim();
      if (!handle) {
        throw new InvalidSecurityCredentialError(
          "Informe o handle da Infinite Pay antes de ativar este provedor."
        );
      }
      await this.securitySettingsRepository.updateInfinitePayHandle(handle);
    }

    await this.securitySettingsRepository.updateActivePaymentProvider(input.provider);
    return this.generateMissingPaymentLinksUseCase.execute(input.provider);
  }
}
