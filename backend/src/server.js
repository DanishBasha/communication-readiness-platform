require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const interviewRoutes = require('./routes/interviewRoutes');
const studentRoutes = require('./routes/studentRoutes');
const portalRoutes = require('./routes/portalRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/interview', interviewRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/portals', portalRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'node-express-backend',
    port: PORT,
    aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000'
  });
});

app.listen(PORT, () => {
  console.log(`[NodeServer] College Placement API Gateway running on http://localhost:${PORT}`);
});
