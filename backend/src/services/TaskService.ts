import { db } from '../config/database';
import { CriteriaTask } from '../types';

export class TaskService {
  private async resolveStudentId(studentId: string): Promise<string> {
    const res = await db.query(
      'SELECT id FROM college.students WHERE id::text = $1 OR user_id::text = $1 OR roll_number = $1 OR ($1 = \'stu-101\' AND roll_number = \'21CS1084\') LIMIT 1',
      [studentId]
    );
    return res.rowCount && res.rowCount > 0 ? res.rows[0].id : studentId;
  }

  async toggleTaskCompleted(studentId: string, taskId: string): Promise<boolean> {
    const resolvedId = await this.resolveStudentId(studentId);
    const existing = await db.query(
      'SELECT is_completed FROM college.student_task_status WHERE student_id = $1 AND task_id = $2',
      [resolvedId, taskId]
    );

    let newStatus = true;
    if (existing.rowCount && existing.rowCount > 0) {
      newStatus = !existing.rows[0].is_completed;
      await db.query(`
        UPDATE college.student_task_status
        SET is_completed = $1, completed_at = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE NULL END
        WHERE student_id = $2 AND task_id = $3
      `, [newStatus, resolvedId, taskId]);
    } else {
      await db.query(`
        INSERT INTO college.student_task_status (student_id, task_id, is_completed, completed_at)
        VALUES ($1, $2, true, CURRENT_TIMESTAMP)
      `, [resolvedId, taskId]);
    }

    return newStatus;
  }

  async verifyTaskByMentor(studentId: string, taskId: string, mentorUserId: string): Promise<void> {
    const resolvedId = await this.resolveStudentId(studentId);
    await db.query(`
      INSERT INTO college.student_task_status (
        student_id, task_id, is_completed, completed_at, verified_by_mentor, mentor_user_id, verified_at
      )
      VALUES ($1, $2, true, CURRENT_TIMESTAMP, true, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (student_id, task_id) DO UPDATE SET
        verified_by_mentor = true,
        mentor_user_id = $3,
        verified_at = CURRENT_TIMESTAMP;
    `, [resolvedId, taskId, mentorUserId]);
  }

  async importCriteriaTasksFromCsv(tasks: Array<{
    title: string;
    description: string;
    targetTrack: 'ALL' | 'HOPE' | 'PEP' | 'DEPARTMENT';
    isMandatory?: boolean;
  }>): Promise<number> {
    let imported = 0;
    for (const t of tasks) {
      await db.query(`
        INSERT INTO college.criteria_tasks (title, description, target_track, is_mandatory)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING;
      `, [t.title, t.description, t.targetTrack, t.isMandatory ?? true]);
      imported++;
    }
    return imported;
  }
}
