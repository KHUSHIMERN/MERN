const fs = require('fs');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const app = require('./app');

dotenv.config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    if (fs.existsSync('./seed.js')) {
      const seedData = require('./seed');
      if (typeof seedData === 'function') {
        await seedData();
      }
    }

    const server = app.listen(PORT, () => {
      console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
      console.log(`API endpoint: http://localhost:${PORT}/api`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n[PORT CONFLICT] Port ${PORT} is already in use by another process.`);
        console.error(`To resolve this conflict:`);
        console.error(`  1. Terminate the process using port ${PORT} (e.g. netstat -ano | findstr :${PORT} then taskkill /PID <PID> /F)`);
        console.error(`  2. Or specify a different port: set PORT=5001 && node server.js\n`);
        process.exit(1);
      } else {
        console.error('Server error:', err);
      }
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exitCode = 1;
    return null;
  }
};

if (require.main === module && process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
