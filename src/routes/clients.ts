import express, { Request, Response } from 'express';
import { db } from '../models/database';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { ApiResponse, Client, CreateClientRequest, ClientFilters, PaginatedResponse } from '../types';

const router = express.Router();

// Get all clients with optional filtering and pagination
router.get('/', asyncHandler(async (req: Request, res: Response<ApiResponse<PaginatedResponse<Client>>>) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    city = '',
    state = ''
  } = req.query as any;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (search) {
    whereClause += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (city) {
    whereClause += ' AND city LIKE ?';
    params.push(`%${city}%`);
  }

  if (state) {
    whereClause += ' AND state LIKE ?';
    params.push(`%${state}%`);
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM clients ${whereClause}`;
  const { total } = await db.get(countQuery, params) as { total: number };

  // Get paginated results
  const dataQuery = `
    SELECT * FROM clients 
    ${whereClause}
    ORDER BY name ASC 
    LIMIT ? OFFSET ?
  `;
  
  const clients = await db.all(dataQuery, [...params, parseInt(limit), offset]) as Client[];

  res.json({
    success: true,
    data: {
      data: clients,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
}));

// Get client by ID with related data
router.get('/:id', asyncHandler(async (req: Request, res: Response<ApiResponse<Client>>) => {
  const { id } = req.params;

  const client = await db.get('SELECT * FROM clients WHERE id = ?', [id]) as Client;
  if (!client) {
    throw new AppError('Client not found', 404);
  }

  // Get client's estimates and invoices count
  const estimatesCount = await db.get(
    'SELECT COUNT(*) as count FROM estimates WHERE client_id = ?',
    [id]
  ) as { count: number };

  const invoicesCount = await db.get(
    'SELECT COUNT(*) as count FROM invoices WHERE client_id = ?',
    [id]
  ) as { count: number };

  const totalSpent = await db.get(
    'SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE client_id = ? AND status = "paid"',
    [id]
  ) as { total: number };

  res.json({
    success: true,
    data: {
      ...client,
      estimates_count: estimatesCount.count,
      invoices_count: invoicesCount.count,
      total_spent: totalSpent.total
    } as any
  });
}));

// Create new client
router.post('/', asyncHandler(async (req: Request, res: Response<ApiResponse<Client>>) => {
  const clientData: CreateClientRequest = req.body;

  // Validation
  if (!clientData.name?.trim()) {
    throw new AppError('Client name is required', 400);
  }

  if (clientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email)) {
    throw new AppError('Invalid email format', 400);
  }

  // Check for duplicate email
  if (clientData.email) {
    const existingClient = await db.get(
      'SELECT id FROM clients WHERE email = ?',
      [clientData.email]
    );
    if (existingClient) {
      throw new AppError('Client with this email already exists', 409);
    }
  }

  const result = await db.run(
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

  const newClient = await db.get('SELECT * FROM clients WHERE id = ?', [result.id]) as Client;

  res.status(201).json({
    success: true,
    data: newClient,
    message: 'Client created successfully'
  });
}));

// Update client
router.put('/:id', asyncHandler(async (req: Request, res: Response<ApiResponse<Client>>) => {
  const { id } = req.params;
  const clientData: CreateClientRequest = req.body;

  // Check if client exists
  const existingClient = await db.get('SELECT * FROM clients WHERE id = ?', [id]) as Client;
  if (!existingClient) {
    throw new AppError('Client not found', 404);
  }

  // Validation
  if (!clientData.name?.trim()) {
    throw new AppError('Client name is required', 400);
  }

  if (clientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.email)) {
    throw new AppError('Invalid email format', 400);
  }

  // Check for duplicate email (excluding current client)
  if (clientData.email) {
    const duplicateClient = await db.get(
      'SELECT id FROM clients WHERE email = ? AND id != ?',
      [clientData.email, id]
    );
    if (duplicateClient) {
      throw new AppError('Another client with this email already exists', 409);
    }
  }

  await db.run(
    `UPDATE clients SET 
     name = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, zip_code = ?, notes = ?,
     updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      clientData.name.trim(),
      clientData.email || null,
      clientData.phone || null,
      clientData.address || null,
      clientData.city || null,
      clientData.state || null,
      clientData.zip_code || null,
      clientData.notes || null,
      id
    ]
  );

  const updatedClient = await db.get('SELECT * FROM clients WHERE id = ?', [id]) as Client;

  res.json({
    success: true,
    data: updatedClient,
    message: 'Client updated successfully'
  });
}));

// Delete client
router.delete('/:id', asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
  const { id } = req.params;

  // Check if client exists
  const client = await db.get('SELECT * FROM clients WHERE id = ?', [id]);
  if (!client) {
    throw new AppError('Client not found', 404);
  }

  // Check if client has any estimates or invoices
  const hasEstimates = await db.get(
    'SELECT COUNT(*) as count FROM estimates WHERE client_id = ?',
    [id]
  ) as { count: number };

  const hasInvoices = await db.get(
    'SELECT COUNT(*) as count FROM invoices WHERE client_id = ?',
    [id]
  ) as { count: number };

  if (hasEstimates.count > 0 || hasInvoices.count > 0) {
    throw new AppError('Cannot delete client with existing estimates or invoices', 409);
  }

  await db.run('DELETE FROM clients WHERE id = ?', [id]);

  res.json({
    success: true,
    message: 'Client deleted successfully'
  });
}));

// Get client history (estimates and invoices)
router.get('/:id/history', asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
  const { id } = req.params;

  // Check if client exists
  const client = await db.get('SELECT * FROM clients WHERE id = ?', [id]);
  if (!client) {
    throw new AppError('Client not found', 404);
  }

  const estimates = await db.all(
    `SELECT 
       id, estimate_number, title, status, total_amount, 
       valid_until, created_at
     FROM estimates 
     WHERE client_id = ? 
     ORDER BY created_at DESC`,
    [id]
  );

  const invoices = await db.all(
    `SELECT 
       id, invoice_number, title, status, total_amount, 
       paid_amount, due_date, created_at
     FROM invoices 
     WHERE client_id = ? 
     ORDER BY created_at DESC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      estimates,
      invoices
    }
  });
}));

export default router;