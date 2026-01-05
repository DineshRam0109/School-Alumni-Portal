import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaUserTie,
  FaSearch,
  FaHandshake,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaStar,
  FaComments,
  FaCalendarAlt,
  FaVideo,
  FaTrophy,
  FaPlus,
  FaTimes,
  FaUsers,
  FaTrash
} from 'react-icons/fa';
import api from '../services/api';
import mentorshipService from '../services/mentorshipService';
import { getAvatarUrl, handleImageError } from '../utils/profilePictureUtils';

const Mentorship = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('find-mentors');
  const [mentorshipSubTab, setMentorshipSubTab] = useState('overview');
  const [mentors, setMentors] = useState([]);
  const [myMentorships, setMyMentorships] = useState([]);
  const [myMentees, setMyMentees] = useState([]);
  const [currentSessions, setCurrentSessions] = useState([]);
  const [currentGoals, setCurrentGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMentorship, setSelectedMentorship] = useState(null);
  const [filters, setFilters] = useState({ search: '' });
  
  // Modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  
  // Session form
  const [sessionForm, setSessionForm] = useState({
    title: '',
    description: '',
    scheduled_date: '',
    duration_minutes: 60,
    meeting_link: ''
  });
  
  // Goal form
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    target_date: ''
  });

  // Calculate counts
  const activeMentorshipsCount = myMentorships.filter(m => m.status === 'active').length;
  const activeMenteesCount = myMentees.filter(m => m.status === 'active').length;
  const pendingRequestsCount = myMentees.filter(m => m.status === 'requested').length;
  const totalMentorshipsCount = myMentorships.length;

  // Load data when tab changes
  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  // Load mentorship data when selected
  useEffect(() => {
    if (selectedMentorship?.mentorship_id && selectedMentorship.status === 'active') {
      loadMentorshipData(selectedMentorship.mentorship_id);
    }
  }, [selectedMentorship?.mentorship_id]);

  const loadTabData = useCallback(async () => {
    try {
      if (activeTab === 'find-mentors') {
        await fetchAvailableMentors();
      } else if (activeTab === 'my-mentors') {
        const result = await mentorshipService.getMentorshipsAsMentee();
        const mentorships = result.mentorships || [];
        setMyMentorships(mentorships);
        const activeMentorship = mentorships.find(m => m.status === 'active');
        if (activeMentorship) {
          setSelectedMentorship(activeMentorship);
        } else if (mentorships.length > 0) {
          setSelectedMentorship(mentorships[0]);
        } else {
          setSelectedMentorship(null);
        }
      } else if (activeTab === 'my-mentees') {
        const result = await mentorshipService.getMentorshipsAsMentor();
        const mentorships = result.mentorships || [];
        setMyMentees(mentorships);
        const activeMentorship = mentorships.find(m => m.status === 'active');
        if (activeMentorship) {
          setSelectedMentorship(activeMentorship);
        } else if (mentorships.length > 0) {
          setSelectedMentorship(mentorships[0]);
        } else {
          setSelectedMentorship(null);
        }
      } else if (activeTab === 'mentee-requests') {
        const result = await mentorshipService.getMentorshipsAsMentor();
        setMyMentees(result.mentorships || []);
      }
    } catch (error) {
      console.error('Error loading tab data:', error);
      toast.error('Failed to load data');
    }
  }, [activeTab]);

  const loadMentorshipData = useCallback(async (mentorshipId) => {
    setDataLoading(true);
    try {
      const [sessionsResult, goalsResult] = await Promise.all([
        mentorshipService.getMentorshipSessions(mentorshipId),
        mentorshipService.getMentorshipGoals(mentorshipId)
      ]);
      setCurrentSessions(sessionsResult.sessions || []);
      setCurrentGoals(goalsResult.goals || []);
    } catch (error) {
      console.error('Error loading mentorship data:', error);
      toast.error('Failed to load mentorship details');
    } finally {
      setDataLoading(false);
    }
  }, []);

  const fetchAvailableMentors = async () => {
    setSearchLoading(true);
    try {
      const response = await api.get('/search/alumni', {
        params: { search: filters.search, limit: 50 }
      });
      const filteredMentors = (response.data.alumni || []).filter(
        mentor => mentor.user_id !== user.user_id
      );
      setMentors(filteredMentors);
    } catch (error) {
      console.error('Error fetching mentors:', error);
      toast.error('Failed to load mentors');
      setMentors([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRequestMentorship = async () => {
    if (!requestMessage.trim()) {
      toast.error('Please provide details about what guidance you need');
      return;
    }

    setLoading(true);
    try {
      await mentorshipService.requestMentorship(selectedMentor.user_id, requestMessage);
      toast.success('Mentorship request sent successfully!');
      setShowRequestModal(false);
      setSelectedMentor(null);
      setRequestMessage('');
      if (activeTab === 'find-mentors') {
        fetchAvailableMentors();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSession = async () => {
    const trimmedTitle = sessionForm.title?.trim();
    const trimmedMeetingLink = sessionForm.meeting_link?.trim();
    
    if (!trimmedTitle) {
      toast.error('Please enter a session title');
      return;
    }
    
    if (!sessionForm.scheduled_date) {
      toast.error('Please select a date and time');
      return;
    }
    
    const selectedDate = new Date(sessionForm.scheduled_date);
    if (selectedDate < new Date()) {
      toast.error('Please select a future date and time');
      return;
    }

    setLoading(true);
    try {
      await mentorshipService.scheduleSession(selectedMentorship.mentorship_id, {
        title: trimmedTitle,
        description: sessionForm.description?.trim() || '',
        scheduled_date: sessionForm.scheduled_date,
        duration_minutes: parseInt(sessionForm.duration_minutes) || 60,
        meeting_link: trimmedMeetingLink || ''
      });
      
      toast.success('Session scheduled successfully!');
      setShowSessionModal(false);
      setSessionForm({
        title: '',
        description: '',
        scheduled_date: '',
        duration_minutes: 60,
        meeting_link: ''
      });
      
      await loadMentorshipData(selectedMentorship.mentorship_id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to schedule session');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!goalForm.title?.trim()) {
      toast.error('Please provide a goal title');
      return;
    }

    setLoading(true);
    try {
      await mentorshipService.createGoal(selectedMentorship.mentorship_id, {
        title: goalForm.title.trim(),
        description: goalForm.description?.trim() || '',
        target_date: goalForm.target_date || null
      });
      
      toast.success('Goal created successfully!');
      setShowGoalModal(false);
      setGoalForm({
        title: '',
        description: '',
        target_date: ''
      });
      
      await loadMentorshipData(selectedMentorship.mentorship_id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  const handleMentorshipClick = (mentorship) => {
    setSelectedMentorship(mentorship);
    setMentorshipSubTab('overview');
  };

  const handleUpdateGoalProgress = async (goalId, progress) => {
    setLoading(true);
    try {
      await mentorshipService.updateGoalProgress(goalId, progress);
      toast.success('Goal progress updated');
      await loadMentorshipData(selectedMentorship.mentorship_id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update progress');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async (sessionId) => {
    setLoading(true);
    try {
      await mentorshipService.completeSession(sessionId);
      toast.success('Session marked as completed');
      await loadMentorshipData(selectedMentorship.mentorship_id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete session');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) {
      return;
    }

    setLoading(true);
    try {
      await mentorshipService.deleteSession(sessionId);
      toast.success('Session deleted successfully');
      await loadMentorshipData(selectedMentorship.mentorship_id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete session');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) {
      return;
    }

    setLoading(true);
    try {
      await mentorshipService.deleteGoal(goalId);
      toast.success('Goal deleted successfully');
      await loadMentorshipData(selectedMentorship.mentorship_id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete goal');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (mentorshipId) => {
    setLoading(true);
    try {
      await mentorshipService.acceptMentorship(mentorshipId);
      toast.success('Mentorship request accepted!');
      await loadTabData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (mentorshipId) => {
    if (!window.confirm('Are you sure you want to decline this mentorship request?')) {
      return;
    }
    
    setLoading(true);
    try {
      await mentorshipService.rejectMentorship(mentorshipId);
      toast.info('Mentorship request declined');
      await loadTabData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMentorship = async (mentorshipId) => {
    if (!window.confirm('Are you sure you want to mark this mentorship as completed?')) {
      return;
    }
    
    setLoading(true);
    try {
      await mentorshipService.completeMentorship(mentorshipId);
      toast.success('Mentorship marked as completed');
      await loadTabData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete mentorship');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMessages = (mentorship) => {
    const otherUserId = mentorship.mentor_id === user.user_id 
      ? mentorship.mentee_id 
      : mentorship.mentor_id;
    
    const otherUserName = `${mentorship.first_name} ${mentorship.last_name}`;
    
    navigate('/messages', { 
      state: { 
        selectedUserId: otherUserId,
        userName: otherUserName
      } 
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      requested: { color: 'bg-yellow-100 text-yellow-800', icon: FaClock, text: 'Pending' },
      active: { color: 'bg-green-100 text-green-800', icon: FaCheckCircle, text: 'Active' },
      completed: { color: 'bg-blue-100 text-blue-800', icon: FaStar, text: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: FaTimesCircle, text: 'Cancelled' }
    };
    const badge = badges[status] || badges.requested;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="mr-1" />
        {badge.text}
      </span>
    );
  };

  const renderMentorshipDetails = () => {
    if (!selectedMentorship) {
      return (
        <div className="text-center py-12">
          <FaHandshake className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <p className="text-gray-500">Select a mentorship to view details</p>
        </div>
      );
    }

    const isMyMentor = activeTab === 'my-mentors';
    const otherPerson = isMyMentor ? 'Mentor' : 'Mentee';

    return (
      <div className="space-y-4">
        <div className="flex gap-2 border-b">
          {[
            { id: 'overview', label: 'Overview', icon: FaHandshake },
            { id: 'sessions', label: 'Sessions', icon: FaCalendarAlt },
            { id: 'goals', label: 'Goals', icon: FaTrophy }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setMentorshipSubTab(tab.id)}
                className={`flex items-center px-4 py-2 font-medium transition-colors ${
                  mentorshipSubTab === tab.id
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {mentorshipSubTab === 'overview' && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Mentorship Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">{otherPerson}</p>
                <p className="font-medium">{selectedMentorship.first_name} {selectedMentorship.last_name}</p>
                {selectedMentorship.position && (
                  <p className="text-sm text-gray-600">{selectedMentorship.position}</p>
                )}
                {selectedMentorship.company_name && (
                  <p className="text-sm text-gray-600">{selectedMentorship.company_name}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Area of Guidance</p>
                <p>{selectedMentorship.area_of_guidance}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                {getStatusBadge(selectedMentorship.status)}
              </div>
              {selectedMentorship.start_date && (
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p>{new Date(selectedMentorship.start_date).toLocaleDateString()}</p>
                </div>
              )}
              {selectedMentorship.end_date && (
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p>{new Date(selectedMentorship.end_date).toLocaleDateString()}</p>
                </div>
              )}
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => handleOpenMessages(selectedMentorship)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  <FaComments className="mr-2" />
                  Message {otherPerson}
                </button>
                {selectedMentorship.status === 'active' && (
                  <button
                    onClick={() => handleCompleteMentorship(selectedMentorship.mentorship_id)}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm disabled:opacity-50"
                  >
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {mentorshipSubTab === 'sessions' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Sessions</h3>
              {selectedMentorship.status === 'active' && (
                <button
                  onClick={() => setShowSessionModal(true)}
                  disabled={dataLoading || loading}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <FaPlus className="mr-2" />
                  Schedule Session
                </button>
              )}
            </div>
            
            {dataLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : currentSessions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FaCalendarAlt className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500 mb-2">No sessions scheduled yet</p>
                {selectedMentorship.status === 'active' && (
                  <button
                    onClick={() => setShowSessionModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Schedule your first session
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {currentSessions.map(session => (
                  <div key={session.session_id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{session.session_title}</h4>
                        {session.session_description && (
                          <p className="text-sm text-gray-600 mt-1">{session.session_description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                          session.status === 'completed' ? 'bg-green-100 text-green-800' :
                          session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {session.status}
                        </span>
                        {session.created_by === user.user_id && session.status !== 'completed' && (
                          <button
                            onClick={() => handleDeleteSession(session.session_id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700 disabled:opacity-50"
                            title="Delete session"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                      <span className="flex items-center">
                        <FaCalendarAlt className="mr-1" />
                        {new Date(session.scheduled_date).toLocaleString()}
                      </span>
                      <span>{session.duration_minutes} mins</span>
                    </div>
                    {session.meeting_link && (
                      <a
                        href={session.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-700 mt-2 text-sm"
                      >
                        <FaVideo className="mr-2" />
                        Join Meeting
                      </a>
                    )}
                    {session.status === 'scheduled' && (
                      <button
                        onClick={() => handleCompleteSession(session.session_id)}
                        disabled={loading}
                        className="mt-2 text-sm text-green-600 hover:text-green-700 disabled:opacity-50"
                      >
                        Mark as Completed
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mentorshipSubTab === 'goals' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Goals</h3>
              {selectedMentorship.status === 'active' && (
                <button
                  onClick={() => setShowGoalModal(true)}
                  disabled={dataLoading || loading}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <FaPlus className="mr-2" />
                  Add Goal
                </button>
              )}
            </div>
            
            {dataLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : currentGoals.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FaTrophy className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-gray-500 mb-2">No goals set yet</p>
                {selectedMentorship.status === 'active' && (
                  <button
                    onClick={() => setShowGoalModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Set your first goal
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {currentGoals.map(goal => (
                  <div key={goal.goal_id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold">{goal.goal_title}</h4>
                        {goal.goal_description && (
                          <p className="text-sm text-gray-600 mt-1">{goal.goal_description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                          goal.status === 'completed' ? 'bg-green-100 text-green-800' :
                          goal.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {goal.status.replace('_', ' ')}
                        </span>
                        {goal.created_by === user.user_id && goal.status !== 'completed' && (
                          <button
                            onClick={() => handleDeleteGoal(goal.goal_id)}
                            disabled={loading}
                            className="text-red-600 hover:text-red-700 disabled:opacity-50"
                            title="Delete goal"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </div>
                    {goal.target_date && (
                      <p className="text-sm text-gray-500 mb-2">
                        Target: {new Date(goal.target_date).toLocaleDateString()}
                      </p>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{goal.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${goal.progress_percentage}%` }}
                        />
                      </div>
                      {goal.status !== 'completed' && selectedMentorship.status === 'active' && (
                        <div className="flex gap-2 mt-2">
                          {[25, 50, 75, 100].map(progress => (
                            <button
                              key={progress}
                              onClick={() => handleUpdateGoalProgress(goal.goal_id, progress)}
                              disabled={loading}
                              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                            >
                              {progress}%
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Mentorship Program</h1>
        <p className="text-blue-100">
          Connect with experienced alumni for career guidance, skill development, and professional growth
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex flex-wrap">
            <button
              onClick={() => setActiveTab('find-mentors')}
              className={`flex items-center px-6 py-4 font-medium transition-colors ${
                activeTab === 'find-mentors'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaSearch className="mr-2" />
              Find Mentors
            </button>
            <button
              onClick={() => setActiveTab('my-mentors')}
              className={`flex items-center px-6 py-4 font-medium transition-colors ${
                activeTab === 'my-mentors'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaHandshake className="mr-2" />
              My Mentors
              {totalMentorshipsCount > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                  {totalMentorshipsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('my-mentees')}
              className={`flex items-center px-6 py-4 font-medium transition-colors ${
                activeTab === 'my-mentees'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaUsers className="mr-2" />
              My Mentees
              {activeMenteesCount > 0 && (
                <span className="ml-2 bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                  {activeMenteesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('mentee-requests')}
              className={`flex items-center px-6 py-4 font-medium transition-colors ${
                activeTab === 'mentee-requests'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaUserTie className="mr-2" />
              Mentee Requests
              {pendingRequestsCount > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-600 px-2 py-1 rounded-full text-xs">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {loading && activeTab !== 'find-mentors' ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {activeTab === 'find-mentors' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Search by name, expertise, or company..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && fetchAvailableMentors()}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={fetchAvailableMentors}
                        disabled={searchLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                      >
                        <FaSearch className="mr-2" />
                        {searchLoading ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Browse alumni who are available to mentor in your areas of interest
                    </p>
                  </div>

                  {searchLoading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                  ) : mentors.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <FaSearch className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                      <p className="text-gray-500">No mentors found. Try adjusting your search criteria.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {mentors.map(mentor => (
                        <div key={mentor.user_id} className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow">
                          <div className="flex items-start mb-4">
                            <div className="flex-shrink-0">
                              {mentor.profile_picture ? (
                                <img
                                  src={getAvatarUrl(mentor)}
                                  alt={`${mentor.first_name} ${mentor.last_name}`}
                                  className="w-16 h-16 rounded-full object-cover"
                                  onError={(e) => handleImageError(e, mentor.first_name, mentor.last_name)}
                                />
                              ) : (
                                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                                  {`${mentor.first_name?.[0]}${mentor.last_name?.[0]}`}
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <h3 
                                className="font-semibold text-lg text-blue-600 hover:text-blue-700 cursor-pointer"
                                onClick={() => navigate(`/profile/${mentor.user_id}`)}
                              >
                                {mentor.first_name} {mentor.last_name}
                              </h3>
                              <p className="text-gray-600">{mentor.position || 'Alumni'}</p>
                              <p className="text-sm text-gray-500">{mentor.company_name || ''}</p>
                            </div>
                          </div>
                          
                          {mentor.bio && (
                            <p className="text-gray-700 mb-4 text-sm line-clamp-3">{mentor.bio}</p>
                          )}
                          
                          <div className="mb-4">
                            <h4 className="font-medium text-sm text-gray-500 mb-2">Expertise Areas</h4>
                            <div className="flex flex-wrap gap-2">
                              {mentor.expertise_areas ? (
                                JSON.parse(mentor.expertise_areas).map((expertise, index) => (
                                  <span key={index} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                                    {expertise}
                                  </span>
                                ))
                              ) : (
                                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                  General Guidance
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center pt-4 border-t">
                            <div className="text-sm text-gray-500">
                              {mentor.current_city && (
                                <span className="flex items-center">
                                  📍 {mentor.current_city}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedMentor(mentor);
                                setShowRequestModal(true);
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                            >
                              Request Mentorship
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'my-mentors' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold mb-2">My Mentors</h3>
                      <p className="text-sm text-gray-600">
                        Mentors you're currently learning from
                      </p>
                    </div>
                    
                    {myMentorships.length === 0 ? (
                      <div className="text-center py-8 bg-white border rounded-lg">
                        <FaHandshake className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-2">You don't have any mentors yet</p>
                        <button
                          onClick={() => setActiveTab('find-mentors')}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Find a mentor
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {myMentorships.map(mentorship => (
                          <button
                            key={mentorship.mentorship_id}
                            onClick={() => handleMentorshipClick(mentorship)}
                            className={`w-full text-left p-4 rounded-lg border transition-colors ${
                              selectedMentorship?.mentorship_id === mentorship.mentorship_id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start mb-2">
                              {mentorship.profile_picture ? (
                                <img
                                  src={mentorship.profile_picture}
                                  alt={`${mentorship.first_name} ${mentorship.last_name}`}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 mr-3"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    const initialsDiv = e.target.nextElementSibling;
                                    if (initialsDiv) initialsDiv.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold flex-shrink-0 mr-3"
                                style={{ display: mentorship.profile_picture ? 'none' : 'flex' }}
                              >
                                {mentorship.first_name?.[0]}{mentorship.last_name?.[0]}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold">{mentorship.first_name} {mentorship.last_name}</h4>
                                <p className="text-sm text-gray-600 truncate">{mentorship.area_of_guidance}</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              {getStatusBadge(mentorship.status)}
                              <span className="text-xs text-gray-500">
                                {new Date(mentorship.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2">
                    <div className="bg-white border rounded-lg p-6">
                      {renderMentorshipDetails()}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'my-mentees' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h3 className="font-semibold mb-2">My Mentees</h3>
                      <p className="text-sm text-gray-600">
                        People you're currently mentoring
                      </p>
                    </div>
                    
                    {myMentees.filter(m => m.status === 'active' || m.status === 'completed').length === 0 ? (
                      <div className="text-center py-8 bg-white border rounded-lg">
                        <FaUsers className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-2">You don't have any mentees yet</p>
                        <p className="text-sm text-gray-400">Check "Mentee Requests" for pending requests</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {myMentees
                          .filter(m => m.status === 'active' || m.status === 'completed')
                          .map(mentorship => (
                            <button
                              key={mentorship.mentorship_id}
                              onClick={() => handleMentorshipClick(mentorship)}
                              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                                selectedMentorship?.mentorship_id === mentorship.mentorship_id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start mb-2">
                                {mentorship.profile_picture ? (
                                  <img
                                    src={mentorship.profile_picture}
                                    alt={`${mentorship.first_name} ${mentorship.last_name}`}
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 mr-3"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.style.display = 'none';
                                      const initialsDiv = e.target.nextElementSibling;
                                      if (initialsDiv) initialsDiv.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div 
                                  className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold flex-shrink-0 mr-3"
                                  style={{ display: mentorship.profile_picture ? 'none' : 'flex' }}
                                >
                                  {mentorship.first_name?.[0]}{mentorship.last_name?.[0]}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold">{mentorship.first_name} {mentorship.last_name}</h4>
                                  <p className="text-sm text-gray-600 truncate">{mentorship.area_of_guidance}</p>
                                </div>
                              </div>
                              <div className="flex justify-between items-center mt-2">
                                {getStatusBadge(mentorship.status)}
                                <span className="text-xs text-gray-500">
                                  {mentorship.start_date ? `Started ${new Date(mentorship.start_date).toLocaleDateString()}` : new Date(mentorship.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2">
                    <div className="bg-white border rounded-lg p-6">
                      {renderMentorshipDetails()}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'mentee-requests' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Pending Mentorship Requests</h3>
                    <p className="text-sm text-gray-600">
                      Review and respond to mentorship requests from other alumni
                    </p>
                  </div>
                  
                  {myMentees.filter(r => r.status === 'requested').length === 0 ? (
                    <div className="text-center py-12 bg-white border rounded-lg">
                      <FaUserTie className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                      <p className="text-gray-500 mb-2">No pending mentorship requests</p>
                      <p className="text-sm text-gray-400">When someone requests you as a mentor, it will appear here</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {myMentees
                        .filter(r => r.status === 'requested')
                        .map(request => (
                          <div key={request.mentorship_id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start mb-4">
                              {request.profile_picture ? (
                                <img
                                  src={request.profile_picture}
                                  alt={`${request.first_name} ${request.last_name}`}
                                  className="h-16 w-16 rounded-full object-cover flex-shrink-0"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    const initialsDiv = e.target.nextElementSibling;
                                    if (initialsDiv) initialsDiv.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div 
                                className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 text-2xl font-bold flex-shrink-0"
                                style={{ display: request.profile_picture ? 'none' : 'flex' }}
                              >
                                {request.first_name?.[0]}{request.last_name?.[0]}
                              </div>
                              <div className="ml-4 flex-1">
                                <h3 className="font-semibold text-lg">{request.first_name} {request.last_name}</h3>
                                <p className="text-gray-600">{request.position || 'Alumni'}</p>
                                <p className="text-sm text-gray-500">{request.company_name || ''}</p>
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <h4 className="font-medium text-sm text-gray-500 mb-1">Request Details</h4>
                              <p className="text-gray-800">{request.area_of_guidance}</p>
                            </div>
                            
                            <div className="mb-4">
                              <h4 className="font-medium text-sm text-gray-500 mb-1">Requested On</h4>
                              <p className="text-gray-800">
                                {new Date(request.created_at).toLocaleDateString()} at{' '}
                                {new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            
                            {request.bio && (
                              <div className="mb-4">
                                <h4 className="font-medium text-sm text-gray-500 mb-1">About</h4>
                                <p className="text-gray-700 text-sm">{request.bio}</p>
                              </div>
                            )}
                            
                            <div className="flex gap-3 pt-4 border-t">
                              <button
                                onClick={() => handleAcceptRequest(request.mentorship_id)}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                              >
                                <FaCheckCircle className="mr-2" />
                                Accept Request
                              </button>
                              <button
                                onClick={() => handleRejectRequest(request.mentorship_id)}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
                              >
                                <FaTimes className="mr-2" />
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals remain the same - Request Modal, Session Modal, Goal Modal */}
      {showRequestModal && selectedMentor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Request Mentorship</h3>
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setSelectedMentor(null);
                    setRequestMessage('');
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold mr-3">
                    {selectedMentor.first_name?.[0]}{selectedMentor.last_name?.[0]}
                  </div>
                  <div>
                    <h4 className="font-semibold">{selectedMentor.first_name} {selectedMentor.last_name}</h4>
                    <p className="text-sm text-gray-600">{selectedMentor.position}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  Please describe what guidance you're seeking from {selectedMentor.first_name}
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Title *
                  </label>
                  <input
                    type="text"
                    value={goalForm.title}
                    onChange={(e) => setGoalForm({...goalForm, title: e.target.value})}
                    placeholder="e.g., Complete certification, learn new skill, prepare for interview"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={goalForm.description}
                    onChange={(e) => setGoalForm({...goalForm, description: e.target.value})}
                    placeholder="Details about what you want to achieve..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={goalForm.target_date}
                    onChange={(e) => setGoalForm({...goalForm, target_date: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowGoalModal(false);
                      setGoalForm({
                        title: '',
                        description: '',
                        target_date: ''
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGoal}
                    disabled={loading || !goalForm.title.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Goal'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mentorship;