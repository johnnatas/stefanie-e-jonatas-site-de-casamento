import { Resend } from "resend";
import { EmailGateway, SendEmailInput } from "@/application/ports/EmailGateway";
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { getEnv } from "@/infrastructure/config/env";

const FROM_ADDRESS = "Stéfanie & Jonatas <lembretes@sjcasamento.site>";

/**
 * Wraps every outgoing notification in the site's own visual identity
 * (centered logo, light-green card on a light-green page background, the
 * same Playfair Display / Inter fonts as the site) so emails read as an
 * extension of sjcasamento.site rather than a bare text message. Email
 * clients strip <style> blocks and most external fonts, so everything is
 * inlined and font stacks fall back to system serif/sans-serif.
 */
function renderEmailShell(bodyHtml: string): string {
  const logoUrl = `${getEnv().NEXT_PUBLIC_SITE_URL}/images/logo.png`;

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin: 0; padding: 0; background-color: #e3e8c8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #e3e8c8;">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="100%" style="max-width: 480px; background-color: #feffed; border-radius: 12px;">
            <tr>
              <td align="center" style="padding: 32px 32px 16px;">
                <img src="${logoUrl}" alt="Stéfanie &amp; Jonatas" width="110" style="display: block; border: 0;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px 40px; font-family: 'Inter', Helvetica, Arial, sans-serif; color: #242a16; font-size: 15px; line-height: 1.7;">
                ${bodyHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

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
      html: renderEmailShell(input.html),
    });

    if (result.error) {
      throw new Error(`Failed to send email via Resend: ${result.error.message}`);
    }
  }
}
