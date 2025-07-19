import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { db } from './models/database';
import clientRoutes from './routes/clients';
import estimateRoutes from './routes/estimates';
import invoiceRoutes from './routes/invoices';
import communicationRoutes from './routes/communications';
import qualityRoutes from './routes/quality';
import uploadRoutes from './routes/uploads';
import authRoutes from './routes/auth';
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { setupCronJobs } from './services/cronService';

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);

// Protected routes (authentication required)
app.use('/api/clients', authenticateToken, clientRoutes);
app.use('/api/estimates', authenticateToken, estimateRoutes);
app.use('/api/invoices', authenticateToken, invoiceRoutes);
app.use('/api/communications', authenticateToken, communicationRoutes);
app.use('/api/quality', authenticateToken, qualityRoutes);
app.use('/api/uploads', authenticateToken, uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎨 Painting Business Server running on port ${PORT}`);
  console.log(`📊 API Documentation: http://localhost:${PORT}/api/health`);
  
  // Setup automated communication jobs
  setupCronJobs();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully');
  await db.close();
  process.exit(0);
});

export default app;