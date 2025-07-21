import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { db } from './models/database';
import { NumberService } from './services/numberService';

const app = express();
const PORT = parseInt(process.env.PORT || '5001', 10);

// Set NODE_ENV if not set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app build
let clientBuildPath = '';

if (process.env.NODE_ENV === 'production') {
  // In production (Railway), try these paths
  const possiblePaths = [
    path.join(process.cwd(), 'client/dist'),
    path.join(process.cwd(), 'dist/client/dist'),
    path.join(__dirname, '../client/dist'),
    path.join(__dirname, '../../client/dist')
  ];
  
  for (const testPath of possiblePaths) {
    const indexPath = path.join(testPath, 'index.html');
    console.log(`Testing static path: ${testPath} - index.html exists: ${fs.existsSync(indexPath)}`);
    if (fs.existsSync(indexPath)) {
      clientBuildPath = testPath;
      console.log(`✅ Found client build files at: ${clientBuildPath}`);
      break;
    }
  }
  
  if (!clientBuildPath) {
    console.error('❌ No valid static file path found in production!');
    console.error('Available files in working directory:');
    try {
      fs.readdirSync(process.cwd()).forEach(file => {
        const filePath = path.join(process.cwd(), file);
        const stats = fs.statSync(filePath);
        console.error(`  ${file} ${stats.isDirectory() ? '(dir)' : `(${stats.size} bytes)`}`);
        if (stats.isDirectory() && file === 'client') {
          try {
            fs.readdirSync(filePath).forEach(subFile => {
              console.error(`    client/${subFile}`);
            });
          } catch (e) {}
        }
      });
    } catch (e) {
      console.error('Error listing directory:', e);
    }
    clientBuildPath = possiblePaths[0]; // fallback
  }
} else {
  // Development
  clientBuildPath = path.join(__dirname, '../client/dist');
}

