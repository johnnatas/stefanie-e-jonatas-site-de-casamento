import { EmailGateway, SendEmailInput } from "@/application/ports/EmailGateway";

export class FakeEmailGateway implements EmailGateway {
  readonly sentEmails: SendEmailInput[] = [];

  async sendEmail(input: SendEmailInput): Promise<void> {
    this.sentEmails.push(input);
  }
}
