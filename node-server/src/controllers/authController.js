const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

const ACCESS_TOKEN_EXPIRES_IN = '30m'
const REFRESH_TOKEN_EXPIRES_IN = '7d'
const COOKIE_NAME = 'refresh_token'

function signAccessToken(user) {
  const payload = {
    sub: user.id,
    username: user.username,
    roles: user.roles,
    permissions: user.permissions,
  }
  return jwt.sign(payload, process.env.JWT_SECRET || 'dev_secret', { expiresIn: ACCESS_TOKEN_EXPIRES_IN })
}

function signRefreshToken(user) {
  const payload = { sub: user.id }
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret', { expiresIn: REFRESH_TOKEN_EXPIRES_IN })
}

function setRefreshCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false, // set true in production with HTTPS
    sameSite: 'lax',
    path: '/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' })
    }

    const user = await User.findOne({ username })
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' })
    }

    const accessToken = signAccessToken(user.toPublicJSON())
    const refreshToken = signRefreshToken(user.toPublicJSON())

    setRefreshCookie(res, refreshToken)

    user.lastLogin = new Date()
    await user.save()

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: user.toPublicJSON(),
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

exports.logout = async (req, res) => {
  try {
    res.clearCookie(COOKIE_NAME, { path: '/auth' })
    return res.json({ success: true })
  } catch (err) {
    console.error('Logout error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

exports.refresh = async (req, res) => {
  try {
    const token = req.cookies[COOKIE_NAME] || req.body.refreshToken
    if (!token) {
      return res.status(401).json({ success: false, message: 'No refresh token' })
    }

    let payload
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret')
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' })
    }

    const user = await User.findById(payload.sub)
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }

    const accessToken = signAccessToken(user.toPublicJSON())
    const newRefreshToken = signRefreshToken(user.toPublicJSON())
    setRefreshCookie(res, newRefreshToken)

    return res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
      user: user.toPublicJSON(),
    })
  } catch (err) {
    console.error('Refresh error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.sub)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    return res.json({ success: true, data: user.toPublicJSON() })
  } catch (err) {
    console.error('Me error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}