console.log(`🚀 Serving static files from: ${clientBuildPath}`);
app.use(express.static(clientBuildPath));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// Get all estimates
app.get('/api/estimates', async (req, res) => {
  try {
    const estimates = await db.all(`
      SELECT 
        e.*,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone
      FROM estimates e
      LEFT JOIN clients c ON e.client_id = c.id
      ORDER BY e.created_at DESC
    `);
    
    res.json({
      success: true,
      data: {
        data: estimates,
        total: estimates.length,
        page: 1,
        limit: 100,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching estimates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch estimates' });
  }
});

// Get all clients
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await db.all('SELECT * FROM clients ORDER BY name ASC');
    
    res.json({
      success: true,
      data: {
        data: clients,
        total: clients.length,
        page: 1,
        limit: 100,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch clients' });
  }
});

// Create new client
app.post('/api/clients', async (req, res) => {
  try {
    const clientData = req.body;

    // Validation
    if (!clientData.name?.trim()) {
      return res.status(400).json({ success: false, error: 'Client name is required' });
    }

    if (clientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // Check for duplicate email
    if (clientData.email) {
      const existingClient = await db.get('SELECT id FROM clients WHERE email = ?', [clientData.email]);
      if (existingClient) {
        return res.status(409).json({ success: false, error: 'Client with this email already exists' });
      }
    }

    // Try new format with job address columns first, fallback to old format if columns don't exist
    let result;
    try {
      result = await db.run(
        `INSERT INTO clients (name, email, phone, address, city, state, zip_code, job_address, job_city, job_state, job_zip_code, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clientData.name.trim(),
          clientData.email || null,
          clientData.phone || null,
          clientData.address || null,
          clientData.city || null,
          clientData.state || null,
          clientData.zip_code || null,
          clientData.job_address || null,
          clientData.job_city || null,
          clientData.job_state || null,
          clientData.job_zip_code || null,
          clientData.notes || null
        ]
      );
    } catch (error) {
      // Fallback to old format without job address columns
      console.log('Job address columns not found, using legacy format:', (error as Error).message);
      result = await db.run(
        `INSERT INTO clients (name, email, phone, address, city, state, zip_code, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clientData.name.trim(),
          clientData.email || null,
          clientData.phone || null,
          clientData.address || null,
          clientData.city || null,
          clientData.state || null,
          clientData.zip_code || null,
          clientData.notes || null
        ]
      );
    }

    const newClient = await db.get('SELECT * FROM clients WHERE id = ?', [result.id]);

    res.status(201).json({
      success: true,
      data: newClient,
      message: 'Client created successfully'
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ success: false, error: 'Failed to create client' });
  }
});

// Create new estimate
app.post('/api/estimates', async (req, res) => {
  try {
    const {
      client_id,
      title,
      description,
      valid_until,
      markup_percentage = 15,
      terms_and_notes,
      project_areas,
      parent_estimate_id,
      revision_number
    } = req.body;

    // Validation
    if (!client_id || !title || !project_areas || project_areas.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: client_id, title, project_areas'
      });
    }

    // Generate estimate number
    const estimateNumber = await NumberService.getNextEstimateNumber();

    // Calculate totals
    let totalLaborCost = 0;
    let totalMaterialCost = 0;

    for (const area of project_areas) {
      const laborCost = (area.labor_hours || 0) * (area.labor_rate || 0);
      const materialCost = area.material_cost || 0;
      totalLaborCost += laborCost;
      totalMaterialCost += materialCost;
    }

    const markupAmount = (totalLaborCost + totalMaterialCost) * (markup_percentage / 100);
    const totalAmount = totalLaborCost + totalMaterialCost + markupAmount;

    // Determine version control fields
    let versionGroupId = null;
    let actualRevisionNumber = revision_number || 1;
    let isRevision = false;

    if (parent_estimate_id) {
      // This is a revision - get the version group from parent
      const parentEstimate = await db.get('SELECT version_group_id FROM estimates WHERE id = ?', [parent_estimate_id]);
      if (parentEstimate) {
        versionGroupId = parentEstimate.version_group_id;
        isRevision = true;
        
        // Get the next revision number
        const maxRevision = await db.get(
          'SELECT MAX(revision_number) as max_rev FROM estimates WHERE version_group_id = ?',
          [versionGroupId]
        );
        actualRevisionNumber = (maxRevision?.max_rev || 0) + 1;
      }
    }

    // Create estimate
    const result = await db.run(`
      INSERT INTO estimates (
        estimate_number, client_id, title, description, total_amount,
        labor_cost, material_cost, markup_percentage, valid_until, terms_and_notes,
        parent_estimate_id, revision_number, version_group_id, is_current_version
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      estimateNumber,
      client_id,
      title,
      description || null,
      totalAmount,
      totalLaborCost,
      totalMaterialCost,
      markup_percentage,
      valid_until || null,
      terms_and_notes || null,
      parent_estimate_id || null,
      actualRevisionNumber,
      versionGroupId || `EST-${estimateNumber}-GROUP`,
      1 // Always current when created
    ]);

    const estimateId = result.id;

    // Create project areas
    for (const area of project_areas) {
      await db.run(`
        INSERT INTO project_areas (
          estimate_id, area_name, area_type, surface_type, square_footage,
          ceiling_height, prep_requirements, paint_type, paint_brand, paint_color,
          finish_type, number_of_coats, labor_hours, labor_rate, material_cost, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        estimateId,
        area.area_name,
        area.area_type,
        area.surface_type || null,
        area.square_footage || null,
        area.ceiling_height || null,
        area.prep_requirements || null,
        area.paint_type || null,
        area.paint_brand || null,
        area.paint_color || null,
        area.finish_type || null,
        area.number_of_coats || 2,
        area.labor_hours || null,
        area.labor_rate || null,
        area.material_cost || null,
        area.notes || null
      ]);
    }

    // Get the created estimate
    // Create revision tracking record if this is a revision
    if (isRevision && parent_estimate_id) {
      const changeDetails = {
        total_amount_change: totalAmount - (await db.get('SELECT total_amount FROM estimates WHERE id = ?', [parent_estimate_id]))?.total_amount,
        markup_change: markup_percentage,
        areas_modified: project_areas.length
      };

      await db.createEstimateRevision(
        estimateId,
        changeDetails,
        'price_adjustment',
        `Revision ${actualRevisionNumber}: Price and scope adjustments`,
        'system'
      );

      // Mark the previous version as superseded
      await db.run(
        'UPDATE estimates SET is_current_version = 0, superseded_by = ?, superseded_at = CURRENT_TIMESTAMP WHERE id = ?',
        [estimateId, parent_estimate_id]
      );

      // Log the revision creation
      await db.logEstimateChange(
        estimateId,
        null,
        'revision_created',
        null,
        `Created revision ${actualRevisionNumber}`,
        'created',
        'system'
      );
    }

    const newEstimate = await db.get('SELECT * FROM estimates WHERE id = ?', [estimateId]);

    res.status(201).json({
      success: true,
      data: newEstimate,
      message: `Estimate ${estimateNumber} created successfully${isRevision ? ` (Revision ${actualRevisionNumber})` : ''}`
    });
  } catch (error) {
    console.error('Error creating estimate:', error);
    res.status(500).json({ success: false, error: 'Failed to create estimate' });
  }
});

// Get estimate by ID with details
app.get('/api/estimates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const estimate = await db.get(`
      SELECT 
        e.*,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone,
        c.address as client_address,
        c.city as client_city,
        c.state as client_state,
        c.zip_code as client_zip_code
      FROM estimates e
      LEFT JOIN clients c ON e.client_id = c.id
      WHERE e.id = ?
    `, [id]);

    if (!estimate) {
      return res.status(404).json({ success: false, error: 'Estimate not found' });
    }

    // Get project areas
    const projectAreas = await db.all(`
      SELECT * FROM project_areas 
      WHERE estimate_id = ?
      ORDER BY created_at ASC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...estimate,
        project_areas: projectAreas
      }
    });
  } catch (error) {
    console.error('Error fetching estimate:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch estimate' });
  }
});

