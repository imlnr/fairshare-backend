import { ApiError } from "@/utils/api-error"
import { EmailTemplate } from "@/modules/email-templates/email-template.model"

export function renderEmailTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => variables[key] ?? "")
}

export const emailTemplateService = {
  async getByKey(key: string) {
    const template = await EmailTemplate.findOne({ key, isActive: true }).lean()
    if (!template) {
      throw new ApiError(500, `Email template "${key}" is not configured`)
    }
    return template
  },

  async list() {
    return EmailTemplate.find().sort({ key: 1 }).lean()
  },
}
