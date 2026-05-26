import React, { useState } from 'react';
import api from '../api/axios';

function TeamList({ teams, selectedTeam, onSelectTeam, onTeamDeleted }) {
  const [showMembers, setShowMembers] = useState(null);
  const [memberEmail, setMemberEmail] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [teamMembers, setTeamMembers] = useState({});
  const [loadingMembers, setLoadingMembers] = useState({});

  const fetchTeamMembers = async (teamId) => {
    if (teamMembers[teamId]) return;
    
    setLoadingMembers(prev => ({ ...prev, [teamId]: true }));
    try {
      const response = await api.get(`/teams/${teamId}`);
      setTeamMembers(prev => ({ ...prev, [teamId]: response.data.members || [] }));
    } catch (err) {
      console.error('Failed to fetch members', err);
    } finally {
      setLoadingMembers(prev => ({ ...prev, [teamId]: false }));
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (window.confirm('Are you sure? Only team creator can delete this team.')) {
      try {
        await api.delete(`/teams/${teamId}`);
        onTeamDeleted();
        if (selectedTeam?.id === teamId) onSelectTeam(null);
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to delete team');
      }
    }
  };

  const handleAddMember = async (teamId) => {
    if (!memberEmail) return;
    try {
      await api.post(`/teams/${teamId}/members`, { email: memberEmail });
      alert('Member added successfully!');
      setMemberEmail('');
      const response = await api.get(`/teams/${teamId}`);
      setTeamMembers(prev => ({ ...prev, [teamId]: response.data.members || [] }));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add member');
    }
  };

  const handleRemoveMember = async (teamId, userId, userEmail) => {
    if (window.confirm(`Remove ${userEmail} from this team?`)) {
      try {
        await api.delete(`/teams/${teamId}/members/${userId}`);
        alert('Member removed successfully');
        const response = await api.get(`/teams/${teamId}`);
        setTeamMembers(prev => ({ ...prev, [teamId]: response.data.members || [] }));
      } catch (err) {
        alert(err.response?.data?.error || 'Failed to remove member');
      }
    }
  };

  const handleInvite = async (teamId) => {
    if (!inviteEmail) return;
    try {
      const response = await api.post(`/teams/${teamId}/invite`, { email: inviteEmail });
      alert(response.data.message);
      setInviteEmail('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send invite');
    }
  };

  const handleToggleMembers = async (teamId) => {
    if (showMembers === teamId) {
      setShowMembers(null);
    } else {
      setShowMembers(teamId);
      await fetchTeamMembers(teamId);
    }
  };

  return (
    <div className="space-y-2">
      {teams.map((team) => (
        <div key={team.id} className="rounded-lg overflow-hidden">
          <div
            className={`team-card ${selectedTeam?.id === team.id ? 'team-card-selected' : ''}`}
          >
            <div onClick={() => onSelectTeam(team)} className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {team.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {team.is_creator ? '👑 Creator' : 'Member'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button
                onClick={() => handleToggleMembers(team.id)}
                className="text-indigo-600 dark:text-indigo-400 text-sm hover:text-indigo-700 font-medium"
              >
                Members
              </button>
              {team.is_creator && (
                <button
                  onClick={() => handleDeleteTeam(team.id)}
                  className="text-rose-600 dark:text-rose-400 text-sm hover:text-rose-700 font-medium"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
          
          {showMembers === team.id && (
            <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2">Current Members:</p>
              <div className="mb-3 max-h-32 overflow-y-auto space-y-1">
                {loadingMembers[team.id] ? (
                  <p className="text-slate-500 text-xs text-center">Loading...</p>
                ) : teamMembers[team.id] && teamMembers[team.id].length > 0 ? (
                  teamMembers[team.id].map(member => (
                    <div key={member.id} className="flex justify-between items-center text-sm py-1">
                      <span className="text-slate-600 dark:text-slate-400">{member.email}</span>
                      <div className="flex gap-2">
                        {member.is_current_user && (
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">You</span>
                        )}
                        {team.is_creator && !member.is_current_user && (
                          <button 
                            onClick={() => handleRemoveMember(team.id, member.id, member.email)}
                            className="text-rose-500 text-xs hover:text-rose-600"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-xs text-center">No members yet</p>
                )}
              </div>
              
              <p className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2">Add Member</p>
              <div className="flex gap-2 mb-3">
                <input
                  type="email"
                  placeholder="Member email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleAddMember(team.id)}
                  className="btn-primary px-3 py-1.5 text-sm"
                >
                  Add
                </button>
              </div>
              
              <p className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-2">Invite by Email (Stubbed)</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Email to invite"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleInvite(team.id)}
                  className="btn-success px-3 py-1.5 text-sm"
                >
                  Invite
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">* No real email sent (stubbed for assessment)</p>
            </div>
          )}
        </div>
      ))}
      
      {teams.length === 0 && (
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-slate-500 dark:text-slate-400">No teams yet. Create your first team!</p>
        </div>
      )}
    </div>
  );
}

export default TeamList;