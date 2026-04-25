import api from './authService';

export const userService = {
  async getCurrentProfile(userId: string) {
    const response = await api.get(`/users/${userId}/profile`);
    return response.data;
  },

  async updateProfile(formData: FormData) {
    const response = await api.patch('/users/edit/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async updateStatus(status: string, customStatusMessage?: string) {
    const response = await api.patch('/users/status', { status, customStatusMessage });
    return response.data;
  },

  async updatePrivacy(privacy: any) {
    const response = await api.patch('/users/privacy', privacy);
    return response.data;
  },

  async blockUser(userId: string) {
    const response = await api.post(`/users/block/${userId}`);
    return response.data;
  },

  async unblockUser(userId: string) {
    const response = await api.delete(`/users/block/${userId}`);
    return response.data;
  },

  async getBlockedUsers() {
    const response = await api.get('/users/blocked');
    return response.data;
  },

  async searchByPhone(phone: string) {
    const response = await api.get(`/users/find/phone?phone=${phone}`);
    return response.data;
  },

  async searchByName(name: string) {
    const response = await api.get(`/users/find/name?name=${name}`);
    return response.data;
  },
};
