import api from './authService';

export const conversationService = {
  // Private & Group Creation
  async createPrivateConversation(userId: string) {
    const response = await api.post('/conversations/private', { userId });
    return response.data;
  },

  async createGroupConversation(name: string, groupIds: string[]) {
    const response = await api.post('/conversations/group', { name, groupIds });
    return response.data;
  },

  // Conversation Information
  async getConversationInfo(id: string) {
    const response = await api.get(`/conversations/${id}/info`);
    return response.data;
  },

  async getInfoMedia(id: string) {
    const response = await api.get(`/conversations/${id}/info/media`);
    return response.data;
  },

  async getInfoFile(id: string) {
    const response = await api.get(`/conversations/${id}/info/file`);
    return response.data;
  },

  async getInfoLinkPreview(id: string) {
    const response = await api.get(`/conversations/${id}/info/link-preview`);
    return response.data;
  },

  // List & Search
  async getConversations(archived: boolean = false) {
    const response = await api.get(`/conversations?archived=${archived}`);
    return response.data;
  },

  async listUsers() {
    const response = await api.get('/conversations/list-user');
    return response.data;
  },

  // Member Management
  async addMembers(id: string, userIds: string[], description?: string) {
    const response = await api.patch(`/conversations/${id}/members/add`, { userIds, description });
    return response.data;
  },

  async removeMembers(id: string, userIds: string[]) {
    const response = await api.delete(`/conversations/${id}/members/remove`, {
      data: { userIds }
    });
    return response.data;
  },

  async changeRole(roomId: string, targetUserId: string, role: string) {
    const response = await api.patch(`/conversations/${roomId}/members/role`, { id: targetUserId, role });
    return response.data;
  },

  async leaveGroup(id: string, name: any, p0: string) {
    const response = await api.delete(`/conversations/${id}/members/leave`);
    return response.data;
  },

  async disbandGroup(id: string, p0: string) {
    const response = await api.delete(`/conversations/${id}/disband`);
    return response.data;
  },

  // Join Requests
  async listJoinRequests(id: string) {
    const response = await api.get(`/conversations/${id}/requests`);
    return response.data;
  },

  async handleJoinRequest(roomId: string, requestId: string, action: 'accepted' | 'rejected') {
    const response = await api.patch(`/conversations/${roomId}/request/handle`, { id: requestId, action });
    return response.data;
  },

  // Announcements & Pins
  async createAnnouncement(id: string, content: string) {
    const response = await api.post(`/conversations/${id}/announcement`, { content });
    return response.data;
  },

  async getAnnouncements(id: string) {
    const response = await api.get(`/conversations/${id}/announcements`);
    return response.data;
  },

  async getPins(id: string) {
    const response = await api.get(`/conversations/${id}/pins`);
    return response.data;
  },

  // Actions (Archive, Mute, Remove)
  async removeConversation(id: string) {
    const response = await api.delete(`/conversations/${id}/remove`);
    return response.data;
  },

  async archiveConversation(id: string) {
    const response = await api.post(`/conversations/${id}/archive`);
    return response.data;
  },

  async unarchiveConversation(id: string) {
    const response = await api.delete(`/conversations/${id}/archive`);
    return response.data;
  },

  async muteConversation(id: string, duration: number) {
    const response = await api.post(`/conversations/${id}/mute`, { duration });
    return response.data;
  },

  async unmuteConversation(id: string) {
    const response = await api.delete(`/conversations/${id}/mute`);
    return response.data;
  },
};