// Get estimate revision history
app.get('/api/estimates/:id/revisions', async (req, res) => {
  try {
    const { id } = req.params;
    
    const revisions = await db.getEstimateRevisionHistory(parseInt(id));
    
    res.json({
      success: true,
      data: revisions
    });
  } catch (error) {
    console.error('Error getting estimate revisions:', error);
    res.status(500).json({ success: false, error: 'Failed to get estimate revisions' });
  }
});

// Get estimate change log
app.get('/api/estimates/:id/changelog', async (req, res) => {
  try {
    const { id } = req.params;
    
    const changelog = await db.all(`
      SELECT 
        ecl.*,
        er.revision_type,
        er.change_summary
      FROM estimate_change_log ecl
      LEFT JOIN estimate_revisions er ON ecl.revision_id = er.id
      WHERE ecl.estimate_id = ?
      ORDER BY ecl.changed_at DESC
    `, [id]);
    
    res.json({
      success: true,
      data: changelog
    });
  } catch (error) {
    console.error('Error getting estimate changelog:', error);
    res.status(500).json({ success: false, error: 'Failed to get estimate changelog' });
  }
});

// Test endpoint to check basic database operations
app.post('/api/test-revision/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Testing revision for estimate:', id);
    
    const estimate = await db.get('SELECT * FROM estimates WHERE id = ?', [id]);
    console.log('Found estimate:', estimate);
    
    res.json({
      success: true,
      message: 'Basic database test passed',
      estimate
    });
  } catch (error) {
    console.error('Test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      details: (error as Error).message
    });
  }
});

