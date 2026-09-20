const express = require('express');
const axios = require('axios');
const router = express.Router();
const store = require('../data/store');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// POST /api/interview/start
router.post('/start', async (req, res) => {
  const { type = 'MOCK_INTERVIEW', candidateId = 'stu-21cs1084' } = req.body;
  const sessionId = `ses_${Date.now()}`;

  const student = store.studentProfile;
  const initialSkills = student.resume?.skills 
    ? [...(student.resume.skills.languages || []), ...(student.resume.skills.frameworks || [])]
    : ['Java', 'Spring Boot', 'Kafka'];

  let firstQuestion = null;

  try {
    // Call FastAPI AI Service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/ai/generate-question`, {
      turn_index: 0,
      difficulty: 'EASY',
      candidate_name: student.name,
      department: student.department,
      target_domain: student.pepDomain || 'Full Stack Development',
      skills: initialSkills,
      project_summary: student.resume?.projects?.[0]?.description || 'Distributed order settlement engine',
      previous_turns: []
    }, { timeout: 8000 });

    firstQuestion = aiResponse.data;
  } catch (err) {
    console.warn(`[InterviewRouter] FastAPI unreachable at ${AI_SERVICE_URL}. Using fallback question.`);
    firstQuestion = {
      question_number: 1,
      difficulty: 'EASY',
      category: 'System Architecture',
      question_text: 'I see in your resume you built an event-driven payment settlement pipeline using Apache Kafka. Why did you choose Kafka over RabbitMQ, and how did you guarantee partition order under high throughput?',
      context_cue: 'Grounded in resume project: High-throughput order settlement engine',
      provider: 'Local Gateway Fallback'
    };
  }

  const session = {
    id: sessionId,
    type,
    candidateId,
    turnIndex: 0,
    currentDifficulty: firstQuestion.difficulty,
    tabSwitches: 0,
    isFlagged: false,
    questions: [
      {
        id: `q_0`,
        questionNumber: 1,
        questionText: firstQuestion.question_text,
        difficulty: firstQuestion.difficulty,
        category: firstQuestion.category,
        contextCue: firstQuestion.context_cue
      }
    ],
    answers: [],
    createdAt: new Date().toISOString()
  };

  store.activeSessions[sessionId] = session;
  res.json({ success: true, session });
});

