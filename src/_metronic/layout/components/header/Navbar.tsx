import clsx from 'clsx'
import { KTIcon, toAbsoluteUrl } from '../../../helpers'
import { HeaderNotificationsMenu, HeaderUserMenu, Search, ThemeModeSwitcher } from '../../../partials'
import { useLayout } from '../../core'
import { atisaStyles } from '../../../../app/styles/atisaStyles'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../../../app/modules/auth'
import { Bot, X } from 'lucide-react'
import DocumentSearchChat from '../../../../app/components/DocumentSearchChat'

const itemClass = 'ms-1 ms-md-4'
const btnClass =
  'btn btn-icon btn-custom btn-icon-muted btn-active-light btn-active-color-primary w-35px h-35px'
const userAvatarClass = 'symbol-35px'
const btnIconClass = 'fs-2'

const Navbar = () => {
  const { config } = useLayout()
  const { currentUser, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  return (
    <div
      className='app-navbar flex-shrink-0'
      style={{
        backgroundColor: 'white',
        borderBottom: `2px solid ${atisaStyles.colors.light}`,
        boxShadow: '0 2px 10px rgba(0, 80, 92, 0.1)',
        fontFamily: atisaStyles.fonts.secondary
      }}
    >
      {/* Contenedor principal del navbar */}
      <div className='d-flex align-items-center justify-content-end w-100 px-4 py-2'>
        {/* Chat RAG + Información de la empresa */}
        <div className='d-flex align-items-center me-auto' style={{ gap: '15px' }}>

          {/* Botón Chat RAG */}
          <div style={{ position: 'relative' }}>
            <div
              id="rag-chat-toggle-btn"
              onClick={() => setIsChatOpen(!isChatOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: isChatOpen ? atisaStyles.colors.primary : 'white',
                border: `1px solid ${atisaStyles.colors.primary}`,
                color: isChatOpen ? 'white' : atisaStyles.colors.primary,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 8px rgba(0, 80, 92, 0.1)',
                fontWeight: '600',
                fontSize: '13px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isChatOpen ? atisaStyles.colors.primary : 'white'
                e.currentTarget.style.color = isChatOpen ? 'white' : atisaStyles.colors.primary
              }}
            >
              {isChatOpen ? <X size={16} /> : <Bot size={16} />}
              Chat Documental
            </div>

            {isChatOpen && (
              <div
                id="rag-chat-window"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: '0',
                  marginTop: '10px',
                  width: '400px',
                  height: '600px',
                  boxShadow: '0 10px 30px rgba(0, 80, 92, 0.15)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  backgroundColor: '#fff',
                  zIndex: 9999
                }}
                className="animate-slide-down"
              >
                <DocumentSearchChat />
              </div>
            )}
          </div>

          <div className='d-flex align-items-center'>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: atisaStyles.colors.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                boxShadow: '0 4px 12px rgba(0, 80, 92, 0.2)'
              }}
            >
              <i
                className="bi bi-calendar-check"
                style={{
                  fontSize: '20px',
                  color: 'white'
                }}
              ></i>
            </div>
            <div>
              <div
                style={{
                  fontFamily: atisaStyles.fonts.primary,
                  color: atisaStyles.colors.primary,
                  fontWeight: 'bold',
                  fontSize: '16px',
                  margin: 0
                }}
              >
                ATISA GESTIÓN
              </div>
              <div
                style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  color: atisaStyles.colors.dark,
                  fontSize: '12px',
                  margin: 0
                }}
              >
                Calendario / Documental
              </div>
            </div>
          </div>
        </div>

        {/* Botón de usuario */}
        <div className={clsx('app-navbar-item', itemClass)} style={{ position: 'relative' }} ref={menuRef}>
          <div
            className={clsx('cursor-pointer symbol', userAvatarClass)}
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: atisaStyles.colors.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              border: `2px solid ${atisaStyles.colors.secondary}`,
              boxShadow: '0 4px 12px rgba(0, 80, 92, 0.2)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
              e.currentTarget.style.borderColor = atisaStyles.colors.accent
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
              e.currentTarget.style.borderColor = atisaStyles.colors.secondary
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <i
              className="bi bi-person-fill"
              style={{
                fontSize: '18px',
                color: 'white'
              }}
            ></i>
          </div>

          {/* Menú de usuario */}
          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: '0',
                marginTop: '8px',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 8px 30px rgba(0, 80, 92, 0.15)',
                border: `1px solid ${atisaStyles.colors.light}`,
                fontFamily: atisaStyles.fonts.secondary,
                minWidth: '250px',
                zIndex: 9999,
                padding: '16px 0'
              }}
            >
              {/* Información del usuario */}
              <div style={{ padding: '0 16px 12px 16px', borderBottom: `1px solid ${atisaStyles.colors.light}` }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: atisaStyles.colors.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      boxShadow: '0 4px 12px rgba(0, 80, 92, 0.2)'
                    }}
                  >
                    <i
                      className="bi bi-person-fill"
                      style={{
                        fontSize: '18px',
                        color: 'white'
                      }}
                    ></i>
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: atisaStyles.fonts.primary,
                        color: atisaStyles.colors.primary,
                        fontWeight: 'bold',
                        fontSize: '14px',
                        margin: 0
                      }}
                    >
                      {currentUser?.first_name || 'Usuario'}
                      <span
                        style={{
                          backgroundColor: atisaStyles.colors.secondary,
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontSize: '10px',
                          marginLeft: '6px'
                        }}
                      >
                        ATISA
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: atisaStyles.fonts.secondary,
                        color: atisaStyles.colors.dark,
                        fontSize: '12px',
                        margin: 0
                      }}
                    >
                      {currentUser?.email || 'usuario@atisa.com'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Opción de cerrar sesión */}
              <div style={{ padding: '8px 0' }}>
                <a
                  href='#'
                  onClick={(e) => {
                    e.preventDefault()
                    logout()
                    setShowUserMenu(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    color: '#dc3545',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease',
                    fontFamily: atisaStyles.fonts.secondary,
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8d7da'
                    e.currentTarget.style.color = '#721c24'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#dc3545'
                  }}
                >
                  <i
                    className="bi bi-box-arrow-right me-3"
                    style={{ fontSize: '16px' }}
                  ></i>
                  Cerrar Sesión
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { Navbar }
