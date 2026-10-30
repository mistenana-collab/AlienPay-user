import { Resend } from 'resend';

const DEFAULT_EMAIL_FROM = 'AlienPay <noreply@alienpay.com>';

function sanitizeEnvValue(val?: string): string {
  if (!val) return '';
  return val.replace(/["'`]/g, '').trim();
}

function resolveFromAddress(): string {
  const raw = sanitizeEnvValue(process.env.EMAIL_FROM);
  if (!raw) return DEFAULT_EMAIL_FROM;
  if (raw.includes('<') && raw.includes('>')) {
    const match = raw.match(/^([^<]*)<([^>]+)>/);
    if (match) {
      const name = match[1].trim() || 'AlienPay';
      const email = match[2].trim();
      if (email.includes('@')) {
        return `${name} <${email}>`;
      }
    }
  }
  if (!raw.includes('@') && raw.includes('.')) {
    return `AlienPay <noreply@${raw}>`;
  }
  return raw;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
  const apiKey = sanitizeEnvValue(process.env.RESEND_API_KEY);
  const fromAddress = resolveFromAddress();
  const recipient = sanitizeEnvValue(to);

  if (!apiKey || !recipient) {
    return true;
  }

  const resend = new Resend(apiKey);
  const plainText = text || html.replace(/<[^>]*>/g, '');

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [recipient],
      subject,
      html,
      text: plainText,
    });

    if (error) {
      return false;
    }

    if (data?.id) {
      console.log('[Email] Delivered:', data.id);
    }
    return true;
  } catch {
    return false;
  }
}

// 1. Send OTP verification email (same template as cryptofd)
export function getOTPEmailHtml(otp: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">AlienPay</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Secure Investment &amp; Settlement Platform</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Verify Your Email</h2>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            Use the following verification code to complete your authentication. This code will expire in 10 minutes.
          </p>
          
          <div style="background-color: #f3f4f6; border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10b981;">${otp}</span>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;">
            If you didn't request this code, please ignore this email or contact support if you have concerns.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} AlienPay. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendOTPEmail(email: string, otp: string): Promise<{ sent: boolean; html: string }> {
  const html = getOTPEmailHtml(otp);
  const sent = await sendEmail({
    to: email,
    subject: `${otp} - Your AlienPay Verification Code`,
    html,
  });
  return { sent, html };
}

// 2. Send password reset email (same template as cryptofd)
export function getPasswordResetEmailHtml(otp: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">AlienPay</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Secure Investment &amp; Settlement Platform</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h2>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            We received a request to reset your password. Use the code below to proceed. This code will expire in 10 minutes.
          </p>
          
          <div style="background-color: #f3f4f6; border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #10b981;">${otp}</span>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;">
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} AlienPay. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendPasswordResetEmail(email: string, otp: string): Promise<{ sent: boolean; html: string }> {
  const html = getPasswordResetEmailHtml(otp);
  const sent = await sendEmail({
    to: email,
    subject: `${otp} - Reset Your AlienPay Password`,
    html,
  });
  return { sent, html };
}

// 3. Send welcome email (same template as cryptofd)
export function getWelcomeEmailHtml(name?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Welcome to AlienPay!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Your Investment Journey Begins</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello${name ? ` ${name}` : ''}!</h2>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
            Thank you for joining AlienPay. You're now part of a community earning daily returns on their investments and automated bank settlements.
          </p>
          
          <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin: 0 0 20px 0;">
            <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;">Get Started:</h3>
            <ul style="color: #15803d; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Deposit USDT (BEP-20) to your unique personal HD wallet address</li>
              <li>Choose a VIP investment plan that fits your goals</li>
              <li>Link your bank account and earn daily automated commissions</li>
              <li>Invite friends and earn up to 10% referral commission</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
            Need help? Our support team is available 24/7.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} AlienPay. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendWelcomeEmail(email: string, name?: string): Promise<{ sent: boolean; html: string }> {
  const html = getWelcomeEmailHtml(name);
  const sent = await sendEmail({
    to: email,
    subject: 'Welcome to AlienPay - Start Earning Today!',
    html,
  });
  return { sent, html };
}

// 4. Send withdrawal confirmation email (same template as cryptofd)
export function getWithdrawalEmailHtml(amount: number, address: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">AlienPay</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Withdrawal Request</p>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Withdrawal Initiated</h2>
          <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
            Your withdrawal request has been submitted and is being processed.
          </p>
          
          <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; margin: 0 0 30px 0;">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Amount</p>
            <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: bold;">${amount.toFixed(2)} USDT</p>
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Destination Address (BEP-20)</p>
            <p style="margin: 0; color: #1f2937; font-size: 12px; word-break: break-all;">${address}</p>
          </div>
          
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;">
            Withdrawals are typically processed within 24 hours. You'll receive another email when the transaction is complete.
          </p>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            &copy; ${new Date().getFullYear()} AlienPay. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendWithdrawalEmail(email: string, amount: number, address: string): Promise<{ sent: boolean; html: string }> {
  const html = getWithdrawalEmailHtml(amount, address);
  const sent = await sendEmail({
    to: email,
    subject: `Withdrawal Request: ${amount.toFixed(2)} USDT`,
    html,
  });
  return { sent, html };
}
