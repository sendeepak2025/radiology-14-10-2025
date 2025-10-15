const mongoose = require('mongoose');
const Organization = require('./src/models/Organization');

async function createTestOrganization() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://mahitechnocrats:qNfbRMgnCthyu59@cluster1.xqa5iyj.mongodb.net/radiology-final';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if organization already exists
    const existing = await Organization.findOne({ organizationId: 'ORG-DEFAULT' });
    if (existing) {
      console.log('Organization ORG-DEFAULT already exists');
      return existing;
    }

    // Create test organization
    const organization = new Organization({
      organizationId: 'ORG-DEFAULT',
      name: 'Test Hospital',
      type: 'hospital',
      adminUserId: 'test-admin',
      plan: 'free',
      subscriptionStatus: 'active'
    });

    await organization.save();
    console.log('Test organization created successfully:', organization.organizationId);
    return organization;

  } catch (error) {
    console.error('Error creating test organization:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  createTestOrganization()
    .then(() => {
      console.log('Test organization setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to create test organization:', error);
      process.exit(1);
    });
}

module.exports = { createTestOrganization };