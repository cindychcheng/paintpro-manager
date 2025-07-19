import express, { Request, Response } from 'express';
import { db } from '../models/database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { ApiResponse, Estimate, EstimateWithDetails, CreateEstimateRequest, EstimateFilters, PaginatedResponse, ProjectArea } from '../types';
import { NumberService } from '../services/numberService';

const router = express.Router();

// Get all estimates with filtering and pagination
router.get('/', asyncHandler(async (req: Request, res: Response<ApiResponse<PaginatedResponse<Estimate>>>) => {
  const {
    page = 1,
    limit = 20,
    client_id,
    status,
    date_from,
    date_to,
    search = ''
  } = req.query as any;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (client_id) {
    whereClause += ' AND e.client_id = ?';
    params.push(client_id);
  }

  if (status) {
    whereClause += ' AND e.status = ?';
    params.push(status);
  }

  if (search) {
    whereClause += ' AND (e.title LIKE ? OR e.estimate_number LIKE ? OR c.name LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (date_from) {
    whereClause += ' AND DATE(e.created_at) >= ?';
    params.push(date_from);
  }

  if (date_to) {
    whereClause += ' AND DATE(e.created_at) <= ?';
    params.push(date_to);
  }

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM estimates e
    LEFT JOIN clients c ON e.client_id = c.id
    ${whereClause}
  `;
  const { total } = await db.get(countQuery, params) as { total: number };

  // Get paginated results with client info
  const dataQuery = `
    SELECT 
      e.*,
      c.name as client_name,
      c.email as client_email,
      c.phone as client_phone
    FROM estimates e
    LEFT JOIN clients c ON e.client_id = c.id
    ${whereClause}
    ORDER BY e.created_at DESC 
    LIMIT ? OFFSET ?
  `;
  
  const estimates = await db.all(dataQuery, [...params, parseInt(limit), offset]);

  res.json({
    success: true,
    data: {
      data: estimates,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// Get estimate by ID with full details
router.get('/:id', asyncHandler(async (req: Request, res: Response<ApiResponse<EstimateWithDetails>>) => {
  const { id } = req.params;

  // Get estimate with client info
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
    throw new AppError('Estimate not found', 404);
  }

  // Get project areas for this estimate
  const projectAreas = await db.all(`
    SELECT * FROM project_areas 
    WHERE estimate_id = ?
    ORDER BY created_at ASC
  `, [id]) as ProjectArea[];

  // Structure the response
  const estimateWithDetails: EstimateWithDetails = {
    ...estimate,
    client: {
      id: estimate.client_id,
      name: estimate.client_name,
      email: estimate.client_email,
      phone: estimate.client_phone,
      address: estimate.client_address,
      city: estimate.client_city,
      state: estimate.client_state,
      zip_code: estimate.client_zip_code,
      created_at: '',
      updated_at: ''
    },
    project_areas: projectAreas.map(area => ({
      ...area,
      quality_checkpoints: [],
      photos: []
    }))
  };

  res.json({
    success: true,
    data: estimateWithDetails
  });
}));

// Create new estimate
router.post('/', asyncHandler(async (req: Request, res: Response<ApiResponse<Estimate>>) => {
  const estimateData: CreateEstimateRequest = req.body;

  // Validation
  if (!estimateData.client_id) {
    throw new AppError('Client ID is required', 400);
  }

  if (!estimateData.title?.trim()) {
    throw new AppError('Estimate title is required', 400);
  }

  if (!estimateData.project_areas || estimateData.project_areas.length === 0) {
    throw new AppError('At least one project area is required', 400);
  }

  // Verify client exists
  const client = await db.get('SELECT id FROM clients WHERE id = ?', [estimateData.client_id]);
  if (!client) {
    throw new AppError('Client not found', 404);
  }

  // Generate estimate number
  const estimateNumber = await NumberService.getNextEstimateNumber();

  // Calculate totals from project areas
  let totalLaborCost = 0;
  let totalMaterialCost = 0;

  for (const area of estimateData.project_areas) {
    const laborCost = (area.labor_hours || 0) * (area.labor_rate || 0);
    const materialCost = area.material_cost || 0;
    totalLaborCost += laborCost;
    totalMaterialCost += materialCost;
  }

  const markupAmount = (totalLaborCost + totalMaterialCost) * ((estimateData.markup_percentage || 0) / 100);
  const totalAmount = totalLaborCost + totalMaterialCost + markupAmount;

  // Create estimate
  const result = await db.run(`
    INSERT INTO estimates (
      estimate_number, client_id, title, description, total_amount, 
      labor_cost, material_cost, markup_percentage, valid_until
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    estimateNumber,
    estimateData.client_id,
    estimateData.title.trim(),
    estimateData.description || null,
    totalAmount,
    totalLaborCost,
    totalMaterialCost,
    estimateData.markup_percentage || 0,
    estimateData.valid_until || null
  ]);

  const estimateId = result.id;

  // Create project areas
  for (const area of estimateData.project_areas) {
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
  const newEstimate = await db.get('SELECT * FROM estimates WHERE id = ?', [estimateId]) as Estimate;

  res.status(201).json({
    success: true,
    data: newEstimate,
    message: `Estimate ${estimateNumber} created successfully`
  });
}));