// Debug endpoint to check revision logs
app.get('/api/debug-revisions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const revisions = await db.all('SELECT * FROM estimate_revisions WHERE estimate_id = ? ORDER BY created_at DESC', [id]);
    const estimate = await db.get('SELECT revision_number FROM estimates WHERE id = ?', [id]);
    
    res.json({
      success: true,
      data: {
        estimate_revision_number: estimate?.revision_number,
        revision_logs_count: revisions.length,
        revision_logs: revisions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Debug failed',
      details: (error as Error).message
    });
  }
});

// Create estimate revision - WORKING VERSION
app.post("/api/estimates/:id/revisions", async (req, res) => {
  try {
    const { id } = req.params;
    const { changes = {} } = req.body;
    
    console.log("REVISION: Updating estimate", id, "with changes:", changes);
    console.log("REVISION: Full request body:", req.body);
    
    // Check estimate status first
    const currentEstimate = await db.get("SELECT * FROM estimates WHERE id = ?", [id]);
    if (!currentEstimate) {
      return res.status(404).json({ success: false, error: "Estimate not found" });
    }
    
    if (!['sent', 'approved'].includes(currentEstimate.status)) {
      return res.status(400).json({ 
        success: false, 
        error: `Cannot revise estimate with status '${currentEstimate.status}'. Estimate must be 'sent' or 'approved'.` 
      });
    }
    
    // Update estimate fields
    const updates = [];
    const values = [];
    
    if (changes.markup_percentage !== undefined) {
      updates.push("markup_percentage = ?");
      values.push(changes.markup_percentage);
    }
    
    if (changes.total_amount !== undefined) {
      updates.push("total_amount = ?");
      values.push(changes.total_amount);
    }
    
    if (changes.labor_cost !== undefined) {
      updates.push("labor_cost = ?");
      values.push(changes.labor_cost);
    }
    
    if (changes.material_cost !== undefined) {
      updates.push("material_cost = ?");
      values.push(changes.material_cost);
    }
    
    // Always increment revision number
    updates.push("revision_number = revision_number + 1");
    
    if (updates.length > 0) {
      values.push(id);
      await db.run(`UPDATE estimates SET ${updates.join(", ")} WHERE id = ?`, values);
    }
    
    // Update project areas if provided
    if (changes.project_areas && Array.isArray(changes.project_areas)) {
      const currentProjectAreas = await db.all("SELECT * FROM project_areas WHERE estimate_id = ? ORDER BY created_at ASC", [id]);
      
      for (let i = 0; i < changes.project_areas.length && i < currentProjectAreas.length; i++) {
        const newArea = changes.project_areas[i];
        const currentArea = currentProjectAreas[i];
        
        const areaUpdates = [];
        const areaValues = [];
        
        if (newArea.labor_hours !== undefined) {
          areaUpdates.push("labor_hours = ?");
          areaValues.push(newArea.labor_hours);
        }
        
        if (newArea.labor_rate !== undefined) {
          areaUpdates.push("labor_rate = ?");
          areaValues.push(newArea.labor_rate);
        }
        
        if (newArea.material_cost !== undefined) {
          areaUpdates.push("material_cost = ?");
          areaValues.push(newArea.material_cost);
        }
        
        if (areaUpdates.length > 0) {
          areaValues.push(currentArea.id);
          await db.run(`UPDATE project_areas SET ${areaUpdates.join(", ")} WHERE id = ?`, areaValues);
        }
      }
    }
    
    // Create a simple revision log entry (without constraints)
    const newRevisionNumber = currentEstimate.revision_number + 1;
    console.log("REVISION: Attempting to create log entry with data:", {
      estimate_id: parseInt(id),
      revision_number: newRevisionNumber,
      created_by: req.body.created_by || 'user',
      revision_type: req.body.revision_type || 'price_adjustment',
      change_summary: req.body.change_summary || 'Estimate revision',
      previous_total: currentEstimate.total_amount,
      new_total: changes.total_amount || currentEstimate.total_amount
    });
    
    try {
      const logResult = await db.run(`
        INSERT INTO estimate_revisions (
          estimate_id, revision_number, created_by, revision_type, 
          change_summary, change_details, previous_total_amount, 
          new_total_amount, previous_markup_percentage, new_markup_percentage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        parseInt(id),
        newRevisionNumber,
        req.body.created_by || 'user',
        req.body.revision_type || 'price_adjustment',
        req.body.change_summary || 'Estimate revision',
        JSON.stringify(changes),
        currentEstimate.total_amount,
        changes.total_amount || currentEstimate.total_amount,
        currentEstimate.markup_percentage,
        changes.markup_percentage || currentEstimate.markup_percentage
      ]);
      console.log("REVISION: Log entry created successfully with ID:", logResult.lastID);
      
      // Verify the log was created
      const createdLog = await db.get("SELECT * FROM estimate_revisions WHERE id = ?", [logResult.lastID]);
      console.log("REVISION: Verified log entry:", createdLog);
      
    } catch (logError) {
      console.error("REVISION: Log entry failed:", logError);
      console.error("REVISION: Error details:", (logError as Error).message);
      // Don't fail the whole revision if logging fails
    }

    // Verify the update worked
    const updatedEstimate = await db.get("SELECT * FROM estimates WHERE id = ?", [id]);
    console.log("REVISION: Update successful. New revision #", updatedEstimate.revision_number);
    console.log("REVISION: Updated estimate:", {
      id: updatedEstimate.id,
      revision_number: updatedEstimate.revision_number,
      markup_percentage: updatedEstimate.markup_percentage,
      total_amount: updatedEstimate.total_amount
    });
    
    res.json({
      success: true,
      message: "Estimate revision created successfully",
      data: {
        revision_number: updatedEstimate.revision_number,
        updated_values: {
          markup_percentage: updatedEstimate.markup_percentage,
          total_amount: updatedEstimate.total_amount
        }
      }
    });
    
  } catch (error) {
    console.error("REVISION: Failed:", error);
    res.status(500).json({
      success: false,
      error: "Revision failed",
      details: (error as Error).message
    });
  }
});
// Approve estimate revision
app.post('/api/estimates/:id/revisions/:revisionId/approve', async (req, res) => {
  try {
    const { id, revisionId } = req.params;
    const { approved_by = 'user', notes = '' } = req.body;
    
    await db.run(`
      UPDATE estimate_revisions 
      SET approval_status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ? AND estimate_id = ?
    `, [approved_by, revisionId, id]);
    
    // Log the approval
    await db.logEstimateChange(
      parseInt(id),
      parseInt(revisionId),
      'revision_approval',
      'pending',
      'approved',
      'status_change',
      approved_by
    );
    
    res.json({
      success: true,
      message: 'Estimate revision approved successfully'
    });
  } catch (error) {
    console.error('Error approving estimate revision:', error);
    res.status(500).json({ success: false, error: 'Failed to approve estimate revision' });
  }
});

// Get all versions of an estimate (by version group)
app.get('/api/estimates/:id/versions', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the version group ID for this estimate
    const estimate = await db.get('SELECT version_group_id FROM estimates WHERE id = ?', [id]);
    if (!estimate) {
      return res.status(404).json({ success: false, error: 'Estimate not found' });
    }
    
    // Get all versions in this group
    const versions = await db.all(`
      SELECT 
        e.*,
        c.name as client_name,
        c.email as client_email,
        er.revision_type,
        er.change_summary,
        er.approval_status,
        er.approved_by,
        er.approved_at
      FROM estimates e
      LEFT JOIN clients c ON e.client_id = c.id
      LEFT JOIN estimate_revisions er ON e.id = er.estimate_id
      WHERE e.version_group_id = ?
      ORDER BY e.revision_number ASC
    `, [estimate.version_group_id]);
    
    res.json({
      success: true,
      data: versions
    });
  } catch (error) {
    console.error('Error getting estimate versions:', error);
    res.status(500).json({ success: false, error: 'Failed to get estimate versions' });
  }
});

// Update estimate status
app.patch('/api/estimates/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'sent', 'approved', 'rejected', 'converted'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    await db.run('UPDATE estimates SET status = ? WHERE id = ?', [status, id]);
    
    const updatedEstimate = await db.get('SELECT * FROM estimates WHERE id = ?', [id]);

    res.json({
      success: true,
      data: updatedEstimate,
      message: `Estimate status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating estimate status:', error);
    res.status(500).json({ success: false, error: 'Failed to update estimate status' });
  }
});

// Get all invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await db.all(`
      SELECT 
        i.*,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone,
        e.estimate_number,
        (i.total_amount - i.paid_amount) as outstanding_amount
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN estimates e ON i.estimate_id = e.id
      ORDER BY i.created_at DESC
    `);
    
    res.json({
      success: true,
      data: {
        data: invoices,
        total: invoices.length,
        page: 1,
        limit: 100,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

// Get invoice by ID with details
app.get('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const invoice = await db.get(`
      SELECT 
        i.*,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone,
        c.address as client_address,
        c.city as client_city,
        c.state as client_state,
        c.zip_code as client_zip_code,
        e.estimate_number
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN estimates e ON i.estimate_id = e.id
      WHERE i.id = ?
    `, [id]);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Get project areas
    const projectAreas = await db.all(`
      SELECT * FROM project_areas 
      WHERE invoice_id = ?
      ORDER BY created_at ASC
    `, [id]);

    // Get payments
    const payments = await db.all(`
      SELECT * FROM payments 
      WHERE invoice_id = ?
      ORDER BY payment_date DESC, created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...invoice,
        project_areas: projectAreas,
        payments: payments
      }
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoice' });
  }
});

