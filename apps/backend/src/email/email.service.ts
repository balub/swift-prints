import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { Resend } from 'resend';

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
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    // Use mock email unless RESEND_API_KEY is configured
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    this.isMock = !resendApiKey;

    if (this.isMock) {
      this.logger.log(
        '📧 Email service running in MOCK mode (console logging)',
      );
      this.resend = null;
      this.fromEmail = 'noreply@swiftprints.local';
    } else {
      this.resend = new Resend(resendApiKey);
      this.fromEmail =
        this.configService.get<string>('RESEND_FROM_EMAIL') ||
        'noreply@swiftprints.com';
      this.logger.log(
        `📧 Email service initialized with Resend (from: ${this.fromEmail})`,
      );
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(order: OrderWithRelations): Promise<void> {
    const subject = `Swift Prints: Order #${order.id.slice(0, 8)} Confirmed`;
    const htmlBody = this.buildOrderConfirmationEmailHTML(order);
    const textBody = this.buildOrderConfirmationEmail(order);

    await this.sendEmail(order.participantEmail, subject, htmlBody, textBody);
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
    const htmlBody = this.buildStatusUpdateEmailHTML(order, previousStatus);
    const textBody = this.buildStatusUpdateEmail(order, previousStatus);

    await this.sendEmail(order.participantEmail, subject, htmlBody, textBody);
  }

  /**
   * Send email (mock or real via Resend)
   */
  private async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody: string,
  ): Promise<void> {
    if (this.isMock) {
      this.logger.log('━'.repeat(60));
      this.logger.log(`📧 EMAIL (MOCK)`);
      this.logger.log(`To: ${to}`);
      this.logger.log(`Subject: ${subject}`);
      this.logger.log(`Body:`);
      console.log(textBody);
      this.logger.log('━'.repeat(60));
      return;
    }

    if (!this.resend) {
      this.logger.error('Resend client not initialized');
      throw new Error('Email service not properly configured');
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject,
        html: htmlBody,
        text: textBody,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${to}:`, error);
        throw new Error(`Email sending failed: ${error.message}`);
      }

      this.logger.log(`✅ Email sent successfully to ${to} (ID: ${data?.id})`);
    } catch (error) {
      this.logger.error(`Error sending email to ${to}:`, error);
      throw error;
    }
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

  /**
   * Build HTML email template for order confirmation
   */
  private buildOrderConfirmationEmailHTML(order: OrderWithRelations): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - Swift Prints</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🖨️ Swift Prints</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Order Confirmation</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${this.escapeHtml(order.participantName)}!</p>
    
    <p>Your 3D print order has been confirmed. We're excited to bring your design to life!</p>
    
    <div style="background: white; border-radius: 6px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="margin-top: 0; color: #667eea; font-size: 20px;">Order Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Order ID:</td>
          <td style="padding: 8px 0; color: #111827; font-family: monospace;">${this.escapeHtml(order.id)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Team:</td>
          <td style="padding: 8px 0; color: #111827;">${this.escapeHtml(order.teamNumber)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">File:</td>
          <td style="padding: 8px 0; color: #111827;">${this.escapeHtml(order.upload.filename)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Printer:</td>
          <td style="padding: 8px 0; color: #111827;">${this.escapeHtml(order.printer.name)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Filament:</td>
          <td style="padding: 8px 0; color: #111827;">${this.escapeHtml(order.filament.name)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Total Cost:</td>
          <td style="padding: 8px 0; color: #111827; font-size: 18px; font-weight: 700;">₹${order.totalCost.toFixed(2)}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #dbeafe; border-radius: 6px; padding: 15px; margin: 20px 0; border-left: 4px solid #3b82f6;">
      <p style="margin: 0; color: #1e40af;">
        <strong>Status:</strong> <span style="text-transform: capitalize;">${order.status}</span>
      </p>
    </div>
    
    <p style="color: #6b7280;">You'll receive email updates when your print status changes.</p>
    
    <p style="margin-top: 30px;">Thanks for using Swift Prints! 🚀</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      This is an automated email. Please do not reply directly to this message.
    </p>
  </div>
</body>
</html>
`.trim();
  }

  /**
   * Build HTML email template for status updates
   */
  private buildStatusUpdateEmailHTML(
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

    const statusColors: Record<OrderStatus, string> = {
      PLACED: '#3b82f6',
      PRINTING: '#8b5cf6',
      READY: '#10b981',
      COMPLETED: '#10b981',
      CANCELLED: '#ef4444',
    };

    const currentColor = statusColors[order.status];
    const emoji = statusEmoji[order.status];
    const message = statusMessage[order.status];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Status Update - Swift Prints</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${currentColor} 0%, ${currentColor}dd 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">${emoji} Swift Prints</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Status Update</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${this.escapeHtml(order.participantName)}!</p>
    
    <p>Your order status has been updated:</p>
    
    <div style="background: white; border-radius: 6px; padding: 20px; margin: 20px 0; border-left: 4px solid ${currentColor};">
      <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
        <span style="font-size: 24px;">${emoji}</span>
        <div>
          <div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Previous Status</div>
          <div style="color: #9ca3af; text-transform: capitalize;">${previousStatus}</div>
        </div>
        <div style="flex: 1; text-align: center; color: #9ca3af;">➜</div>
        <div>
          <div style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Current Status</div>
          <div style="color: ${currentColor}; font-weight: 700; font-size: 18px; text-transform: capitalize;">${order.status}</div>
        </div>
      </div>
      
      <div style="background: ${currentColor}15; border-radius: 4px; padding: 15px; margin-top: 15px;">
        <p style="margin: 0; color: ${currentColor}; font-weight: 600;">${message}</p>
      </div>
    </div>
    
    <div style="background: white; border-radius: 6px; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea;">
      <h2 style="margin-top: 0; color: #667eea; font-size: 18px;">Order Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Order ID:</td>
          <td style="padding: 8px 0; color: #111827; font-family: monospace;">${this.escapeHtml(order.id)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">File:</td>
          <td style="padding: 8px 0; color: #111827;">${this.escapeHtml(order.upload.filename)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-weight: 600;">Team:</td>
          <td style="padding: 8px 0; color: #111827;">${this.escapeHtml(order.teamNumber)}</td>
        </tr>
      </table>
    </div>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      This is an automated email. Please do not reply directly to this message.
    </p>
  </div>
</body>
</html>
`.trim();
  }

  /**
   * Escape HTML special characters to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
