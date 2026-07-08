"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const env_1 = require("./config/env");
const error_handler_1 = require("./middleware/error-handler");
const request_logger_1 = require("./middleware/request-logger");
const index_1 = require("./routes/index");
const welcome_page_1 = require("./views/welcome-page");
function createApp() {
    const app = (0, express_1.default)();
    app.set("trust proxy", 1);
    app.use((0, cors_1.default)({
        origin: env_1.env.corsOrigin,
        credentials: true,
    }));
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use(request_logger_1.requestLogger);
    app.get("/", (_req, res) => {
        res.type("html").send((0, welcome_page_1.renderWelcomePage)());
    });
    app.use("/api", index_1.apiRoutes);
    app.use(error_handler_1.notFoundHandler);
    app.use(error_handler_1.errorHandler);
    return app;
}
