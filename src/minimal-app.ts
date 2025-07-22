import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = parseInt(process.env.PORT || '5001', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app build
let clientBuildPath = '';

if (process.env.NODE_ENV === 'production') {
  // In production (Railway), try these paths
  const possiblePaths = [
    path.join(process.cwd(), 'client/dist'),
    path.join(__dirname, '../client/dist')
  ];
  
  for (const testPath of possiblePaths) {
    const indexPath = path.join(testPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      clientBuildPath = testPath;
      console.log(`✅ Found client build files at: ${clientBuildPath}`);
      break;
    }
  }
  
  if (!clientBuildPath) {
    console.error('❌ No valid static file path found in production!');
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

// Simple mock data for testing
const mockEstimates = [
  { id: 1, estimate_number: 'EST-001', title: 'Test Estimate', client_name: 'Test Client', total_amount: 1000, status: 'draft' }
];

// Mock API endpoints
app.get('/api/estimates', (req, res) => {
  res.json({
    success: true,
    data: {
      data: mockEstimates,
      total: mockEstimates.length,
      page: 1,
      limit: 20,
      totalPages: 1
    }
  });
});

app.get('/api/clients', (req, res) => {
  res.json({
    success: true,
    data: {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0
    }
  });
});

app.get('/api/invoices', (req, res) => {
  res.json({
    success: true,
    data: {
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0
    }
  });
});

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('React app not found');
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎨 PaintPro Manager Server running on port ${PORT}`);
  console.log(`🚀 App available at: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;