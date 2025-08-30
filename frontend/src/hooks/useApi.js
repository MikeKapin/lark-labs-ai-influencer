import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Log requests in development
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data
      })
    }
    
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data
      })
    }
    
    return response.data // Return just the data
  },
  (error) => {
    // Log errors
    console.error('API Error:', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    })

    // Handle specific error cases
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token')
      // You might want to redirect to login page here
      window.location.href = '/login'
    }

    if (error.response?.status === 429) {
      // Rate limited
      console.warn('Rate limit exceeded. Please wait before making more requests.')
    }

    // Transform error for consistent handling
    const apiError = {
      message: error.response?.data?.message || error.message || 'An error occurred',
      status: error.response?.status,
      data: error.response?.data
    }
    
    return Promise.reject(apiError)
  }
)

// API methods
export const useApi = {
  // GET request
  get: async (endpoint, params = {}) => {
    const response = await apiClient.get(endpoint, { params })
    return response
  },

  // POST request
  post: async (endpoint, data = {}) => {
    const response = await apiClient.post(endpoint, data)
    return response
  },

  // PUT request
  put: async (endpoint, data = {}) => {
    const response = await apiClient.put(endpoint, data)
    return response
  },

  // DELETE request
  delete: async (endpoint) => {
    const response = await apiClient.delete(endpoint)
    return response
  },

  // PATCH request
  patch: async (endpoint, data = {}) => {
    const response = await apiClient.patch(endpoint, data)
    return response
  },

  // File upload
  upload: async (endpoint, formData, onProgress = null) => {
    const response = await apiClient.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress ? (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        onProgress(percentCompleted)
      } : undefined,
    })
    return response
  },
}

// Specific API endpoints for different features
export const contentApi = {
  getCalendar: (params = {}) => useApi.get('/content/calendar', params),
  generateContent: (data) => useApi.post('/content/autonomous-generate', data),
  publishContent: (id, platforms) => useApi.put(`/content/${id}/publish`, { platforms }),
  getContentById: (id) => useApi.get(`/content/${id}`),
  regenerateContent: (id, params) => useApi.post(`/content/${id}/regenerate`, params),
  deleteContent: (id) => useApi.delete(`/content/${id}`),
}

export const analyticsApi = {
  getDashboard: (period = 30) => useApi.get('/analytics/dashboard', { period }),
  getContentPerformance: (params = {}) => useApi.get('/analytics/content-performance', params),
  getAudienceInsights: (days = 30) => useApi.get('/analytics/audience-insights', { days }),
  getLarkLabsImpact: (days = 30) => useApi.get('/analytics/lark-labs-impact', { days }),
  getTrends: (params = {}) => useApi.get('/analytics/trends', params),
}

export const characterApi = {
  getProfile: () => useApi.get('/character/profile'),
  updateSettings: (settings) => useApi.put('/character/settings', settings),
  testVoice: (text, settings = {}) => useApi.post('/character/voice/test', { text, voice_settings: settings }),
  getConsistency: (days = 30) => useApi.get('/character/consistency', { days }),
  evaluateContent: (content, type) => useApi.post('/character/evaluate', { content, content_type: type }),
  getCatchphrases: () => useApi.get('/character/catchphrases'),
  updateCatchphrases: (data) => useApi.put('/character/catchphrases', data),
  getHealth: () => useApi.get('/character/health'),
}

export const researchApi = {
  getIndustryUpdates: (params = {}) => useApi.post('/research/industry-updates', params),
  getCanadianRegulations: (params = {}) => useApi.post('/research/canadian-regulations', params),
  getWeatherImpact: (params = {}) => useApi.post('/research/weather-impact', params),
  getTrendingTopics: (params = {}) => useApi.post('/research/trending-topics', params),
  getHistory: (params = {}) => useApi.get('/research/history', params),
}

export const socialApi = {
  uploadToYouTube: (data) => useApi.post('/social/youtube/upload', data),
  postToLinkedIn: (data) => useApi.post('/social/linkedin/post', data),
  postToFacebook: (data) => useApi.post('/social/facebook/post', data),
  publishToAll: (contentId, platforms, settings = {}) => 
    useApi.post('/social/publish-all', { content_id: contentId, platforms, publish_settings: settings }),
  getPlatformStatus: () => useApi.get('/social/platforms/status'),
  getAnalyticsSummary: (days = 30) => useApi.get('/social/analytics/summary', { days }),
}

export const engagementApi = {
  respondToComments: (params = {}) => useApi.post('/engagement/respond-comments', params),
  handleCommunityQA: (question, userInfo = {}, platform = 'general') => 
    useApi.post('/engagement/community-qa', { question, user_info: userInfo, platform }),
  getSentimentAnalysis: (params = {}) => useApi.get('/engagement/sentiment', params),
  bulkRespond: (interactionIds, style = 'educational') => 
    useApi.post('/engagement/bulk-respond', { interaction_ids: interactionIds, response_style: style }),
  getStats: (days = 30) => useApi.get('/engagement/stats', { days }),
}

// Export the configured axios instance for direct use if needed
export default apiClient