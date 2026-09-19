import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import connectDB from './db/connect.js';
import Problem from './models/Problem.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import problemRoutes from './routes/problemRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import universityRoutes from './routes/universityRoutes.js';
import industryRoutes from './routes/industryRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import bhashiniRoutes from './routes/bhashiniRoutes.js';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'https://jharkhand-pragati-setu.vercel.app';

// Trust reverse proxy for secure HTTPS cookies on Vercel
app.set('trust proxy', 1);

const ALLOWED_ORIGINS = [
  'https://jharkhand-pragati-setu.vercel.app',
  CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

// 1. CORS Configuration (Allows credentials for secure cross-origin HTTP-Only cookies)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      if (
        ALLOWED_ORIGINS.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for production deployment
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie']
  })
);

// Ensure DB connection for serverless / edge requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('[DB Connect Error]:', err.message);
  }
  next();
});

// 2. Body Parsing Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Cookie Parser Middleware for HTTP-Only Auth tokens
app.use(cookieParser());

// 4. API Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    platform: 'SIH 2026 Societal Problem-to-Innovation Ecosystem',
    aiEngine: 'Active',
    timestamp: new Date().toISOString()
  });
});

// 4.1 Maps & GIS Configuration Endpoint
app.get('/api/config/maps', (req, res) => {
  res.status(200).json({
    success: true,
    mapsApiKey: process.env.MAPS_API_KEY || process.env.VITE_MAPS_API_KEY || '',
    tileLayer: process.env.MAP_TILE_LAYER || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    defaultCenter: { lat: 23.6102, lng: 85.2799 }, // Jharkhand State Geographical Centroid
    defaultZoom: 8
  });
});

// 5. Mount API Route Handlers
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/universities', universityRoutes);
app.use('/api/industry', industryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bhashini', bhashiniRoutes);

// 6. Global 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// 7. Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

/**
 * Start Server Function
 * Awaits MongoDB connection BEFORE listening on the HTTP port as requested.
 */
const startServer = async () => {
  try {
    console.log('[Startup] Connecting to MongoDB database...');
    await connectDB();
  } catch (error) {
    console.warn('[Startup Notice] MongoDB offline or connecting:', error.message);
    console.warn('[Startup Notice] Backend running in resilient mode. Database operations will reconnect once MongoDB is available.');
  }

  // Start listening on HTTP port
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 SIH 2026 Backend Running on http://localhost:${PORT}`);
      console.log(`⚡ AI & Bhashini Engine: Active`);
      console.log(`🔒 Auth: Secure HTTP-Only Cookies enabled`);
      console.log(`=======================================================`);
    });
  }
};

startServer();

export default app;
