require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const connectDB = require('./config/database');
const emailService = require('./services/emailService');
const path = require('path');

/**
 * Belleful Food Ordering Backend - Production-Ready Server
 * Features: Auth (OTP/Google), Menu/Cart/Orders/Payments, Admin Dashboard, Contact Form
 * Deployment: Vercel-optimized, MongoDB Atlas
 */

const app = express();

// ===== ENVIRONMENT VALIDATION =====
const requiredEnv = ['MONGO_URI', 'JWT_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missing = requiredEnv.filter(key => !process.env[key]);
if (missing.length) {
  console.error('Missing ENV:', missing.join(', '));
  process.exit(1);
}

// ===== CONSTANTS =====
const PORT = process.env.PORT || 1500;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://bellefulchop.netlify.app';

// ===== 1. SECURITY MIDDLEWARE =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'https://res.cloudinary.com'],
      'script-src': ["'self'"],
    },
  },
}));

// CORS for frontend
app.use(cors({
  origin: [FRONTEND_URL, 'https://bellefulchop.netlify.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 req/IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ===== 2. BODY PARSING (Large files for images) =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Static files (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// ===== 3. HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

// Root
app.get('/', (req, res) => res.json({ message: 'Belleful API Running - Food Ordering Backend' }));

// ===== 4. API ROUTES =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/staff', require('./routes/staff'));

// ===== 5. 404 HANDLER =====
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ===== 6. GLOBAL ERROR HANDLER =====
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Server Error';
  
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ===== 7. GRACEFUL SHUTDOWN =====
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

// ===== START SERVER =====
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend: ${FRONTEND_URL}`);
      
      // Email service auto-initializes on module load
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

