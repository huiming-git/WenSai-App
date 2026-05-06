import client from './client'
import type { CreditBalanceResponse, LoginRequest, RedeemCodeResponse, RegisterRequest, Token, User } from '../types'

export const login = (data: LoginRequest) => client.post<Token>('/auth/login', data)
export const register = (data: RegisterRequest) => client.post<User>('/auth/register', data)
export const getMe = () => client.get<User>('/auth/me')
export const getCredits = () => client.get<CreditBalanceResponse>('/auth/credits')
export const redeemCode = (code: string) => client.post<RedeemCodeResponse>('/auth/redeem-code', { code })
