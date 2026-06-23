require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const metricsRouter = require('./routes/metrics.routes');
const diagnosisRouter = require('./routes/diagnosis.routes');
const reportsRouter = require('./routes/reports.routes');
const settingsRouter = require('./routes/settings.routes');

const Settings = require('./models/Settings');
const { startScheduler } = require('./jobs/scheduler');

const app = express();
const server = http.createServer(app);

// Allow any CORS connection for local development dashboards
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT']
  }
});

// Middleware configurations
app.use(cors());
app.use(express.json());

// REST Route mappings
app.use('/api/metrics', metricsRouter);
app.use('/api/diagnosis', diagnosisRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);

// Serve audit documents statically
app.use('/storage/reports', express.static(path.join(__dirname, 'storage', 'reports')));

// Bind WebSocket instance to the application state
app.set('io', io);

// Socket.io connection logging
io.on('connection', (socket) => {
  console.log(`Socket.io client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Socket.io client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/network-analyzer';

console.log(`Connecting to MongoDB at: ${MONGO_URI}...`);
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB successfully connected.');
    
    // Seed default settings collection record if missing
    await Settings.getSettings();
    console.log('Application settings loaded / seeded.');

    // Start background scanner scheduler
    startScheduler(io);

    server.listen(PORT, () => {
      console.log(`Express application successfully listening on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB database connection failed. Server shutting down:', err.message);
    process.exit(1);
  });
