import express from 'express';
import cors from 'cors';
import { db } from './models/database';

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running!',
    timestamp: new Date().toISOString() 
  });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await db.get('SELECT 1 as test');
    res.json({ 
      success: true, 
      message: 'Database connected successfully',
      data: result 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Database connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🎨 Test Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Database test: http://localhost:${PORT}/api/test-db`);
});