// Update estimate details
app.patch('/api/estimates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      valid_until,
      markup_percentage,
      terms_and_notes
    } = req.body;

    // Validation
    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    if (markup_percentage !== undefined && (markup_percentage < 0 || markup_percentage > 100)) {
      return res.status(400).json({ success: false, error: 'Markup percentage must be between 0 and 100' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (valid_until !== undefined) {
      updates.push('valid_until = ?');
      values.push(valid_until || null);
    }
    if (markup_percentage !== undefined) {
      updates.push('markup_percentage = ?');
      values.push(markup_percentage);
    }
    if (terms_and_notes !== undefined) {
      updates.push('terms_and_notes = ?');
      values.push(terms_and_notes);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.run(`UPDATE estimates SET ${updates.join(', ')} WHERE id = ?`, values);
    
    const updatedEstimate = await db.get(`
      SELECT 
        e.*,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone
      FROM estimates e
      LEFT JOIN clients c ON e.client_id = c.id
      WHERE e.id = ?
    `, [id]);

    if (!updatedEstimate) {
      return res.status(404).json({ success: false, error: 'Estimate not found' });
    }

    res.json({
      success: true,
      data: updatedEstimate,
      message: 'Estimate updated successfully'
    });
  } catch (error) {
    console.error('Error updating estimate:', error);
    res.status(500).json({ success: false, error: 'Failed to update estimate' });
  }
});

// Convert estimate to invoice
app.post('/api/estimates/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;
    const { due_date, payment_terms = 'Net 30' } = req.body;

    // Get the estimate
    const estimate = await db.get('SELECT * FROM estimates WHERE id = ?', [id]);
    if (!estimate) {
      return res.status(404).json({ success: false, error: 'Estimate not found' });
    }

    if (estimate.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Only approved estimates can be converted to invoices' });
    }

    // Generate invoice number
    const invoiceNumber = await NumberService.getNextInvoiceNumber();

    // Create invoice
    const result = await db.run(`
      INSERT INTO invoices (
        invoice_number, estimate_id, client_id, title, description,
        total_amount, due_date, payment_terms, terms_and_notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invoiceNumber,
      estimate.id,
      estimate.client_id,
      estimate.title,
      estimate.description,
      estimate.total_amount,
      due_date || null,
      payment_terms,
      estimate.terms_and_notes || null
    ]);

    const invoiceId = result.id;

    // Copy project areas from estimate to invoice
    const projectAreas = await db.all('SELECT * FROM project_areas WHERE estimate_id = ?', [id]);
    
    for (const area of projectAreas) {
      await db.run(`
        INSERT INTO project_areas (
          invoice_id, area_name, area_type, surface_type, square_footage,
          ceiling_height, prep_requirements, paint_type, paint_brand, paint_color,
          finish_type, number_of_coats, labor_hours, labor_rate, material_cost, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceId,
        area.area_name,
        area.area_type,
        area.surface_type,
        area.square_footage,
        area.ceiling_height,
        area.prep_requirements,
        area.paint_type,
        area.paint_brand,
        area.paint_color,
        area.finish_type,
        area.number_of_coats,
        area.labor_hours,
        area.labor_rate,
        area.material_cost,
        area.notes
      ]);
    }

    // Update estimate status to converted
    await db.run('UPDATE estimates SET status = "converted" WHERE id = ?', [id]);

    // Get the created invoice
    const newInvoice = await db.get('SELECT * FROM invoices WHERE id = ?', [invoiceId]);

    res.status(201).json({
      success: true,
      data: newInvoice,
      message: `Invoice ${invoiceNumber} created from estimate ${estimate.estimate_number}`
    });
  } catch (error) {
    console.error('Error converting estimate to invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to convert estimate to invoice' });
  }
});

