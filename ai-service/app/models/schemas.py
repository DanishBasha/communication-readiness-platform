from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class QuestionGenerationRequest(BaseModel):
    turn_index: int = Field(default=0, description="0-indexed question turn")
    difficulty: str = Field(default="EASY", description="EASY, MEDIUM, or ADVANCED")
    candidate_name: str = "Aravind Kumar"
    department: str = "Computer Science and Engineering"
    target_domain: str = "Full Stack Development"
    skills: List[str] = ["Java", "Spring Boot", "Kafka", "PostgreSQL", "Docker"]
    project_summary: str = "High-throughput distributed order settlement engine handling 1,500 req/sec"
    previous_turns: List[Dict[str, str]] = []

class GeneratedQuestionResponse(BaseModel):
    question_number: int
    difficulty: str
    category: str
    question_text: str
    provider: str
    context_cue: str

class TurnEvaluationRequest(BaseModel):
    turn_index: int
    question_text: str
    student_answer: str
    difficulty: str = "MEDIUM"
    skills: List[str] = ["Java", "Kafka", "Spring Boot"]

class TurnEvaluationResponse(BaseModel):
    technical_score: int
    communication_score: int
    words_per_minute: int
    filler_words: Dict[str, int]
    total_fillers: int
    feedback: str
    strengths: str
    weaknesses: str
    next_recommended_difficulty: str

class ListeningEvaluationRequest(BaseModel):
    passage_title: str
    question_text: str
    expected_answer: str
    student_answer: str

class ListeningEvaluationResponse(BaseModel):
    score: int
    accuracy_level: str
    feedback: str
    missed_key_points: List[str]
