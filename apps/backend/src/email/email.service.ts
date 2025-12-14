import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';

interface OrderWithRelations {
  id: string;
  participantName: string;
  participantEmail: string;
  teamNumber: string;
  status: OrderStatus;
  totalCost: number;
  upload: { filename: string };
  printer: { name: string };
  filament: { name: string };
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly isMock: boolean;

  constructor(private configService: ConfigService) {
    // Use mock email unless EMAIL_PROVIDER is configured
    this.isMock = !this.configService.get<string>('EMAIL_PROVIDER');

    if (this.isMock) {
      this.logger.log(
        '📧 Email service running in MOCK mode (console logging)',
      );
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order: OrderWithRelations): Promise<void> {
    const subject = `Swift Prints: Order #${order.id.slice(0, 8)} Confirmed`;
    const body = this.buildOrderConfirmationEmail(order);

    await this.sendEmail(order.participantEmail, subject, body);
  }

  /**
   * Send order status update email
   */
  async sendStatusUpdate(
    order: OrderWithRelations,
    previousStatus: OrderStatus,
  ): Promise<void> {
    const statusMessages: Record<OrderStatus, string> = {
      PLACED: 'Your order has been placed',
      PRINTING: 'Your print has started! 🖨️',
      READY: 'Your print is ready for pickup! 🎉',
      COMPLETED: 'Your order has been completed',
      CANCELLED: 'Your order has been cancelled',
    };

    const subject = `Swift Prints: ${statusMessages[order.status]}`;
    const body = this.buildStatusUpdateEmail(order, previousStatus);

    await this.sendEmail(order.participantEmail, subject, body);
  }

  /**
   * Send email (mock or real)
   */
  private async sendEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<void> {
    if (this.isMock) {
      this.logger.log('━'.repeat(60));
      this.logger.log(`📧 EMAIL (MOCK)`);
      this.logger.log(`To: ${to}`);
      this.logger.log(`Subject: ${subject}`);
      this.logger.log(`Body:`);
      console.log(body);
      this.logger.log('━'.repeat(60));
      return;
    }

    // TODO: Implement real email sending with Resend/SES/Mailgun
    this.logger.warn('Real email sending not implemented yet');
  }

  private buildOrderConfirmationEmail(order: OrderWithRelations): string {
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖨️ SWIFT PRINTS - ORDER CONFIRMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi ${order.participantName}!

Your 3D print order has been confirmed.

ORDER DETAILS
━━━━━━━━━━━━━
Order ID:     ${order.id}
Team:         ${order.teamNumber}
File:         ${order.upload.filename}
Printer:      ${order.printer.name}
Filament:     ${order.filament.name}
Total Cost:   ₹${order.totalCost}

STATUS: ${order.status}
━━━━━━━━━━━━━

You'll receive updates when your print status changes.

Thanks for using Swift Prints! 🚀

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
  }

  private buildStatusUpdateEmail(
    order: OrderWithRelations,
    previousStatus: OrderStatus,
  ): string {
    const statusEmoji: Record<OrderStatus, string> = {
      PLACED: '📋',
      PRINTING: '🖨️',
      READY: '✅',
      COMPLETED: '🎉',
      CANCELLED: '❌',
    };

    const statusMessage: Record<OrderStatus, string> = {
      PLACED: 'Your order is in the queue.',
      PRINTING: 'Your model is now being printed!',
      READY: 'Your print is complete and ready for pickup!',
      COMPLETED: 'Your order has been marked as completed. Thanks!',
      CANCELLED:
        'Your order has been cancelled. Please contact us if you have questions.',
    };

    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖨️ SWIFT PRINTS - STATUS UPDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hi ${order.participantName}!

Your order status has been updated:

${previousStatus} ➜ ${statusEmoji[order.status]} ${order.status}

${statusMessage[order.status]}

ORDER DETAILS
━━━━━━━━━━━━━
Order ID:     ${order.id}
File:         ${order.upload.filename}
Team:         ${order.teamNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
  }
}
