/* eslint-disable react-refresh/only-export-components */
import { FC, useState, useEffect, createContext, useContext, Dispatch, SetStateAction, ReactNode } from 'react'
import { AuthModel, UserModel } from './_models'
import * as authHelper from './AuthHelpers'
import { getRoleByEmail } from '../../../api/apiRoles'

type WithChildren = { children?: ReactNode }

type AuthContextProps = {
  auth: AuthModel | undefined
  saveAuth: (auth: AuthModel | undefined) => void
  currentUser: UserModel | undefined
  setCurrentUser: Dispatch<SetStateAction<UserModel | undefined>>
  logout: () => void
  isAdmin: boolean
  isAdminCheckDone: boolean
}

const initAuthContextPropsState = {
  auth: authHelper.getAuth(),
  saveAuth: () => { },
  currentUser: undefined,
  setCurrentUser: () => { },
  logout: () => { },
  isAdmin: false,
  isAdminCheckDone: false
}

const AuthContext = createContext<AuthContextProps>(initAuthContextPropsState)

const useAuth = () => {
  return useContext(AuthContext)
}

const AuthProvider: FC<WithChildren> = ({ children }) => {
  const [auth, setAuth] = useState<AuthModel | undefined>(authHelper.getAuth())
  const [currentUser, setCurrentUser] = useState<UserModel | undefined>()
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isAdminCheckDone, setIsAdminCheckDone] = useState<boolean>(false)

  const saveAuth = (auth: AuthModel | undefined) => {
    setAuth(auth)
    if (auth) {
      authHelper.setAuth(auth)
    } else {
      authHelper.removeAuth()
    }
  }

  const logout = () => {
    saveAuth(undefined)
    setCurrentUser(undefined)
    setIsAdmin(false)
    setIsAdminCheckDone(true)
  }

  // Helper to parse JWT
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))
      return JSON.parse(jsonPayload)
    } catch (e) {
      return null
    }
  }

  // Check admin status when auth changes
  useEffect(() => {
    const initializeUserFromToken = async () => {
      if (auth?.api_token) {
        try {
          const claims = parseJwt(auth.api_token)
          if (claims) {
            // Determine admin status directly from token claims first (optimistic)
            const tokenIsAdmin = claims.rol === 'admin' && claims.id_api_rol !== null
            setIsAdmin(tokenIsAdmin)

            // Mark check as done so app can render
            setIsAdminCheckDone(true)

            // Set current user if not set
            if (!currentUser) {
              setCurrentUser({
                id: claims.sub || 0,
                username: claims.username || '',
                email: claims.email || '',
                first_name: claims.username || '', // Fallback
                last_name: '',
                password: undefined,
                isAdmin: tokenIsAdmin
              })
            }
          } else {
            // Token parsing failed
            setIsAdmin(false)
            setIsAdminCheckDone(true)
          }
        } catch (error) {
          console.error("Error parsing token", error)
          setIsAdmin(false)
          setIsAdminCheckDone(true)
        }
      } else {
        setIsAdmin(false)
        setIsAdminCheckDone(true)
      }
    }

    initializeUserFromToken()
  }, [auth])

  return (
    <AuthContext.Provider value={{ auth, saveAuth, currentUser, setCurrentUser, logout, isAdmin, isAdminCheckDone }}>
      {children}
    </AuthContext.Provider>
  )
}

const AuthInit: FC<WithChildren> = ({ children }) => {
  const { auth, isAdminCheckDone, logout } = useAuth()
  const [showSplashScreen, setShowSplashScreen] = useState(true)

  // Initialize authentication state
  useEffect(() => {
    if (auth && auth.api_token) {
      // User is authenticated, wait for role check
      if (isAdminCheckDone) {
        setShowSplashScreen(false)
      }
    } else {
      logout()
      setShowSplashScreen(false)
    }
  }, [auth, isAdminCheckDone])

  return showSplashScreen ? (
    <div className="atisa-splash">
      <div className="atisa-splash__logo"><i className="fa-solid fa-shield-halved"></i></div>
      <div className="atisa-splash__text">Cargando...</div>
    </div>
  ) : <>{children}</>
}

export { AuthProvider, AuthInit, useAuth }
