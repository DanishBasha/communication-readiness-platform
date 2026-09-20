const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET /api/students/profile
router.get('/profile', (req, res) => {
  res.json({
    success: true,
    student: store.studentProfile,
    latestReport: store.latestReport
  });
});

// POST /api/students/resume
router.post('/resume', (req, res) => {
  const { resume } = req.body;
  if (resume) {
    store.studentProfile.resume = resume;
  }
  res.json({
    success: true,
    message: 'Resume updated successfully',
    resume: store.studentProfile.resume
  });
});

// PATCH /api/students/criteria/:taskId
router.patch('/criteria/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = store.studentProfile.criteriaTasks.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({ error: 'Criteria task not found' });
  }

  task.isCompleted = !task.isCompleted;
  res.json({ success: true, task, criteriaTasks: store.studentProfile.criteriaTasks });
});

module.exports = router;
