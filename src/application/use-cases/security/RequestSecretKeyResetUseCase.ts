import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { EmailGateway } from "@/application/ports/EmailGateway";
import { hashSecretKey } from "@/infrastructure/security/secretKeyHashing";
import { secretKeyResetEmail } from "@/infrastructure/email/templates";
import { randomBytes } from "crypto";

const TOKEN_TTL_MS = 60 * 60 * 1000;

export interface RequestSecretKeyResetInput {
  requesterEmail: string;
  buildResetUrl: (token: string) => string;
}

export class RequestSecretKeyResetUseCase {
  constructor(
    private readonly securitySettingsRepository: AdminSecuritySettingsRepository,
    private readonly emailGateway: EmailGateway
  ) {}

  async execute(input: RequestSecretKeyResetInput): Promise<void> {
    const token = randomBytes(32).toString("hex");
    const { hash, salt } = hashSecretKey(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    await this.securitySettingsRepository.setSecretResetToken(hash, salt, expiresAt);

    const { subject, html } = secretKeyResetEmail({ resetUrl: input.buildResetUrl(token) });
    await this.emailGateway.sendEmail({ to: input.requesterEmail, subject, html });
  }
}
