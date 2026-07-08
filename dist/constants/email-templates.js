"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_TEMPLATE_SEEDS = exports.EMAIL_TEMPLATE_KEYS = void 0;
exports.EMAIL_TEMPLATE_KEYS = {
    ACCOUNT_CREDENTIALS: "account_credentials",
};
const credentialsHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your account is ready</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:28px 32px;">
              <p style="margin:0;color:#ecfdf5;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">{{appName}}</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:24px;line-height:1.3;font-weight:700;">Your account is ready</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#18181b;font-size:16px;line-height:1.6;">Hi {{name}},</p>
              <p style="margin:0 0 24px;color:#52525b;font-size:15px;line-height:1.7;">
                Your <strong style="color:#18181b;">{{roleLabel}}</strong> account has been created on {{appName}}.
                Use the credentials below to sign in.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Email</p>
                    <p style="margin:0 0 16px;color:#18181b;font-size:15px;font-weight:600;">{{email}}</p>
                    <p style="margin:0 0 8px;color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Temporary password</p>
                    <p style="margin:0;color:#18181b;font-size:18px;font-weight:700;letter-spacing:0.04em;font-family:JetBrains Mono,Consolas,monospace;">{{password}}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                <tr>
                  <td style="border-radius:8px;background:#059669;">
                    <a href="{{loginUrl}}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Sign in to your account</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#71717a;font-size:13px;line-height:1.6;">
                Please change your password after your first login. If you did not expect this email, contact your administrator.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e4e4e7;">
              <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.5;text-align:center;">
                &copy; {{appName}} &middot; Shared expense splitting made simple
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
const credentialsText = `Hi {{name}},

Your {{roleLabel}} account has been created on {{appName}}.

Email: {{email}}
Password: {{password}}

Sign in at: {{loginUrl}}

Please change your password after your first login.

If you did not expect this email, contact your administrator.

— {{appName}}`;
exports.EMAIL_TEMPLATE_SEEDS = [
    {
        key: exports.EMAIL_TEMPLATE_KEYS.ACCOUNT_CREDENTIALS,
        name: "Account credentials",
        description: "Sent when a room manager is approved or when a room manager invites a new roommate.",
        subject: "Your {{appName}} account is ready",
        htmlBody: credentialsHtml,
        textBody: credentialsText,
        variables: ["name", "email", "password", "roleLabel", "appName", "loginUrl"],
    },
];
