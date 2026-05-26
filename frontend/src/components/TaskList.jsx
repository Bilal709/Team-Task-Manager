import React, { useState } from 'react';
import api from '../api/axios';
import EditTaskModal from './EditTaskModal';

function TaskList({ tasks, onTaskUpdated, selectedTeam }) {
  const [editingTask, setEditingTask] = useState(null);

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      onTaskUpdated();
    } catch (err) {
      alert('Failed to update task');
    }
  };

  const deleteTask = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      try {
        await api.delete(`/tasks/${taskId}`);
        onTaskUpdated();
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete task');
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <span className="badge-completed">✓ Completed</span>;
      case 'in_progress':
        return <span className="badge-progress">▶ In Progress</span>;
      default:
        return <span className="badge-pending">○ Pending</span>;
    }
  };

  return (
    <>
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400">
              {selectedTeam ? 'No tasks yet. Create your first task!' : 'Select a team to view tasks'}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="task-card card-hover">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
                      {task.title}
                    </h3>
                    {getStatusBadge(task.status)}
                  </div>
                  
                  {task.description && (
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 mb-3">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-3 mt-2">
                    {/* Assignees */}
                    {task.assignee_emails && task.assignee_emails.length > 0 && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <div className="flex flex-wrap gap-1">
                          {task.assignee_emails.map((email, idx) => (
                            <span key={idx} className="assignee-badge">
                              {email.split('@')[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Due Date */}
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-sm">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className={new Date(task.due_date) < new Date() ? 'text-rose-600 dark:text-rose-400 font-medium' : 'text-slate-600 dark:text-slate-400'}>
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {/* Team Name */}
                    {task.team_name && (
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>{task.team_name}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingTask(task)}
                      className="text-indigo-600 dark:text-indigo-400 text-sm hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-rose-600 dark:text-rose-400 text-sm hover:text-rose-700 dark:hover:text-rose-300 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editingTask && selectedTeam && (
        <EditTaskModal
          task={editingTask}
          team={selectedTeam}
          onClose={() => setEditingTask(null)}
          onTaskUpdated={onTaskUpdated}
        />
      )}
    </>
  );
}

export default TaskList;