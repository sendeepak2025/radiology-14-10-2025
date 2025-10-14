const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  roles: { type: [String], default: ['user'] },
  permissions: { type: [String], default: ['studies:read'] },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: true },
  mfaEnabled: { type: Boolean, default: false },
  lastLogin: { type: Date },
}, { timestamps: true })

UserSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    roles: this.roles,
    permissions: this.permissions,
    isActive: this.isActive,
    isVerified: this.isVerified,
    mfaEnabled: this.mfaEnabled,
    lastLogin: this.lastLogin ? this.lastLogin.toISOString() : undefined,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  }
}

module.exports = mongoose.model('User', UserSchema)