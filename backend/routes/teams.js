const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const pool = require('../db/pool');
const router = express.Router();

// Get all teams for the logged-in user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, 
        CASE WHEN t.creator_id = $1 THEN true ELSE false END as is_creator
       FROM teams t
       JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single team with members
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    // Check if user is member of team
    const memberCheck = await pool.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get team details
    const teamResult = await pool.query(
      'SELECT * FROM teams WHERE id = $1',
      [req.params.id]
    );
    
    // Get team members with their emails
    const membersResult = await pool.query(
      `SELECT u.id, u.email, 
        CASE WHEN u.id = $1 THEN true ELSE false END as is_current_user
       FROM users u
       JOIN team_members tm ON u.id = tm.user_id
       WHERE tm.team_id = $2`,
      [req.user.id, req.params.id]
    );
    
    res.json({
      ...teamResult.rows[0],
      members: membersResult.rows,
      is_creator: teamResult.rows[0].creator_id === req.user.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new team
router.post('/', isAuthenticated, validate('createTeam'), async (req, res) => {
  const { name } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create team
    const teamResult = await client.query(
      'INSERT INTO teams (name, creator_id) VALUES ($1, $2) RETURNING *',
      [name.trim(), req.user.id]
    );
    
    // Add creator as member
    await client.query(
      'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
      [teamResult.rows[0].id, req.user.id]
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      ...teamResult.rows[0],
      is_creator: true
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// Add member to team (by email)
router.post('/:id/members', isAuthenticated, validate('addMember'), async (req, res) => {
  const { email } = req.body;
  const teamId = req.params.id;
  
  try {
    // Check if user is team member
    const memberCheck = await pool.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const newMember = userResult.rows[0];
    
    // Check if already a member
    const existingMember = await pool.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, newMember.id]
    );
    
    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a team member' });
    }
    
    // Add to team
    await pool.query(
      'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
      [teamId, newMember.id]
    );
    
    res.json({ 
      message: 'Member added successfully',
      user: newMember
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove member from team (ONLY TEAM CREATOR CAN REMOVE)
router.delete('/:id/members/:userId', isAuthenticated, async (req, res) => {
  const teamId = req.params.id;
  const userId = parseInt(req.params.userId);
  
  try {
    // Get team to check creator
    const teamResult = await pool.query(
      'SELECT * FROM teams WHERE id = $1',
      [teamId]
    );
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const team = teamResult.rows[0];
    
    // ONLY TEAM CREATOR can remove members
    if (team.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Only team creator can remove members' });
    }
    
    // Cannot remove yourself
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove yourself' });
    }
    
    // Check if target user is a member
    const memberCheck = await pool.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User is not a member of this team' });
    }
    
    // Remove member
    await pool.query(
      'DELETE FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );
    
    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete team (ROLE-BASED ACCESS: only creator can delete)
router.delete('/:id', isAuthenticated, async (req, res) => {
  const teamId = req.params.id;
  
  try {
    // Get team to check creator
    const teamResult = await pool.query(
      'SELECT * FROM teams WHERE id = $1',
      [teamId]
    );
    
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const team = teamResult.rows[0];
    
    // ROLE-BASED ACCESS: Only creator can delete
    if (team.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Only team creator can delete this team' });
    }
    
    // Delete team (cascade will delete team_members)
    await pool.query('DELETE FROM teams WHERE id = $1', [teamId]);
    
    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// BONUS: Stubbed email invite endpoint
router.post('/:id/invite', isAuthenticated, validate('inviteMember'), async (req, res) => {
  const { email } = req.body;
  const teamId = req.params.id;
  
  try {
    // Check if user is team member
    const memberCheck = await pool.query(
      'SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, req.user.id]
    );
    
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get team name
    const teamResult = await pool.query(
      'SELECT name FROM teams WHERE id = $1',
      [teamId]
    );
    
    // Stubbed email (no SMTP needed)
    console.log(`[EMAIL STUB] Invitation sent to ${email} for team: ${teamResult.rows[0].name}`);
    
    res.json({
      message: 'Invitation sent (stubbed)',
      details: `Invitation would be sent to ${email} to join team: ${teamResult.rows[0].name}`,
      email_stub: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;