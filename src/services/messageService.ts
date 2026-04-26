import api from './authService';

export const messageService = {
  // Send a simple text message
  async sendMessage(roomId: string, content: string, replyTo?: string, mentions?: string[]) {
    const response = await api.post(`/messages/${roomId}`, { content, replyTo, mentions });
    return response.data;
  },

  // Get messages for a conversation
  async getMessages(roomId: string, limit?: number, before?: string) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (before) params.append('before', before);
    
    const response = await api.get(`/messages/${roomId}?${params.toString()}`);
    return response.data;
  },

  // Edit a message
  async editMessage(roomId: string, messageId: string, content: string) {
    const response = await api.patch(`/messages/${roomId}`, { id: messageId, content });
    return response.data;
  },

  // Delete a message
  async deleteMessage(roomId: string, messageId: string, scope: 'everyone' | 'self' = 'everyone') {
    const response = await api.delete(`/messages/${roomId}?scope=${scope}`, {
      data: { id: messageId }
    });
    return response.data;
  },

  // Pin a message
  async pinMessage(roomId: string, messageId: string) {
    const response = await api.post(`/messages/${roomId}/pin`, { id: messageId });
    return response.data;
  },

  // Unpin a message
  async unpinMessage(roomId: string, messageId: string) {
    const response = await api.patch(`/messages/${roomId}/unpin`, { id: messageId });
    return response.data;
  },

  // Search messages in a conversation
  async searchMessages(roomId: string, q: string) {
    const response = await api.get(`/messages/${roomId}/search?q=${encodeURIComponent(q)}`);
    return response.data;
  },

  // React to a message
  async reactMessage(roomId: string, messageId: string, emoji: string) {
    const response = await api.post(`/messages/${roomId}/react`, { id: messageId, emoji });
    return response.data;
  },

  // Unreact to a message
  async unreactMessage(roomId: string, messageId: string) {
    const response = await api.patch(`/messages/${roomId}/unreact`, { id: messageId });
    return response.data;
  },

  // Mark conversation as seen
  async markAsSeen(roomId: string) {
    const response = await api.patch(`/messages/${roomId}/seen`);
    return response.data;
  },

  // Forward a message
  async forwardMessage(roomId: string, messageId: string, conversationIds: string[]) {
    const response = await api.post(`/messages/${roomId}/forward`, { id: messageId, conversationIds });
    return response.data;
  },

  // Upload files
  async uploadFiles(roomId: string, files: File[], replyTo?: string) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (replyTo) formData.append('replyTo', replyTo);
    
    const response = await api.post(`/messages/${roomId}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Upload media (images/videos)
  async uploadMedia(roomId: string, files: File[], replyTo?: string) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (replyTo) formData.append('replyTo', replyTo);
    
    const response = await api.post(`/messages/${roomId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Upload voice
  async uploadVoice(roomId: string, file: File, replyTo?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (replyTo) formData.append('replyTo', replyTo);
    
    const response = await api.post(`/messages/${roomId}/voice`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // Link preview message
  async sendLinkPreview(roomId: string, content: string, replyTo?: string) {
    const response = await api.post(`/messages/${roomId}/link-preview`, { content, replyTo });
    return response.data;
  }
};
