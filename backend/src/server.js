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

const axios = require('axios');

app.get('/api/config/status', async (req, res) => {
  try {
    const aiUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    const resp = await axios.get(`${aiUrl}/health`, { timeout: 3000 });
    res.json({ success: true, ...resp.data });
  } catch (err) {
    res.json({ success: false, groq_configured: false, error: 'AI Service unreachable' });
  }
});

app.post('/api/config/groq-key', async (req, res) => {
  const { apiKey, model } = req.body;
  try {
    const aiUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
    const resp = await axios.post(`${aiUrl}/ai/config`, {
      groq_api_key: apiKey,
      groq_model: model || 'llama-3.3-70b-versatile'
    }, { timeout: 5000 });
    res.json({ success: true, ...resp.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'node-express-backend',
    port: PORT,
    aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'
  });
});

app.listen(PORT, () => {
  console.log(`[NodeServer] College Placement API Gateway running on http://localhost:${PORT}`);
});