// Update invoice status
app.patch('/api/invoices/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'sent', 'paid', 'overdue', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    await db.run('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
    
    const updatedInvoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);

    res.json({
      success: true,
      data: updatedInvoice,
      message: `Invoice status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ success: false, error: 'Failed to update invoice status' });
  }
});

// Update invoice details
app.patch('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      total_amount,
      due_date,
      payment_terms,
      terms_and_notes
    } = req.body;

    // Validation
    if (!title || title.trim() === '') {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    if (total_amount !== undefined && total_amount <= 0) {
      return res.status(400).json({ success: false, error: 'Total amount must be greater than 0' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (total_amount !== undefined) {
      updates.push('total_amount = ?');
      values.push(total_amount);
    }
    if (due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(due_date || null);
    }
    if (payment_terms !== undefined) {
      updates.push('payment_terms = ?');
      values.push(payment_terms);
    }
    if (terms_and_notes !== undefined) {
      updates.push('terms_and_notes = ?');
      values.push(terms_and_notes);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.run(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ?`, values);
    
    const updatedInvoice = await db.get(`
      SELECT 
        i.*,
        c.name as client_name,
        c.email as client_email,
        c.phone as client_phone,
        e.estimate_number,
        (i.total_amount - i.paid_amount) as outstanding_amount
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      LEFT JOIN estimates e ON i.estimate_id = e.id
      WHERE i.id = ?
    `, [id]);

    if (!updatedInvoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    res.json({
      success: true,
      data: updatedInvoice,
      message: 'Invoice updated successfully'
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ success: false, error: 'Failed to update invoice' });
  }
});

