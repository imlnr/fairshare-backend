"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTemplateService = void 0;
exports.renderEmailTemplate = renderEmailTemplate;
const api_error_1 = require("../../utils/api-error");
const email_template_model_1 = require("../../modules/email-templates/email-template.model");
function renderEmailTemplate(template, variables) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "");
}
exports.emailTemplateService = {
    async getByKey(key) {
        const template = await email_template_model_1.EmailTemplate.findOne({ key, isActive: true }).lean();
        if (!template) {
            throw new api_error_1.ApiError(500, `Email template "${key}" is not configured`);
        }
        return template;
    },
    async list() {
        return email_template_model_1.EmailTemplate.find().sort({ key: 1 }).lean();
    },
};
