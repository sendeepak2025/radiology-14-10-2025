/**
 * Machine Controller
 * Handles medical imaging machine management
 */

const Machine = require('../models/Machine');
const Organization = require('../models/Organization');
const QRCode = require('qrcode');

/**
 * Get all machines for an organization
 * GET /api/machines
 */
async function getMachines(req, res) {
  try {
    const { organizationId } = req.query;
    const userId = req.user?.id || 'system';

    // If no organizationId provided, get user's organization
    let orgId = organizationId;
    if (!orgId && req.user) {
      // TODO: Get user's organization from user model
      orgId = req.user.organizationId;
    }

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID required'
      });
    }

    const machines = await Machine.find({ organizationId: orgId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: machines,
      count: machines.length
    });

  } catch (error) {
    console.error('Error fetching machines:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Get single machine by ID
 * GET /api/machines/:machineId
 */
async function getMachine(req, res) {
  try {
    const { machineId } = req.params;

    const machine = await Machine.findOne({ machineId }).lean();

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    return res.json({
      success: true,
      data: machine
    });

  } catch (error) {
    console.error('Error fetching machine:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Create new machine
 * POST /api/machines
 */
async function createMachine(req, res) {
  try {
    const {
      organizationId,
      organizationName,
      name,
      machineType,
      manufacturer,
      model,
      serialNumber,
      ipAddress,
      port,
      aeTitle,
      callingAeTitle,
      location,
      notes
    } = req.body;

    const userId = req.user?.id || 'system';

    // Validate required fields
    if (!organizationId || !name || !machineType || !ipAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: organizationId, name, machineType, ipAddress'
      });
    }

    // Check if organization exists and can add more machines
    const organization = await Organization.findOne({ organizationId });
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    if (!organization.canAddMachine()) {
      return res.status(403).json({
        success: false,
        message: `Machine limit reached. Maximum ${organization.limits.maxMachines} machines allowed.`
      });
    }

    // Check if machine with same IP:Port already exists
    const existingMachine = await Machine.findOne({
      organizationId,
      ipAddress,
      port: port || 4242
    });

    if (existingMachine) {
      return res.status(409).json({
        success: false,
        message: 'Machine with this IP and port already exists'
      });
    }

    // Create new machine
    const machine = new Machine({
      organizationId,
      organizationName: organizationName || organization.name,
      name,
      machineType,
      manufacturer,
      model,
      serialNumber,
      ipAddress,
      port: port || 4242,
      aeTitle: aeTitle || machineType.toUpperCase(),
      callingAeTitle: callingAeTitle || 'ORTHANC',
      location,
      notes,
      createdBy: userId,
      status: 'pending'
    });

    await machine.save();

    // Update organization machine count
    await organization.incrementMachineCount();

    console.log(`Machine created: ${machine.machineId} for ${organizationName}`);

    return res.status(201).json({
      success: true,
      message: 'Machine created successfully',
      data: machine
    });

  } catch (error) {
    console.error('Error creating machine:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Update machine
 * PUT /api/machines/:machineId
 */
async function updateMachine(req, res) {
  try {
    const { machineId } = req.params;
    const updates = req.body;
    const userId = req.user?.id || 'system';

    const machine = await Machine.findOne({ machineId });

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'machineType', 'manufacturer', 'model', 'serialNumber',
      'ipAddress', 'port', 'aeTitle', 'callingAeTitle', 'location',
      'autoAcceptStudies', 'enabled', 'notes'
    ];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        machine[field] = updates[field];
      }
    });

    machine.updatedBy = userId;
    await machine.save();

    console.log(`Machine updated: ${machineId}`);

    return res.json({
      success: true,
      message: 'Machine updated successfully',
      data: machine
    });

  } catch (error) {
    console.error('Error updating machine:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Delete machine
 * DELETE /api/machines/:machineId
 */
async function deleteMachine(req, res) {
  try {
    const { machineId } = req.params;

    const machine = await Machine.findOne({ machineId });

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    // Update organization machine count
    const organization = await Organization.findOne({ organizationId: machine.organizationId });
    if (organization) {
      await organization.decrementMachineCount();
    }

    await Machine.deleteOne({ machineId });

    console.log(`Machine deleted: ${machineId}`);

    return res.json({
      success: true,
      message: 'Machine deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting machine:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Test machine connection (DICOM C-ECHO)
 * POST /api/machines/:machineId/test
 */
async function testConnection(req, res) {
  try {
    const { machineId } = req.params;

    const machine = await Machine.findOne({ machineId });

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    machine.status = 'testing';
    machine.lastConnectionTest = new Date();
    await machine.save();

    // TODO: Implement actual DICOM C-ECHO test using pynetdicom or similar
    // For now, we'll simulate the test
    
    console.log(`Testing connection to ${machine.ipAddress}:${machine.port} (${machine.aeTitle})`);

    // Simulate connection test (replace with actual DICOM C-ECHO)
    const testResult = {
      success: Math.random() > 0.3, // 70% success rate for demo
      message: Math.random() > 0.3 ? 'DICOM Echo successful' : 'Connection timeout',
      testedAt: new Date()
    };

    machine.connectionTestResult = testResult;
    machine.status = testResult.success ? 'online' : 'error';
    
    if (testResult.success) {
      machine.lastSeen = new Date();
    }

    await machine.save();

    return res.json({
      success: true,
      message: 'Connection test completed',
      data: {
        machineId: machine.machineId,
        status: machine.status,
        testResult: machine.connectionTestResult
      }
    });

  } catch (error) {
    console.error('Error testing connection:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Generate configuration file for machine
 * GET /api/machines/:machineId/config
 */
async function generateConfig(req, res) {
  try {
    const { machineId } = req.params;
    const { format } = req.query; // 'json', 'text', or 'qr'

    const machine = await Machine.findOne({ machineId }).lean();

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    // Configuration object
    const config = {
      destination: {
        name: 'Cloud PACS',
        aeTitle: machine.callingAeTitle,
        ipAddress: 'YOUR_SERVER_IP', // Replace with actual server IP
        port: 4242,
        description: `Send studies to ${machine.organizationName} Cloud PACS`
      },
      machine: {
        name: machine.name,
        type: machine.machineType,
        aeTitle: machine.aeTitle
      },
      instructions: [
        '1. Open DICOM settings on your imaging machine',
        '2. Add new destination with these details',
        '3. Test connection using DICOM Echo',
        '4. Start sending studies'
      ]
    };

    // Return based on format
    if (format === 'qr') {
      // Generate QR code
      const qrData = JSON.stringify(config.destination);
      const qrCode = await QRCode.toDataURL(qrData);

      return res.json({
        success: true,
        data: {
          qrCode,
          config
        }
      });
    } else if (format === 'text') {
      // Return as plain text
      const textConfig = `
CLOUD PACS CONFIGURATION
========================
Organization: ${machine.organizationName}
Machine: ${machine.name} (${machine.machineType})

DICOM DESTINATION SETTINGS:
---------------------------
AE Title: ${config.destination.aeTitle}
IP Address: ${config.destination.ipAddress}
Port: ${config.destination.port}

YOUR MACHINE SETTINGS:
---------------------
AE Title: ${machine.aeTitle}
IP Address: ${machine.ipAddress}
Port: ${machine.port}

SETUP INSTRUCTIONS:
------------------
${config.instructions.join('\n')}
      `.trim();

      return res.type('text/plain').send(textConfig);
    } else {
      // Return as JSON (default)
      return res.json({
        success: true,
        data: config
      });
    }

  } catch (error) {
    console.error('Error generating config:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Get machine statistics
 * GET /api/machines/:machineId/stats
 */
async function getMachineStats(req, res) {
  try {
    const { machineId } = req.params;

    const machine = await Machine.findOne({ machineId }).lean();

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    // TODO: Get actual statistics from studies
    const stats = {
      totalStudies: machine.totalStudiesReceived,
      lastStudyReceived: machine.lastStudyReceived,
      status: machine.status,
      uptime: machine.lastSeen ? Date.now() - new Date(machine.lastSeen).getTime() : null,
      lastConnectionTest: machine.lastConnectionTest
    };

    return res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching machine stats:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getMachines,
  getMachine,
  createMachine,
  updateMachine,
  deleteMachine,
  testConnection,
  generateConfig,
  getMachineStats
};