// Record payment
app.post('/api/invoices/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      payment_method = 'Cash',
      payment_date,
      reference_number,
      notes
    } = req.body;

    if (!amount || !payment_date) {
      return res.status(400).json({ success: false, error: 'Amount and payment date are required' });
    }

    // Get current invoice
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Validate payment amount
    const outstanding = invoice.total_amount - invoice.paid_amount;
    if (amount > outstanding) {
      return res.status(400).json({ 
        success: false, 
        error: `Payment amount ($${amount}) exceeds outstanding balance ($${outstanding.toFixed(2)})` 
      });
    }

    // Record payment
    await db.run(`
      INSERT INTO payments (
        invoice_id, amount, payment_method, payment_date, reference_number, notes
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `, [id, amount, payment_method, payment_date, reference_number, notes]);

    // Update invoice paid amount
    const newPaidAmount = invoice.paid_amount + parseFloat(amount);
    await db.run('UPDATE invoices SET paid_amount = ? WHERE id = ?', [newPaidAmount, id]);

    // Update status if fully paid
    if (newPaidAmount >= invoice.total_amount) {
      await db.run('UPDATE invoices SET status = "paid" WHERE id = ?', [id]);
    }

    // Get updated invoice
    const updatedInvoice = await db.get('SELECT * FROM invoices WHERE id = ?', [id]);

    res.status(201).json({
      success: true,
      data: updatedInvoice,
      message: `Payment of $${amount} recorded successfully`
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ success: false, error: 'Failed to record payment' });
  }
});

