import { IVectorStore, VectorDocument } from '../adapters/vector/IVectorStore';
import { ParsedResume } from '../types';

export class ContextBuilder {
  constructor(private vectorStore: IVectorStore) {}

  async initializeSessionContext(
    sessionId: string,
    studentTrack: string,
    domainName: string,
    resume: ParsedResume | null
  ): Promise<void> {
    await this.vectorStore.createSessionCollection(sessionId);

    const docs: VectorDocument[] = [];

    // 1. Domain and Cohort Knowledge Document
    docs.push({
      id: `${sessionId}-cohort-info`,
      text: `Student Cohort: ${studentTrack}. Target Technical Domain: ${domainName}. Evaluated for campus technical placements.`,
      metadata: { type: 'COHORT' }
    });

    // 2. Resume Projects Chunks
    if (resume?.projects && Array.isArray(resume.projects) && resume.projects.length > 0) {
      resume.projects.forEach((proj, idx) => {
        const stack = Array.isArray(proj.techStack) ? proj.techStack.join(', ') : (proj.techStack || 'General');
        docs.push({
          id: `${sessionId}-project-${idx}`,
          text: `Project Title: ${proj.title}. Tech Stack: ${stack}. Project Description: ${proj.description || ''}`,
          metadata: { type: 'PROJECT', title: proj.title, techStack: proj.techStack || [] }
        });
      });
    }

    // 3. Resume Skills Chunks
    if (resume?.skills) {
      const languages = Array.isArray(resume.skills.languages) ? resume.skills.languages : [];
      const frameworks = Array.isArray(resume.skills.frameworks) ? resume.skills.frameworks : [];
      const databases = Array.isArray(resume.skills.databases) ? resume.skills.databases : [];
      const tools = Array.isArray(resume.skills.tools) ? resume.skills.tools : [];
      docs.push({
        id: `${sessionId}-skills`,
        text: `Programming Languages: ${languages.join(', ')}. Frameworks: ${frameworks.join(', ')}. Databases: ${databases.join(', ')}. Developer Tools: ${tools.join(', ')}.`,
        metadata: { type: 'SKILLS' }
      });
    }

    // 4. Resume Summary
    if (resume?.summary) {
      docs.push({
        id: `${sessionId}-summary`,
        text: `Candidate Summary: ${resume.summary}`,
        metadata: { type: 'SUMMARY' }
      });
    }

    await this.vectorStore.addDocuments(sessionId, docs);
  }

  async retrieveContextForTurn(
    sessionId: string,
    querySkillOrTopic: string,
    topK = 3
  ): Promise<string> {
    if (!this.vectorStore.hasSession(sessionId)) {
      return '';
    }

    const matches = await this.vectorStore.querySimilar(sessionId, querySkillOrTopic, topK);
    if (matches.length === 0) {
      return 'No specific project groundings found.';
    }

    return matches.map(m => `[Grounding: ${m.metadata?.type || 'DOC'}] ${m.text}`).join('\n');
  }

  async appendTurnContext(
    sessionId: string,
    turnNumber: number,
    questionText: string,
    answerText: string
  ): Promise<void> {
    if (!this.vectorStore.hasSession(sessionId)) return;

    await this.vectorStore.addDocuments(sessionId, [
      {
        id: `${sessionId}-turn-${turnNumber}`,
        text: `Question ${turnNumber}: ${questionText} | Candidate Spoken Answer: ${answerText}`,
        metadata: { type: 'CONVERSATION_HISTORY', turn: turnNumber }
      }
    ]);
  }

  async cleanupSession(sessionId: string): Promise<void> {
    await this.vectorStore.purgeSession(sessionId);
  }
}