// Update estimate status
router.patch('/:id/status', asyncHandler(async (req: Request, res: Response<ApiResponse<Estimate>>) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (!status || !['draft', 'sent', 'approved', 'rejected', 'converted'].includes(status)) {
    throw new AppError('Valid status is required', 400);
  }

  // Check if estimate exists
  const estimate = await db.get('SELECT * FROM estimates WHERE id = ?', [id]) as Estimate;
  if (!estimate) {
    throw new AppError('Estimate not found', 404);
  }

  // Update status
  await db.run(
    'UPDATE estimates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, id]
  );

  // If notes provided, could log them to communications table
  if (notes) {
    await db.run(`
      INSERT INTO communications (
        client_id, estimate_id, communication_type, direction, subject, content
      )
      VALUES (?, ?, 'in_person', 'inbound', 'Status Update', ?)
    `, [estimate.client_id, id, notes]);
  }

  const updatedEstimate = await db.get('SELECT * FROM estimates WHERE id = ?', [id]) as Estimate;

  res.json({
    success: true,
    data: updatedEstimate,
    message: `Estimate status updated to ${status}`
  });
}));

// Create revision of estimate
router.post('/:id/revise', asyncHandler(async (req: Request, res: Response<ApiResponse<Estimate>>) => {
  const { id } = req.params;
  const revisionData = req.body;

  // Get original estimate
  const originalEstimate = await db.get('SELECT * FROM estimates WHERE id = ?', [id]) as Estimate;
  if (!originalEstimate) {
    throw new AppError('Original estimate not found', 404);
  }

  // Generate new estimate number for revision
  const estimateNumber = await NumberService.getNextEstimateNumber();

  // Create revision
  const result = await db.run(`
    INSERT INTO estimates (
      estimate_number, client_id, title, description, total_amount,
      labor_cost, material_cost, markup_percentage, valid_until,
      revision_number, parent_estimate_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    estimateNumber,
    originalEstimate.client_id,
    revisionData.title || originalEstimate.title,
    revisionData.description || originalEstimate.description,
    revisionData.total_amount || originalEstimate.total_amount,
    revisionData.labor_cost || originalEstimate.labor_cost,
    revisionData.material_cost || originalEstimate.material_cost,
    revisionData.markup_percentage || originalEstimate.markup_percentage,
    revisionData.valid_until || originalEstimate.valid_until,
    originalEstimate.revision_number + 1,
    originalEstimate.id
  ]);

  const newEstimate = await db.get('SELECT * FROM estimates WHERE id = ?', [result.id]) as Estimate;

  res.status(201).json({
    success: true,
    data: newEstimate,
    message: `Revision ${estimateNumber} created successfully`
  });
}));

// Delete estimate (only if status is draft)
router.delete('/:id', asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
  const { id } = req.params;

  const estimate = await db.get('SELECT * FROM estimates WHERE id = ?', [id]) as Estimate;
  if (!estimate) {
    throw new AppError('Estimate not found', 404);
  }

  if (estimate.status !== 'draft') {
    throw new AppError('Only draft estimates can be deleted', 409);
  }

  // Delete project areas first
  await db.run('DELETE FROM project_areas WHERE estimate_id = ?', [id]);
  
  // Delete estimate
  await db.run('DELETE FROM estimates WHERE id = ?', [id]);

  res.json({
    success: true,
    message: 'Estimate deleted successfully'
  });
}));

export default router;