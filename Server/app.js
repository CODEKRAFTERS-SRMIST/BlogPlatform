import express, { json, urlencoded } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from 'dotenv';
import registerRoutes from './src/routes/index.routes.js';
import prisma from './src/db/db.js';

config();

const app = express();

// Global middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(morgan('dev'));

// Register all routes
registerRoutes(app);

// Health check
app.get('/health', async (req, res) => {
	try {
		// Test database connection
		await prisma.$queryRaw`SELECT 1`;
		res.status(200).json({ 
			status: 'ok', 
			database: 'connected',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		res.status(503).json({ 
			status: 'error', 
			database: 'disconnected',
			error: error.message,
			timestamp: new Date().toISOString()
		});
	}
});

// Root route
app.get('/', (req, res) => {
	res.json({ message: 'BlogPlatform Backend API' });
});

export default app;


