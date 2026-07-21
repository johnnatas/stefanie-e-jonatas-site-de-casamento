export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface EmailGateway {
  sendEmail(input: SendEmailInput): Promise<void>;
}
