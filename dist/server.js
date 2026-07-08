"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
const bootstrap_1 = require("./bootstrap");
const logger_1 = require("./utils/logger");
async function startServer() {
    const app = await (0, bootstrap_1.getApplication)();
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
