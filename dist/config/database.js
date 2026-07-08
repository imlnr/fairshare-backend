"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const cache = global.mongooseCache ?? {
    conn: null,
    promise: null,
};
global.mongooseCache = cache;
async function connectDatabase() {
    if (cache.conn) {
        return;
    }
    mongoose_1.default.set("strictQuery", true);
    if (!cache.promise) {
        cache.promise = mongoose_1.default.connect(env_1.env.mongodbUri).then((connection) => {
            logger_1.logger.info("MongoDB connected");
            return connection;
        });
    }
    cache.conn = await cache.promise;
}
async function disconnectDatabase() {
    await mongoose_1.default.disconnect();
    logger_1.logger.info("MongoDB disconnected");
}
