const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET /api/portals/coordinator
router.get('/coordinator', (req, res) => {
  res.json({
    totalCandidates: 2840,
    hopeEliteCount: 58,
    pepDomainsCount: 21,
    eligibilityRate: 68.4,
    mentees: store.menteesList
  });
});

// GET /api/portals/mentor
router.get('/mentor', (req, res) => {
  res.json({
    mentorName: store.studentProfile.mentorName,
    department: 'CSE',
    mentees: store.menteesList
  });
});

// POST /api/portals/mentor/verify-task
router.post('/mentor/verify-task', (req, res) => {
  const { taskId } = req.body;
  const task = store.studentProfile.criteriaTasks.find(t => t.id === taskId);
  if (task) {
    task.verifiedByMentor = true;
    task.verifiedAt = new Date().toISOString().split('T')[0];
  }
  res.json({ success: true, task });
});

// GET /api/portals/admin
router.get('/admin', (req, res) => {
  res.json({
    pepDomains: store.PEP_DOMAINS,
    hopeEliteCount: 58
  });
});

module.exports = router;
