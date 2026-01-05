import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { connectionService } from '../services/connectionService';
import { toast } from 'react-toastify';
import { FaUserFriends, FaUserClock, FaSearch, FaTrash, FaCheck, FaTimes, FaEnvelope } from 'react-icons/fa';
import { getAvatarUrl ,handleImageError} from '../utils/profilePictureUtils';

const Connections = () => {
  const [activeTab, setActiveTab] = useState('connections');
  const [connections, setConnections] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'connections') {
        const response = await connectionService.getMyConnections();
        setConnections(response.data.connections);
      } else {
        const response = await connectionService.getPendingRequests();
        setPendingRequests(response.data.requests);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (connectionId) => {
    if (actionLoading[connectionId]) return;

    try {
      setActionLoading(prev => ({ ...prev, [connectionId]: true }));
      await connectionService.acceptConnection(connectionId);
      toast.success('Connection accepted!');
      
      // Remove from pending list
      setPendingRequests(prev => prev.filter(req => req.connection_id !== connectionId));
      
      // Refresh data
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept connection');
    } finally {
      setActionLoading(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleReject = async (connectionId) => {
    if (actionLoading[connectionId]) return;

    if (!window.confirm('Are you sure you want to reject this connection request?')) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [connectionId]: true }));
      await connectionService.rejectConnection(connectionId);
      toast.success('Connection request rejected');
      
      // Remove from pending list
      setPendingRequests(prev => prev.filter(req => req.connection_id !== connectionId));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject connection');
    } finally {
      setActionLoading(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const handleRemove = async (connectionId) => {
    if (actionLoading[connectionId]) return;

    if (!window.confirm('Are you sure you want to remove this connection?')) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [connectionId]: true }));
      await connectionService.removeConnection(connectionId);
      toast.success('Connection removed');
      
      // Remove from connections list
      setConnections(prev => prev.filter(conn => conn.connection_id !== connectionId));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove connection');
    } finally {
      setActionLoading(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  const filteredConnections = connections.filter(conn =>
    `${conn.first_name} ${conn.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (conn.company_name && conn.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (conn.position && conn.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Network</h1>
        <p className="text-gray-600 mt-1">Manage your connections and requests</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('connections')}
              className={`flex items-center px-6 py-4 font-medium ${
                activeTab === 'connections'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaUserFriends className="mr-2" />
              My Connections ({connections.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center px-6 py-4 font-medium ${
                activeTab === 'pending'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaUserClock className="mr-2" />
              Pending Requests ({pendingRequests.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'connections' && (
            <>
              {/* Search */}
              <div className="mb-6 relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search connections by name, company, or position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredConnections.length === 0 ? (
                <div className="text-center py-12">
                  <FaUserFriends className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'No connections found matching your search' : 'No connections yet'}
                  </p>
                  {!searchTerm && (
                    <Link
                      to="/alumni"
                      className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Find Alumni to Connect
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredConnections.map((conn) => (
                    <div key={conn.connection_user_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 mb-3">
                        <Link to={`/profile/${conn.connection_user_id}`}>
  <img
  src={getAvatarUrl(conn)}  // ✅ Pass the entire conn object
  alt={conn.first_name}
  className="w-12 h-12 rounded-full object-cover"
  onError={(e) => handleImageError(e, conn.first_name, conn.last_name)}
/>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/profile/${conn.connection_user_id}`}
                            className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                          >
                            {conn.first_name} {conn.last_name}
                          </Link>
                          {conn.position && conn.company_name && (
                            <p className="text-sm text-gray-600 truncate">
                              {conn.position} at {conn.company_name}
                            </p>
                          )}
                          {conn.current_city && (
                            <p className="text-xs text-gray-400 truncate">{conn.current_city}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          to="/messages"
                          state={{ selectedUserId: conn.connection_user_id }}
                          className="flex-1 flex items-center justify-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          <FaEnvelope className="mr-1" />
                          Message
                        </Link>
                        <button
                          onClick={() => handleRemove(conn.connection_id)}
                          disabled={actionLoading[conn.connection_id]}
                          className="px-3 py-1.5 text-sm bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                          title="Remove connection"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'pending' && (
            <>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <FaUserClock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request.connection_id} className="border rounded-lg p-4 flex items-center justify-between hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-4 flex-1">
                        <Link to={`/profile/${request.connection_user_id}`}>
<img
  src={getAvatarUrl(request)}  // ✅ Pass the entire request object
  alt={`${request.first_name} ${request.last_name}`}
  className="w-12 h-12 rounded-full object-cover"
  onError={(e) => handleImageError(e, request.first_name, request.last_name)}
/>

                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/profile/${request.connection_user_id}`}
                            className="font-medium text-gray-900 hover:text-blue-600"
                          >
                            {request.first_name} {request.last_name}
                          </Link>
                          {request.position && request.company_name && (
                            <p className="text-sm text-gray-600">
                              {request.position} at {request.company_name}
                            </p>
                          )}
                          {request.school_name && (
                            <p className="text-xs text-gray-500">
                              {request.school_name} '{request.end_year}
                            </p>
                          )}
                          {request.current_city && (
                            <p className="text-xs text-gray-400">{request.current_city}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Sent {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleAccept(request.connection_id)}
                          disabled={actionLoading[request.connection_id]}
                          className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          <FaCheck className="mr-1" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(request.connection_id)}
                          disabled={actionLoading[request.connection_id]}
                          className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          <FaTimes className="mr-1" />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Connections;