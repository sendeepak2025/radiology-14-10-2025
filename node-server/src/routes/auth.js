const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const authenticationController = require('../controllers/authenticationController')
const authMiddleware = require('../middleware/authMiddleware')
const AuthenticationService = require('../services/authentication-service')

// Initialize authentication service for middleware
const authService = new AuthenticationService()

// Legacy auth endpoints (keep for backward compatibility)
router.post('/login', authController.login)
router.post('/logout', authController.logout)
router.post('/refresh', authController.refresh)
router.get('/users/me', authMiddleware, authController.me)

// New OAuth2/OIDC and MFA endpoints
router.get('/oauth2/login', authenticationController.initiateOAuth2Login)
router.get('/oauth2/callback', authenticationController.handleOAuth2Callback)
router.post('/local/login', authenticationController.localLogin)
router.post('/mfa/setup', authService.authenticationMiddleware(), authenticationController.setupMFA)
router.post('/mfa/verify', authService.authenticationMiddleware(), authenticationController.verifyMFA)
router.post('/token/refresh', authenticationController.refreshToken)
router.post('/logout/secure', authService.authenticationMiddleware(), authenticationController.logout)
router.get('/user/current', authService.authenticationMiddleware(), authenticationController.getCurrentUser)

module.exports = router