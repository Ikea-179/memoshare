import { API_BASE_URL } from './config';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const fetchWithTimeout = async (url, options, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接');
    }
    throw error;
  }
};

const handleResponse = async (response) => {
  const text = await response.text();
  if (!text) {
    throw new Error('服务器无响应');
  }
  try {
    const data = JSON.parse(text);
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }
    return data;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('服务器返回格式错误');
    }
    throw e;
  }
};

export const api = {
  async get(endpoint) {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(response);
  },

  async post(endpoint, body) {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  async put(endpoint, body) {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  async patch(endpoint, body) {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  async delete(endpoint) {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    });
    return handleResponse(response);
  },

  async upload(endpoint, file) {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData,
    }, 30000);
    return handleResponse(response);
  },
};

export const auth = {
  register(username, password, nickname) {
    return api.post('/api/auth/register', { username, password, nickname });
  },
  login(username, password) {
    return api.post('/api/auth/login', { username, password });
  },
  getMe() {
    return api.get('/api/auth/me');
  },
  updateProfile(data) {
    return api.put('/api/auth/profile', data);
  },
};

export const groups = {
  getAll() {
    return api.get('/api/groups');
  },
  create(name) {
    return api.post('/api/groups', { name });
  },
  get(id) {
    return api.get(`/api/groups/${id}`);
  },
  update(id, name) {
    return api.put(`/api/groups/${id}`, { name });
  },
  delete(id) {
    return api.delete(`/api/groups/${id}`);
  },
  addMember(groupId, username) {
    return api.post(`/api/groups/${groupId}/members`, { username });
  },
  removeMember(groupId, userId) {
    return api.delete(`/api/groups/${groupId}/members/${userId}`);
  },
};

export const memos = {
  getByGroup(groupId) {
    return api.get(`/api/groups/${groupId}/memos`);
  },
  create(groupId, data) {
    return api.post(`/api/groups/${groupId}/memos`, data);
  },
  update(id, data) {
    return api.put(`/api/memos/${id}`, data);
  },
  delete(id) {
    return api.delete(`/api/memos/${id}`);
  },
  complete(id) {
    return api.patch(`/api/memos/${id}/complete`, {});
  },
  uncomplete(id) {
    return api.patch(`/api/memos/${id}/uncomplete`, {});
  },
};

export const backup = {
  export() {
    return api.get('/api/backup/export');
  },
  import(data) {
    return api.post('/api/backup/import', data);
  },
};
