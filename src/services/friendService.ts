import api from './authService';

export const friendService = {
  async sendFriendRequest(userId: string, message?: string) {
    const response = await api.post('/friends/request', { userId, message });
    return response.data;
  },

  async respondToRequest(requestId: string, action: 'accepted' | 'rejected') {
    const response = await api.patch(`/friends/request/${requestId}`, { action });
    return response.data;
  },

  async getFriendRequests() {
    const response = await api.get('/friends/requests');
    return response.data;
  },

  async getFriends() {
    const response = await api.get('/friends');
    return response.data;
  },

  async unfriend(userId: string) {
    const response = await api.delete(`/friends/${userId}`);
    return response.data;
  },
};
