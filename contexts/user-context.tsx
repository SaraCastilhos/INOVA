'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { UserProfile, RIASECResult, Depoimento } from '@/lib/types'
import { DEPOIMENTOS_INICIAIS } from '@/lib/data'

interface UserContextType {
  user: UserProfile | null
  depoimentos: Depoimento[]
  isLoading: boolean
  createUser: (displayName: string, userType: UserProfile['userType']) => void
  saveTestResult: (result: RIASECResult) => void
  addDepoimento: (depoimento: Omit<Depoimento, 'id' | 'status' | 'dataEnvio' | 'autor'>) => void
  clearData: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [depoimentos, setDepoimentos] = useState<Depoimento[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user_profile')
    const storedDepoimentos = localStorage.getItem('depoimentos')

    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }

    if (storedDepoimentos) {
      setDepoimentos(JSON.parse(storedDepoimentos))
    } else {
      setDepoimentos(DEPOIMENTOS_INICIAIS)
      localStorage.setItem('depoimentos', JSON.stringify(DEPOIMENTOS_INICIAIS))
    }

    setIsLoading(false)
  }, [])

  const createUser = (displayName: string, userType: UserProfile['userType']) => {
    const newUser: UserProfile = {
      userId: generateUUID(),
      displayName,
      userType,
      dataCadastro: new Date().toISOString(),
      ultimoTeste: null,
      historicoTestes: []
    }
    setUser(newUser)
    localStorage.setItem('user_profile', JSON.stringify(newUser))
  }

  const saveTestResult = (result: RIASECResult) => {
    if (!user) return

    const updatedUser: UserProfile = {
      ...user,
      ultimoTeste: result,
      historicoTestes: [...user.historicoTestes, result]
    }
    setUser(updatedUser)
    localStorage.setItem('user_profile', JSON.stringify(updatedUser))
  }

  const addDepoimento = (depoimento: Omit<Depoimento, 'id' | 'status' | 'dataEnvio' | 'autor'>) => {
    if (!user) return

    const newDepoimento: Depoimento = {
      ...depoimento,
      id: generateUUID(),
      autor: user.displayName,
      status: 'pendente',
      dataEnvio: new Date().toISOString()
    }

    const updatedDepoimentos = [...depoimentos, newDepoimento]
    setDepoimentos(updatedDepoimentos)
    localStorage.setItem('depoimentos', JSON.stringify(updatedDepoimentos))
  }

  const clearData = () => {
    localStorage.removeItem('user_profile')
    localStorage.removeItem('depoimentos')
    setUser(null)
    setDepoimentos(DEPOIMENTOS_INICIAIS)
    localStorage.setItem('depoimentos', JSON.stringify(DEPOIMENTOS_INICIAIS))
  }

  return (
    <UserContext.Provider value={{ user, depoimentos, isLoading, createUser, saveTestResult, addDepoimento, clearData }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
