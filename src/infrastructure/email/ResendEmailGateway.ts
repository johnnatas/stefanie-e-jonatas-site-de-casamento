import { Resend } from "resend";
import { EmailGateway, SendEmailInput } from "@/application/ports/EmailGateway";
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";

const FROM_ADDRESS = "Stéfanie & Jonatas <lembretes@sjcasamento.site>";

export class ResendEmailGateway implements EmailGateway {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async sendEmail(input: SendEmailInput): Promise<void> {
    const settings = await this.securitySettingsRepository.getSettings();
    if (!settings.resendApiKey) {
      throw new Error("Resend não está configurado. Configure a API Key em Integrações.");
    }

    const client = new Resend(settings.resendApiKey);
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (result.error) {
      throw new Error(`Failed to send email via Resend: ${result.error.message}`);
    }
  }
}
