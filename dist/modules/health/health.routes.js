"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = void 0;
const express_1 = require("express");
const health_controller_1 = require("@/modules/health/health.controller");
const healthRoutes = (0, express_1.Router)();
exports.healthRoutes = healthRoutes;
healthRoutes.get("/", health_controller_1.healthController.getHealth);
