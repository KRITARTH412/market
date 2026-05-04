import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
// Load from root .env (current working directory when running npm run server)
dotenv.config();

// Debug: Log to verify env vars are loaded
console.log('🔍 Environment check:');
console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✓ Set' : '✗ Missing');
console.log('  PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? '✓ Set' : '✗ Missing');
console.log('  CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✓ Set' : '✗ Missing');

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import orgRoutes from './routes/org.routes.js';
import projectRoutes from './routes/project.routes.js';
import documentRoutes from './routes/document.routes.js';
import chatRoutes from './routes/chat.routes.js';
import leadRoutes from './routes/lead.routes.js';
import followUpRoutes from './routes/followup.routes.js';
import searchRoutes from './routes/search.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import widgetRoutes from './routes/widget.routes.js';
import billingRoutes from './routes/billing.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173' || 'http://localhost:5174',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/followups', followUpRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/widget', widgetRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
});

export default app;


# Server Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb+srv://salluk412184:King123@cluster0.6bkeeoi.mongodb.net/?appName=Cluster0

# JWT Secrets
JWT_ACCESS_SECRET=your-access-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
# AI Provider Configuration
# SambaNova for chat completions
SAMBANOVA_API_KEY=b09f02a6-5d66-4556-9f9d-bc770395ee51
SAMBANOVA_BASE_URL=https://api.sambanova.ai/v1
SAMBANOVA_CHAT_MODEL=DeepSeek-V3.1

# Cohere for embeddings (required for document vectorization)
COHERE_API_KEY=PnGd38W9EYUdTN1TuJNFrkeykrAu9QeEqISsHS5m
COHERE_EMBEDDING_MODEL=embed-english-v3.0

# Pinecone (Vector Database)
PINECONE_API_KEY=pcsk_4Ep51e_AjN8AZitssM13q8NeGYK1n2NdjR2XA23v2KdpCaaPP1h62sTVgJtryGXHHPomu7
PINECONE_INDEX_NAME=quickstart
PINECONE_ENVIRONMENT=us-east-1-aws
# Cloudinary
CLOUDINARY_CLOUD_NAME=kritarth123
CLOUDINARY_API_KEY=277378653485691
CLOUDINARY_API_SECRET=2YQVKUDNFbQ0m3oRvUmV2rOrceA

# # Email (Nodemailer)
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASSWORD=your-app-password
# EMAIL_FROM=PropMind AI <noreply@propmind.ai>

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=kritartht30@gmail.com
EMAIL_PASSWORD=vbszecyrjbxygibm
EMAIL_FROM=noreply@yourplatform.com

# Razorpay
RAZORPAY_KEY_ID=rzp_test_Sk3hxP7swLaSNl
RAZORPAY_KEY_SECRET=4lBJs6EIlyk5FbW1NacTFk6K
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=100

# Widget Rate Limiting
WIDGET_RATE_LIMIT_WINDOW_MS=86400000
WIDGET_RATE_LIMIT_MAX_REQUESTS=500