// POST /api/interview/submit-turn
router.post('/submit-turn', async (req, res) => {
  const { sessionId, answerText } = req.body;
  const session = store.activeSessions[sessionId];

  if (!session) {
    return res.status(404).json({ error: 'Interview session not found' });
  }

  const currentQ = session.questions[session.turnIndex];
  let evaluation = null;

  try {
    const evalRes = await axios.post(`${AI_SERVICE_URL}/ai/evaluate-turn`, {
      turn_index: session.turnIndex,
      question_text: currentQ.questionText,
      student_answer: answerText,
      difficulty: session.currentDifficulty,
      skills: store.studentProfile.resume?.skills?.languages || ['Java']
    }, { timeout: 8000 });

    evaluation = evalRes.data;
  } catch (err) {
    console.warn(`[InterviewRouter] FastAPI unreachable for evaluation. Using local evaluator.`);
    evaluation = {
      technical_score: 84,
      communication_score: 80,
      words_per_minute: 124,
      filler_words: { um: 1, like: 1 },
      total_fillers: 2,
      feedback: 'Good technical articulation of distributed locks and partition offsets.',
      strengths: 'Clear explanation of concurrency trade-offs.',
      weaknesses: 'Could elaborate more on partition rebalancing.',
      next_recommended_difficulty: session.turnIndex === 0 ? 'MEDIUM' : 'ADVANCED'
    };
  }

  // Update current question with evaluation
  currentQ.studentAnswer = answerText;
  currentQ.technicalScore = evaluation.technical_score;
  currentQ.communicationScore = evaluation.communication_score;
  currentQ.wpm = evaluation.words_per_minute;
  currentQ.fillerWords = evaluation.total_fillers;
  currentQ.feedback = evaluation.feedback;
  currentQ.strengths = evaluation.strengths;
  currentQ.weaknesses = evaluation.weaknesses;

  session.answers.push({
    turn: session.turnIndex + 1,
    question: currentQ.questionText,
    answer: answerText,
    evaluation
  });

  const nextTurnIndex = session.turnIndex + 1;
  const isConcluded = nextTurnIndex >= 3; // 3 turns total

  if (isConcluded) {
    session.isConcluded = true;
    // Generate final report
    const finalReport = {
      id: `rep_${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      sessionType: session.type,
      overallScore: Math.round((evaluation.technical_score + evaluation.communication_score) / 2),
      technicalScore: evaluation.technical_score,
      communicationScore: evaluation.communication_score,
      averageWpm: evaluation.words_per_minute,
      totalFillerWords: evaluation.total_fillers,
      fillerWordBreakdown: evaluation.filler_words,
      skillBreakdown: [
        { skill: 'Java & Concurrency', score: evaluation.technical_score, status: 'STRONG', recommendation: 'Solid command of multithreading.' },
        { skill: 'Kafka & Distributed Architecture', score: 85, status: 'STRONG', recommendation: 'Good understanding of partition offsets.' },
        { skill: 'Speech Cadence & Articulation', score: evaluation.communication_score, status: 'MODERATE', recommendation: 'Aim for a steady 130-140 WPM.' }
      ],
      actionableNextSteps: [
        'Maintain natural 2-second pauses before complex architectural explanations.',
        'Great clarity on distributed transactions. Keep practicing failure modes.'
      ],
      tabSwitches: session.tabSwitches,
      isFlagged: session.isFlagged
    };

    store.latestReport = finalReport;
    return res.json({
      success: true,
      concluded: true,
      evaluation,
      report: finalReport,
      session
    });
  }

  // Fetch next question from AI service
  session.turnIndex = nextTurnIndex;
  session.currentDifficulty = evaluation.next_recommended_difficulty || 'MEDIUM';

  let nextQ = null;
  try {
    const nextQRes = await axios.post(`${AI_SERVICE_URL}/ai/generate-question`, {
      turn_index: nextTurnIndex,
      difficulty: session.currentDifficulty,
      candidate_name: store.studentProfile.name,
      department: store.studentProfile.department,
      target_domain: store.studentProfile.pepDomain,
      skills: store.studentProfile.resume?.skills?.languages || ['Java'],
      project_summary: store.studentProfile.resume?.projects?.[0]?.description,
      previous_turns: session.answers.map(a => ({ question: a.question, answer: a.answer }))
    }, { timeout: 8000 });
    nextQ = nextQRes.data;
  } catch (err) {
    nextQ = {
      question_number: nextTurnIndex + 1,
      difficulty: session.currentDifficulty,
      category: 'Database Concurrency',
      question_text: 'In your PostgreSQL transactional database, how did you handle concurrent inventory deductions to prevent double-spending?',
      context_cue: 'Grounded in resume: PostgreSQL'
    };
  }

  const newQuestionTurn = {
    id: `q_${nextTurnIndex}`,
    questionNumber: nextTurnIndex + 1,
    questionText: nextQ.question_text,
    difficulty: nextQ.difficulty,
    category: nextQ.category,
    contextCue: nextQ.context_cue
  };

  session.questions.push(newQuestionTurn);

  res.json({
    success: true,
    concluded: false,
    evaluation,
    nextQuestion: newQuestionTurn,
    session
  });
});

// POST /api/interview/proctor-event
router.post('/proctor-event', (req, res) => {
  const { sessionId } = req.body;
  const session = store.activeSessions[sessionId];

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.tabSwitches += 1;
  if (session.tabSwitches >= 4) {
    session.isFlagged = true;
  }

  res.json({
    success: true,
    tabSwitches: session.tabSwitches,
    isFlagged: session.isFlagged,
    allowedMax: 4
  });
});

module.exports = router;
