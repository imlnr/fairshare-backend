"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolePermission = void 0;
const mongoose_1 = require("mongoose");
const rolePermissionSchema = new mongoose_1.Schema({
    roleId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Role",
        required: true,
        index: true,
    },
    permissionId: {
        type: mongoose_1.Types.ObjectId,
        ref: "Permission",
        required: true,
        index: true,
    },
}, {
    timestamps: true,
    versionKey: false,
});
rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });
exports.RolePermission = (0, mongoose_1.model)("RolePermission", rolePermissionSchema);
