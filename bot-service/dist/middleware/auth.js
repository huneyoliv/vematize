"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logPublicRequest = logPublicRequest;
const logger_1 = __importDefault(require("../utils/logger"));
// Middleware para logar requisições públicas
function logPublicRequest(req, res, next) {
    logger_1.default.info('Public endpoint accessed');
    next();
}
