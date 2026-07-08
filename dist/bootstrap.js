"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApplication = getApplication;
const app_1 = require("./app");
const database_1 = require("./config/database");
const rbac_seed_1 = require("./seeds/rbac.seed");
const email_templates_seed_1 = require("./seeds/email-templates.seed");
const room_managers_backfill_seed_1 = require("./seeds/room-managers-backfill.seed");
const logger_1 = require("./utils/logger");
let bootstrapPromise = null;
function getApplication() {
    if (!bootstrapPromise) {
        bootstrapPromise = (async () => {
            await (0, database_1.connectDatabase)();
            await (0, rbac_seed_1.seedRbac)();
            await (0, email_templates_seed_1.seedEmailTemplates)();
            await (0, room_managers_backfill_seed_1.backfillRoomManagers)();
            logger_1.logger.info("Application bootstrap complete");
            return (0, app_1.createApp)();
        })().catch((error) => {
            bootstrapPromise = null;
            throw error;
        });
    }
    return bootstrapPromise;
}
