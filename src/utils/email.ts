import nodemailer from "nodemailer"
import { env } from "@/config/env"
import { EMAIL_TEMPLATE_KEYS } from "@/constants/email-templates"
import {
  emailTemplateService,
  renderEmailTemplate,
} from "@/modules/email-templates/email-template.service"
import { logger } from "@/utils/logger"

type CredentialsEmailInput = {
  to: string
  name: string
  password: string
  roleLabel: string
}

function createTransport() {
  if (!env.smtpHost) return null

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth:
      env.smtpUser && env.smtpPass
        ? { user: env.smtpUser, pass: env.smtpPass }
        : undefined,
  })
}

export async function sendTemplatedEmail(
  templateKey: string,
  to: string,
  variables: Record<string, string>
): Promise<void> {
  const template = await emailTemplateService.getByKey(templateKey)

  const subject = renderEmailTemplate(template.subject, variables)
  const html = renderEmailTemplate(template.htmlBody, variables)
  const text = renderEmailTemplate(template.textBody, variables)

  const transport = createTransport()

  if (!transport) {
    logger.info(`[email:dev] Template "${templateKey}" to ${to}`, {
      subject,
      variables: { ...variables, password: variables.password ? "[redacted]" : undefined },
    })
    return
  }

  await transport.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    text,
    html,
  })
}

export async function sendCredentialsEmail(input: CredentialsEmailInput): Promise<void> {
  const variables = {
    name: input.name,
    email: input.to,
    password: input.password,
    roleLabel: input.roleLabel,
    appName: env.appName,
    loginUrl: `${env.appUrl}/login`,
  }

  await sendTemplatedEmail(EMAIL_TEMPLATE_KEYS.ACCOUNT_CREDENTIALS, input.to, variables)
}
