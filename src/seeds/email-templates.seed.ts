import { EMAIL_TEMPLATE_SEEDS } from "@/constants/email-templates"
import { EmailTemplate } from "@/modules/email-templates/email-template.model"
import { logger } from "@/utils/logger"

export async function seedEmailTemplates(): Promise<void> {
  for (const template of EMAIL_TEMPLATE_SEEDS) {
    await EmailTemplate.findOneAndUpdate(
      { key: template.key },
      {
        $set: {
          name: template.name,
          description: template.description,
          subject: template.subject,
          htmlBody: template.htmlBody,
          textBody: template.textBody,
          variables: template.variables,
          isActive: true,
        },
      },
      { upsert: true, returnDocument: "after" }
    )
  }

  logger.info(`Email templates seeded (${EMAIL_TEMPLATE_SEEDS.length})`)
}
