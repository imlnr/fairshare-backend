"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("@/app");
const database_1 = require("@/config/database");
const env_1 = require("@/config/env");
const rbac_seed_1 = require("@/seeds/rbac.seed");
const logger_1 = require("@/utils/logger");
async function startServer() {
    await (0, database_1.connectDatabase)();
    await (0, rbac_seed_1.seedRbac)();
    const app = (0, app_1.createApp)();
    app.listen(env_1.env.port, () => {
        logger_1.logger.info(`Server running on http://localhost:${env_1.env.port}`);
    });
}
startServer().catch((error) => {
    logger_1.logger.error("Failed to start server", {
        error: error instanceof Error ? error.message : error,
    });
    process.exit(1);
});
