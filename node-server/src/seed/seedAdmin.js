const bcrypt = require('bcryptjs')
const User = require('../models/User')

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'

  const existing = await User.findOne({ username })
  if (existing) {
    console.log(`[seed] Admin user already exists: ${username}`)
    return existing
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({
    username,
    email,
    passwordHash,
    firstName: 'System',
    lastName: 'Admin',
    roles: ['admin'],
    permissions: ['*'],
    isActive: true,
    isVerified: true,
  })
  console.log(`[seed] Admin user created: ${username}`)
  return user
}

module.exports = { seedAdmin }