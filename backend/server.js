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
    return app.listen(PORT, () => {
      console.log(`✨ Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
      console.log(`API endpoint: http://localhost:${PORT}/api`);
    });
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
