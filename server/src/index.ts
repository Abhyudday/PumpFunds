import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import fundRoutes from './routes/funds';
import investmentRoutes from './routes/investments';
import portfolioRoutes from './routes/portfolio';
import setupRoutes from './routes/setup';

// Import services
import { initDatabase } from './services/database';
import { startSIPScheduler } from './services/scheduler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'PumpFunds API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      setup: '/setup/database',
      api: {
        funds: '/api/funds',
        auth: '/api/auth',
        investments: '/api/investments',
        portfolio: '/api/portfolio'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Setup routes (for Railway deployment)
app.use('/setup', setupRoutes);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/funds', fundRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/portfolio', portfolioRoutes);

// Health check endpoint for Railway and monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'PumpFunds API',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    console.log('✅ Database connected successfully');
    
    // Start SIP scheduler
    startSIPScheduler();
    console.log('✅ SIP scheduler started');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Server accessible at: http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 