"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
const logger_1 = __importDefault(require("../utils/logger"));
// Middleware de erro não encontrado
function notFoundHandler(req, res) {
    logger_1.default.warn(`404 - Route not found: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path
    });
}
// Middleware de tratamento de erros
function errorHandler(err, req, res, next) {
    logger_1.default.error('Error handler:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });
    const statusCode = err.statusCode || err.status || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}
// Wrapper para async handlers
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