// Get payments for an invoice
app.get('/api/invoices/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    
    const payments = await db.all(`
      SELECT * FROM payments 
      WHERE invoice_id = ?
      ORDER BY payment_date DESC, created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
});

// Delete payment (if needed for corrections)
app.delete('/api/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get payment details first
    const payment = await db.get('SELECT * FROM payments WHERE id = ?', [id]);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    // Get current invoice
    const invoice = await db.get('SELECT * FROM invoices WHERE id = ?', [payment.invoice_id]);
    
    // Delete payment
    await db.run('DELETE FROM payments WHERE id = ?', [id]);
    
    // Update invoice paid amount
    const newPaidAmount = invoice.paid_amount - payment.amount;
    await db.run('UPDATE invoices SET paid_amount = ? WHERE id = ?', [newPaidAmount, payment.invoice_id]);
    
    // Update status if no longer fully paid
    if (newPaidAmount < invoice.total_amount && invoice.status === 'paid') {
      await db.run('UPDATE invoices SET status = "sent" WHERE id = ?', [payment.invoice_id]);
    }

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    res.status(500).json({ success: false, error: 'Failed to delete payment' });
  }
});

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  console.log(`📄 Serving index.html from: ${indexPath}`);
  
  if (fs.existsSync(indexPath)) {
    console.log(`✅ Index.html found, serving React app`);
    res.sendFile(indexPath);
  } else {
    console.error(`❌ Index.html not found at: ${indexPath}`);
    res.status(404).send(`
      <html>
        <body>
          <h1>React App Not Found</h1>
          <p>Looking for index.html at: ${indexPath}</p>
          <p>Client build path: ${clientBuildPath}</p>
          <p>Working directory: ${process.cwd()}</p>
          <p>Environment: ${process.env.NODE_ENV}</p>
          <hr>
          <p>This diagnostic page means the Express server is running but can't find the React build files.</p>
        </body>
      </html>
    `);
  }
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎨 PaintPro Manager Server running on port ${PORT}`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
  console.log(`📋 Estimates: http://localhost:${PORT}/api/estimates`);
  console.log(`💰 Invoices: http://localhost:${PORT}/api/invoices`);
  console.log(`👥 Clients: http://localhost:${PORT}/api/clients`);
  console.log(`\n🚀 App available at: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database path: ${process.env.NODE_ENV === 'production' ? '/app/painting_business.db' : 'painting_business.db'}`);
  
  // Debug: List files in working directory
  console.log('Files in working directory:');
  try {
    const files = fs.readdirSync(process.cwd());
    files.forEach(file => {
      const stats = fs.statSync(path.join(process.cwd(), file));
      console.log(`  ${file} ${stats.isDirectory() ? '(dir)' : `(${stats.size} bytes)`}`);
    });
  } catch (err) {
    console.error('Error listing working directory:', err);
  }
});

export default app;