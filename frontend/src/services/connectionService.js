import api from './api';

export const connectionService = {

  
  // Get my connections with details (for Connections page)
  getMyConnections: () => api.get('/connections'),
  
  // Get connections with school and batch details for group chat
  getConnectionsWithDetails: () => api.get('/connections/with-details'),
  
  // Send connection request
  sendRequest: (userId) => api.post('/connections/send', { receiver_id: userId }),
  
  // Get connection requests (simple version)
  getRequests: () => api.get('/connections/requests'),
  
  // Get pending requests (detailed version)
  getPendingRequests: () => api.get('/connections/pending'),
  
  // Accept connection
  acceptConnection: (connectionId) => api.put(`/connections/${connectionId}/accept`),
  
  // Reject connection
  rejectConnection: (connectionId) => api.put(`/connections/${connectionId}/reject`),
  
  // Respond to connection request (combined accept/reject)
  respondToRequest: (connectionId, status) => 
    api.put(`/connections/${connectionId}/respond`, { status }),
  
  // Get connection status with a user
  getConnectionStatus: (userId) => api.get(`/connections/status/${userId}`),
  
  // Remove connection
  removeConnection: (connectionId) => api.delete(`/connections/${connectionId}`)
};