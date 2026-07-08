"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedEmailTemplates = seedEmailTemplates;
const email_templates_1 = require("../constants/email-templates");
const email_template_model_1 = require("../modules/email-templates/email-template.model");
const logger_1 = require("../utils/logger");
async function seedEmailTemplates() {
    for (const template of email_templates_1.EMAIL_TEMPLATE_SEEDS) {
        await email_template_model_1.EmailTemplate.findOneAndUpdate({ key: template.key }, {
            $set: {
                name: template.name,
                description: template.description,
                subject: template.subject,
                htmlBody: template.htmlBody,
                textBody: template.textBody,
                variables: template.variables,
                isActive: true,
            },
        }, { upsert: true, returnDocument: "after" });
    }
    logger_1.logger.info(`Email templates seeded (${email_templates_1.EMAIL_TEMPLATE_SEEDS.length})`);
}
