import client from './client'
import type { LoginRequest, RegisterRequest, Token, User } from '../types'

export const login = (data: LoginRequest) => client.post<Token>('/auth/login', data)
export const register = (data: RegisterRequest) => client.post<User>('/auth/register', data)
export const getMe = () => client.get<User>('/auth/me')
