"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_controller_1 = require("../controllers/email.controller");
const router = (0, express_1.Router)();
router.post('/send', email_controller_1.emailController.sendEmail.bind(email_controller_1.emailController));
exports.default = router;
