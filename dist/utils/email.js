"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTemplatedEmail = sendTemplatedEmail;
exports.sendCredentialsEmail = sendCredentialsEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const email_templates_1 = require("../constants/email-templates");
const email_template_service_1 = require("../modules/email-templates/email-template.service");
const logger_1 = require("../utils/logger");
function createTransport() {
    if (!env_1.env.smtpHost)
        return null;
    return nodemailer_1.default.createTransport({
        host: env_1.env.smtpHost,
        port: env_1.env.smtpPort,
        secure: env_1.env.smtpSecure,
        auth: env_1.env.smtpUser && env_1.env.smtpPass
            ? { user: env_1.env.smtpUser, pass: env_1.env.smtpPass }
            : undefined,
    });
}
async function sendTemplatedEmail(templateKey, to, variables) {
    const template = await email_template_service_1.emailTemplateService.getByKey(templateKey);
    const subject = (0, email_template_service_1.renderEmailTemplate)(template.subject, variables);
    const html = (0, email_template_service_1.renderEmailTemplate)(template.htmlBody, variables);
    const text = (0, email_template_service_1.renderEmailTemplate)(template.textBody, variables);
    const transport = createTransport();
    if (!transport) {
        logger_1.logger.info(`[email:dev] Template "${templateKey}" to ${to}`, {
            subject,
            variables: { ...variables, password: variables.password ? "[redacted]" : undefined },
        });
        return;
    }
    await transport.sendMail({
        from: env_1.env.smtpFrom,
        to,
        subject,
        text,
        html,
    });
}
async function sendCredentialsEmail(input) {
    const variables = {
        name: input.name,
        email: input.to,
        password: input.password,
        roleLabel: input.roleLabel,
        appName: env_1.env.appName,
        loginUrl: `${env_1.env.appUrl}/login`,
    };
    await sendTemplatedEmail(email_templates_1.EMAIL_TEMPLATE_KEYS.ACCOUNT_CREDENTIALS, input.to, variables);
}
