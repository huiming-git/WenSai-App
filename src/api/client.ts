import axios from 'axios'

const isTauriRuntime = () => typeof window !== 'undefined' && Boolean((window as unknown as Record<string, unknown>).__TAURI_INTERNALS__)
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (isTauriRuntime() ? 'http://127.0.0.1:8000/api' : '/api')

const client = axios.create({
  baseURL: apiBaseUrl,
})

// Request interceptor: attach JWT token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Don't override Content-Type for FormData (file uploads)
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

// Response interceptor: handle 401
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client
