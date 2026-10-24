import http from 'http';
import app from './app.js';
import prisma from './src/db/db.js';

const PORT = process.env.PORT || 3000;

// Database connection test
const testDatabaseConnection = async () => {
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('\n🔄 Shutting down server gracefully...');
    try {
        await prisma.$disconnect();
        console.log('✅ Database disconnected');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start server with database check
const startServer = async () => {
    console.log('🚀 Starting Blog Platform Server...');
    
    // Test database connection
    const dbConnected = await testDatabaseConnection();
    
    if (!dbConnected) {
        console.error('❌ Cannot start server without database connection');
        process.exit(1);
    }

    const server = http.createServer(app);

    server.listen(PORT, () => {
        console.log(`🌐 Server listening on http://localhost:${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`📝 API docs: http://localhost:${PORT}/api/blogs`);
    });

    // Handle server errors
    server.on('error', (error) => {
        console.error('❌ Server error:', error);
        gracefulShutdown();
    });
};

// Start the server
startServer().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
