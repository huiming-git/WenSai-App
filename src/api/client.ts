import axios from 'axios'

const DEFAULT_NATIVE_API_BASE_URL = 'http://127.0.0.1:8000/api'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_NATIVE_API_BASE_URL

export const resolveApiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path
  if (API_BASE_URL.startsWith('http')) {
    const base = new URL(API_BASE_URL)
    return new URL(path, `${base.origin}/`).toString()
  }
  return path
}

const client = axios.create({
  baseURL: API_BASE_URL,
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
      if (!window.location.hash.includes('/login')) {
        window.location.hash = '#/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client
