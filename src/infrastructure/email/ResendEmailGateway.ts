import { Resend } from "resend";
import { EmailGateway, SendEmailInput } from "@/application/ports/EmailGateway";
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { SiteContentRepository } from "@/domain/repositories/SiteContentRepository";
import { identidadeVisualContentSchema } from "@/application/content/schemas";
import { getEnv } from "@/infrastructure/config/env";

const FROM_ADDRESS = "Stéfanie & Jonatas <lembretes@sjcasamento.site>";

/**
 * Derives a plain-text alternative from a template's simple body HTML
 * (only <p>, <strong>, <br/> and <a href> are ever used — see templates.ts).
 * Spam filters weigh the absence of a text/plain MIME part heavily, so
 * every email needs one alongside the HTML part, not just for looks.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Resolves which logo image an outgoing e-mail should embed: the
 * admin-uploaded dark-variant logo (src/app/admin/(protected)/conteudo/
 * identidade-visual) when one exists, otherwise the static asset shipped
 * with the site.
 */
export function resolveEmailLogoUrl(logoDark: string | null, siteUrl: string): string {
  return logoDark ?? `${siteUrl}/images/logo.png`;
}

/**
 * Wraps every outgoing notification in the site's own visual identity
 * (centered logo, light-green card on a light-green page background, the
 * same Playfair Display / Inter fonts as the site) so emails read as an
 * extension of sjcasamento.site rather than a bare text message. Email
 * clients strip <style> blocks and most external fonts, so everything is
 * inlined and font stacks fall back to system serif/sans-serif.
 */
function renderEmailShell(bodyHtml: string, logoUrl: string): string {
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
  constructor(
    private readonly securitySettingsRepository: AdminSecuritySettingsRepository,
    private readonly siteContentRepository: SiteContentRepository
  ) {}

  async sendEmail(input: SendEmailInput): Promise<void> {
    const settings = await this.securitySettingsRepository.getSettings();
    if (!settings.resendApiKey) {
      throw new Error("Resend não está configurado. Configure a API Key em Integrações.");
    }

    const identitySection = await this.siteContentRepository.findBySlug("identidade-visual");
    const { logoDark } = identidadeVisualContentSchema.parse(identitySection?.content ?? {});
    const logoUrl = resolveEmailLogoUrl(logoDark, getEnv().NEXT_PUBLIC_SITE_URL);

    const client = new Resend(settings.resendApiKey);
    const result = await client.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: input.subject,
      html: renderEmailShell(input.html, logoUrl),
      text: htmlToPlainText(input.html),
    });

    if (result.error) {
      throw new Error(`Failed to send email via Resend: ${result.error.message}`);
    }
  }
}
