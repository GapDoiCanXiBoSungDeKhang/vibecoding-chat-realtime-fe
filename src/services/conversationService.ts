import api from './authService';

export const conversationService = {
  async getConversations(archived: boolean = false) {
    const response = await api.get(`/conversations?archived=${archived}`);
    return response.data;
  },

  async getConversationInfo(id: string) {
    const response = await api.get(`/conversations/${id}/info`);
    return response.data;
  },

  async createPrivateConversation(userId: string) {
    const response = await api.post('/conversations/private', { userId });
    return response.data;
  },

  async createGroupConversation(name: string, groupIds: string[]) {
    const response = await api.post('/conversations/group', { name, groupIds });
    return response.data;
  },

  async listUsers() {
    const response = await api.get('/conversations/list-user');
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
