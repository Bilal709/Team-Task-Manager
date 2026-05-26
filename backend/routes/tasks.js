const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const pool = require('../db/pool');
const router = express.Router();

// Get all tasks (filter by team or assignee)
router.get('/', isAuthenticated, async (req, res) => {
  const { teamId, assigneeId } = req.query;
  
  try {
    let query = `
      SELECT DISTINCT t.*, 
             tm.name as team_name,
             array_agg(DISTINCT u.email) as assignee_emails,
             array_agg(DISTINCT u.id) as assignee_ids
      FROM tasks t
      LEFT JOIN teams tm ON t.team_id = tm.id
      LEFT JOIN task_assignees ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;
    
    // Filter by team
    if (teamId) {
      query += ` AND t.team_id = $${paramCount}`;
      params.push(teamId);
      paramCount++;
      
      // Verify user is member of this team
      const memberCheck = await pool.query(
        'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
        [teamId, req.user.id]
      );
      
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this team' });
      }
    }
    
    // Filter by assignee
    if (assigneeId) {
      query += ` AND ta.user_id = $${paramCount}`;
      params.push(assigneeId);
      paramCount++;
    }
    
    // If no team filter, only show tasks from teams user belongs to
    if (!teamId) {
      query += ` AND t.team_id IN (SELECT team_id FROM team_members WHERE user_id = $${paramCount})`;
      params.push(req.user.id);
      paramCount++;
    }
    
    query += ` GROUP BY t.id, tm.name ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    const tasks = result.rows.map(task => ({
      ...task,
      assignee_emails: task.assignee_emails?.filter(email => email !== null) || [],
      assignee_ids: task.assignee_ids?.filter(id => id !== null) || []
    }));
    
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new task
router.post('/', isAuthenticated, validate('createTask'), async (req, res) => {
  const { title, description, status, due_date, team_id, assignee_ids } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verify user is member of the team
    const memberCheck = await client.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [team_id, req.user.id]
    );
    
    if (memberCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'You are not a member of this team' });
    }
    
    // Create task
    const taskResult = await client.query(
      `INSERT INTO tasks (title, description, status, due_date, team_id, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [title.trim(), description, status || 'pending', due_date, team_id, req.user.id]
    );
    
    const taskId = taskResult.rows[0].id;
    
    // Add multiple assignees
    if (assignee_ids && assignee_ids.length > 0) {
      for (const userId of assignee_ids) {
        const assigneeCheck = await client.query(
          'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
          [team_id, userId]
        );
        
        if (assigneeCheck.rows.length > 0) {
          await client.query(
            'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)',
            [taskId, userId]
          );
        }
      }
    }
    
    await client.query('COMMIT');
    
    const completeTask = await pool.query(
      `SELECT t.*, tm.name as team_name,
              array_agg(DISTINCT u.email) as assignee_emails,
              array_agg(DISTINCT u.id) as assignee_ids
       FROM tasks t
       LEFT JOIN teams tm ON t.team_id = tm.id
       LEFT JOIN task_assignees ta ON t.id = ta.task_id
       LEFT JOIN users u ON ta.user_id = u.id
       WHERE t.id = $1
       GROUP BY t.id, tm.name`,
      [taskId]
    );
    
    res.status(201).json(completeTask.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Get single task
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, tm.name as team_name,
              array_agg(DISTINCT u.email) as assignee_emails,
              array_agg(DISTINCT u.id) as assignee_ids
       FROM tasks t
       LEFT JOIN teams tm ON t.team_id = tm.id
       LEFT JOIN task_assignees ta ON t.id = ta.task_id
       LEFT JOIN users u ON ta.user_id = u.id
       WHERE t.id = $1
       GROUP BY t.id, tm.name`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = result.rows[0];
    
    const memberCheck = await pool.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [task.team_id, req.user.id]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      ...task,
      assignee_emails: task.assignee_emails?.filter(email => email !== null) || [],
      assignee_ids: task.assignee_ids?.filter(id => id !== null) || []
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task (with status validation)
router.put('/:id', isAuthenticated, validate('updateTask'), async (req, res) => {
  const { title, description, status, due_date, assignee_ids } = req.body;
  const taskId = req.params.id;
  
  // VALIDATION: Check if status is valid
  const validStatuses = ['pending', 'in_progress', 'completed'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value. Must be pending, in_progress, or completed' });
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskResult = await client.query(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );
    
    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = taskResult.rows[0];
    
    const memberCheck = await client.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [task.team_id, req.user.id]
    );
    
    if (memberCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update task details
    await client.query(
      `UPDATE tasks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           due_date = COALESCE($4, due_date),
           updated_at = NOW()
       WHERE id = $5`,
      [title, description, status, due_date, taskId]
    );
    
    // Update assignees if provided
    if (assignee_ids !== undefined) {
      await client.query('DELETE FROM task_assignees WHERE task_id = $1', [taskId]);
      
      for (const userId of assignee_ids) {
        const assigneeCheck = await client.query(
          'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
          [task.team_id, userId]
        );
        
        if (assigneeCheck.rows.length > 0) {
          await client.query(
            'INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)',
            [taskId, userId]
          );
        }
      }
    }
    
    await client.query('COMMIT');
    
    const updatedTask = await pool.query(
      `SELECT t.*, tm.name as team_name,
              array_agg(DISTINCT u.email) as assignee_emails,
              array_agg(DISTINCT u.id) as assignee_ids
       FROM tasks t
       LEFT JOIN teams tm ON t.team_id = tm.id
       LEFT JOIN task_assignees ta ON t.id = ta.task_id
       LEFT JOIN users u ON ta.user_id = u.id
       WHERE t.id = $1
       GROUP BY t.id, tm.name`,
      [taskId]
    );
    
    res.json(updatedTask.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Delete task
router.delete('/:id', isAuthenticated, async (req, res) => {
  const taskId = req.params.id;
  
  try {
    const taskResult = await pool.query(
      `SELECT t.*, tm.creator_id as team_creator_id 
       FROM tasks t
       JOIN teams tm ON t.team_id = tm.id
       WHERE t.id = $1`,
      [taskId]
    );
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = taskResult.rows[0];
    const isTaskCreator = task.created_by === req.user.id;
    const isTeamCreator = task.team_creator_id === req.user.id;
    
    if (!isTaskCreator && !isTeamCreator) {
      return res.status(403).json({ 
        error: 'Only task creator or team creator can delete this task' 
      });
    }
    
    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tasks due soon (reminders)
router.get('/reminders/due-soon', isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT t.*, tm.name as team_name,
              array_agg(DISTINCT u.email) as assignee_emails
       FROM tasks t
       JOIN teams tm ON t.team_id = tm.id
       JOIN team_members tmm ON tm.id = tmm.team_id
       LEFT JOIN task_assignees ta ON t.id = ta.task_id
       LEFT JOIN users u ON ta.user_id = u.id
       WHERE tmm.user_id = $1 
         AND t.due_date IS NOT NULL 
         AND t.due_date <= CURRENT_DATE + INTERVAL '3 days'
         AND t.status != 'completed'
       GROUP BY t.id, tm.name
       ORDER BY t.due_date ASC`,
      [req.user.id]
    );
    
    const reminders = result.rows.map(task => ({
      ...task,
      assignee_emails: task.assignee_emails?.filter(email => email !== null) || []
    }));
    
    res.json({
      reminders: reminders,
      message: reminders.length > 0 
        ? `You have ${reminders.length} task(s) due soon!` 
        : 'No tasks due soon'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;