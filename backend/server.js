import express from 'express';
import cors from 'cors';
import compression from 'compression';
import sheetsService from './services/sheetsService.js';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(compression()); // Enable compression for all responses
app.use(cors());
app.use(express.json());

// Register routes
app.use('/api', apiRoutes);

// Initialize Google Sheets API on startup
sheetsService.initialize().then(initialized => {
  if (!initialized) {
    console.log('⚠️  Google Sheets not configured - API will return errors');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
