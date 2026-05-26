import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../context/DarkModeContext';
import api from '../api/axios';
import TeamList from '../components/TeamList';
import TaskList from '../components/TaskList';
import CreateTeamModal from '../components/CreateTeamModal';
import CreateTaskModal from '../components/CreateTaskModal';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [reminders, setReminders] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [teamMembers, setTeamMembers] = useState({});
  const { darkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(userData));
    fetchTeams();
    fetchReminders(); // Only called once on login
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchTasks(selectedTeam.id, filterAssignee || null);
      fetchTeamMembers(selectedTeam.id);
    } else {
      fetchTasks(null, filterAssignee || null);
    }
  }, [selectedTeam, filterAssignee]);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      setTeams(response.data);
      if (response.data.length > 0 && !selectedTeam) {
        setSelectedTeam(response.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

  const fetchTasks = async (teamId = null, assigneeId = null) => {
    try {
      let url = teamId ? `/tasks?teamId=${teamId}` : '/tasks';
      if (assigneeId) {
        url += `${teamId ? '&' : '?'}assigneeId=${assigneeId}`;
      }
      const response = await api.get(url);
      setTasks(response.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  };

  const fetchReminders = async () => {
    try {
      const response = await api.get('/tasks/reminders/due-soon');
      setReminders(response.data);
    } catch (err) {
      console.error('Failed to fetch reminders', err);
    }
  };

  const fetchTeamMembers = async (teamId) => {
    if (teamMembers[teamId]) return;
    try {
      const response = await api.get(`/teams/${teamId}`);
      setTeamMembers(prev => ({ ...prev, [teamId]: response.data.members || [] }));
    } catch (err) {
      console.error('Failed to fetch team members', err);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('user');
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleTeamCreated = (newTeam) => {
    setTeams([...teams, newTeam]);
    setSelectedTeam(newTeam);
    setShowTeamModal(false);
  };

  const handleTaskCreated = () => {
    fetchTasks(selectedTeam?.id, filterAssignee || null);
    setShowTaskModal(false);
    // REMOVED: fetchReminders() - reminders only on login
  };

  const handleClearFilter = () => {
    setFilterAssignee('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold gradient-text">Team Task Manager</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200"
            >
              {darkMode ? (
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
              <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Reminders Banner - Only shows on login, not on task create */}
      {reminders && reminders.reminders && reminders.reminders.length > 0 && (
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center gap-3 text-amber-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-semibold">{reminders.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Teams Column */}
          <div className="w-full lg:w-1/3">
            <div className="card card-hover">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">My Teams</h2>
                  <button
                    onClick={() => setShowTeamModal(true)}
                    className="btn-primary px-4 py-1.5 text-sm"
                  >
                    + New Team
                  </button>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                  {teams.length} team{teams.length !== 1 ? 's' : ''} total
                </p>
              </div>
              <div className="p-3">
                <TeamList
                  teams={teams}
                  selectedTeam={selectedTeam}
                  onSelectTeam={setSelectedTeam}
                  onTeamDeleted={fetchTeams}
                />
              </div>
            </div>
          </div>

          {/* Tasks Column */}
          <div className="w-full lg:w-2/3">
            <div className="card card-hover">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                      Tasks {selectedTeam ? `in ${selectedTeam.name}` : 'Overview'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      {tasks.length} task{tasks.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={filterAssignee}
                      onChange={(e) => setFilterAssignee(e.target.value)}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm 
                                 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                                 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">All Assignees</option>
                      {selectedTeam && teamMembers[selectedTeam.id]?.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.email}
                        </option>
                      ))}
                    </select>
                    
                    {filterAssignee && (
                      <button
                        onClick={handleClearFilter}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                      >
                        Clear Filter
                      </button>
                    )}
                    
                    {selectedTeam && (
                      <button
                        onClick={() => setShowTaskModal(true)}
                        className="btn-success px-4 py-2 text-sm"
                      >
                        + New Task
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-5">
                <TaskList
                  tasks={tasks}
                  teams={teams}
                  onTaskUpdated={() => fetchTasks(selectedTeam?.id, filterAssignee || null)}
                  selectedTeam={selectedTeam}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showTeamModal && (
        <CreateTeamModal
          onClose={() => setShowTeamModal(false)}
          onTeamCreated={handleTeamCreated}
        />
      )}
      {showTaskModal && selectedTeam && (
        <CreateTaskModal
          team={selectedTeam}
          teams={teams}
          onClose={() => setShowTaskModal(false)}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </div>
  );
}

export default Dashboard;