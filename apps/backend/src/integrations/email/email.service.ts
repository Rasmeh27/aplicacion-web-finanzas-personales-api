import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type EmailProvider = 'emailjs' | 'console' | 'disabled';

export type SendPasswordRecoveryEmailInput = {
  to: string;
  recoveryLink: string;
};

export type SendPremiumAlertEmailInput = {
  to: string;
  subject: string;
  summary: string;
  alerts: string[];
};

export type SendSignupConfirmationEmailInput = {
  to: string;
  fullName: string;
  confirmationLink: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: EmailProvider;

  constructor(private readonly config: ConfigService) {
    this.provider = this.resolveProvider();
  }

  isCustomEmailConfigured(): boolean {
    if (this.provider === 'console') return true;
    if (this.provider !== 'emailjs') return false;

    return Boolean(
      this.config.get<string>('EMAILJS_SERVICE_ID') &&
        this.config.get<string>('EMAILJS_TEMPLATE_PASSWORD_RESET_ID') &&
        this.config.get<string>('EMAILJS_PUBLIC_KEY'),
    );
  }

  isPremiumAlertEmailConfigured(): boolean {
    if (this.provider === 'console') return true;
    if (this.provider !== 'emailjs') return false;

    return Boolean(
      this.config.get<string>('EMAILJS_SERVICE_ID') &&
        this.config.get<string>('EMAILJS_TEMPLATE_PREMIUM_ALERT_ID') &&
        this.config.get<string>('EMAILJS_PUBLIC_KEY'),
    );
  }

  isSignupConfirmationConfigured(): boolean {
    if (this.provider === 'console') return true;
    if (this.provider !== 'emailjs') return false;

    return Boolean(
      this.config.get<string>('EMAILJS_SERVICE_ID') &&
        this.config.get<string>('EMAILJS_TEMPLATE_SIGNUP_CONFIRMATION_ID') &&
        this.config.get<string>('EMAILJS_PUBLIC_KEY'),
    );
  }

  async sendPasswordRecoveryEmail(input: SendPasswordRecoveryEmailInput): Promise<void> {
    if (this.provider === 'console') {
      this.logger.warn(`Password recovery link for ${input.to}: ${input.recoveryLink}`);
      return;
    }

    if (this.provider !== 'emailjs') {
      throw new ServiceUnavailableException('Custom email provider is not configured.');
    }

    await this.sendWithEmailJs(input);
  }

  async sendPremiumAlertEmail(input: SendPremiumAlertEmailInput): Promise<void> {
    if (this.provider === 'console') {
      this.logger.warn(`Premium alert email for ${input.to}: ${input.subject} - ${input.alerts.join(' | ')}`);
      return;
    }

    if (this.provider !== 'emailjs') {
      throw new ServiceUnavailableException('Custom email provider is not configured.');
    }

    await this.sendWithEmailJs({
      to: input.to,
      templateId: this.config.get<string>('EMAILJS_TEMPLATE_PREMIUM_ALERT_ID'),
      params: this.buildGenericTemplateParams({
        to: input.to,
        toName: input.to.split('@')[0],
        subject: input.subject,
        headline: 'Tienes nuevas alertas financieras',
        message: input.summary,
        actionUrl: this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000',
        actionLabel: 'Ver mi panel',
        detailsText: input.alerts.join('\n'),
      }),
    });
  }

  async sendSignupConfirmationEmail(input: SendSignupConfirmationEmailInput): Promise<void> {
    if (this.provider === 'console') {
      this.logger.warn(`Signup confirmation link for ${input.to}: ${input.confirmationLink}`);
      return;
    }

    if (this.provider !== 'emailjs') {
      throw new ServiceUnavailableException('Custom email provider is not configured.');
    }

    await this.sendWithEmailJs({
      to: input.to,
      templateId: this.config.get<string>('EMAILJS_TEMPLATE_SIGNUP_CONFIRMATION_ID'),
      params: this.buildGenericTemplateParams({
        to: input.to,
        toName: input.fullName || input.to.split('@')[0],
        subject: 'Confirma tu cuenta en MONI',
        headline: 'Bienvenido a MONI',
        message: 'Gracias por crear tu cuenta. Confirma tu correo para activar tu acceso.',
        actionUrl: input.confirmationLink,
        actionLabel: 'Confirmar mi cuenta',
        detailsText: 'Si no creaste esta cuenta, puedes ignorar este correo.',
      }),
    });
  }

  private async sendWithEmailJs(
    input:
      | SendPasswordRecoveryEmailInput
      | {
          to: string;
          templateId?: string;
          params: Record<string, string>;
        },
  ): Promise<void> {
    const serviceId = this.config.get<string>('EMAILJS_SERVICE_ID');
    const templateId =
      'templateId' in input ? input.templateId : this.config.get<string>('EMAILJS_TEMPLATE_PASSWORD_RESET_ID');
    const publicKey = this.config.get<string>('EMAILJS_PUBLIC_KEY');
    const privateKey = this.config.get<string>('EMAILJS_PRIVATE_KEY');

    if (!serviceId || !templateId || !publicKey) {
      throw new ServiceUnavailableException('EmailJS is missing required credentials.');
    }

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey || undefined,
        template_params:
          'params' in input
            ? input.params
            : {
                email: input.to,
                to_email: input.to,
                name: input.to.split('@')[0],
                to_name: input.to.split('@')[0],
                app_name: 'MONI',
                APP_NAME: 'MONI',
                reset_link: input.recoveryLink,
                link: input.recoveryLink,
                action_url: input.recoveryLink,
                action_label: 'Crear nueva contraseña',
                headline: 'Restablece tu contraseña',
                message: 'Recibimos una solicitud para cambiar la contraseña de tu cuenta en MONI.',
                details_text: 'Si no solicitaste este cambio, puedes ignorar este correo.',
                reply_to: this.config.get<string>('EMAIL_SUPPORT_ADDRESS') ?? 'soporte@moni.local',
                support_email: this.config.get<string>('EMAIL_SUPPORT_ADDRESS') ?? 'soporte@moni.local',
                current_year: new Date().getFullYear().toString(),
              },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`EmailJS send failed status=${response.status} body=${text.slice(0, 300)}`);
      throw new BadRequestException('No pudimos enviar el correo de recuperación ahora mismo.');
    }
  }

  private resolveProvider(): EmailProvider {
    const value = (this.config.get<string>('EMAIL_PROVIDER') ?? 'disabled').trim().toLowerCase();
    if (value === 'emailjs' || value === 'console') return value;
    return 'disabled';
  }

  private buildGenericTemplateParams(input: {
    to: string;
    toName: string;
    subject: string;
    headline: string;
    message: string;
    actionUrl: string;
    actionLabel: string;
    detailsText: string;
  }): Record<string, string> {
    return {
      email: input.to,
      to_email: input.to,
      name: input.toName,
      to_name: input.toName,
      app_name: 'MONI',
      APP_NAME: 'MONI',
      subject: input.subject,
      headline: input.headline,
      message: input.message,
      action_url: input.actionUrl,
      action_label: input.actionLabel,
      details_text: input.detailsText,
      reply_to: this.config.get<string>('EMAIL_SUPPORT_ADDRESS') ?? 'soporte@moni.local',
      support_email: this.config.get<string>('EMAIL_SUPPORT_ADDRESS') ?? 'soporte@moni.local',
      current_year: new Date().getFullYear().toString(),
    };
  }
}
