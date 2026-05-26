import React, { useState, useEffect } from 'react';
import api from '../api/axios';

function CreateTaskModal({ team, teams, onClose, onTaskCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await api.get(`/teams/${team.id}`);
        setTeamMembers(response.data.members || []);
      } catch (err) {
        console.error('Failed to fetch members');
      }
    };
    fetchMembers();
  }, [team.id]);

  const handleAssigneeToggle = (userId) => {
    setSelectedAssignees(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setLoading(true);
    try {
      await api.post('/tasks', {
        title,
        description,
        due_date: dueDate || null,
        assignee_ids: selectedAssignees,
        team_id: team.id,
        status: 'pending'
      });
      onTaskCreated();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-96 max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
          Create Task in {team.name}
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Task Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg mb-3 
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg mb-3 
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            rows="3"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg mb-3 
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          
          <p className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2">
            Assign to (multiple):
          </p>
          <div className="mb-4 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
            {teamMembers.length > 0 ? (
              teamMembers.map(member => (
                <label key={member.id} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAssignees.includes(member.id)}
                    onChange={() => handleAssigneeToggle(member.id)}
                    className="cursor-pointer accent-indigo-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {member.email} {member.is_current_user && '(You)'}
                  </span>
                </label>
              ))
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-sm text-center">No members in this team</p>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 
                       hover:from-emerald-600 hover:to-teal-700
                       text-white font-semibold py-2 rounded-lg transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-200 dark:bg-slate-700 
                       text-slate-700 dark:text-slate-300 
                       hover:bg-slate-300 dark:hover:bg-slate-600
                       font-semibold py-2 rounded-lg transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTaskModal;