import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../modules/auth/core/Auth'

interface HeaderProps {
    onToggleSidebar: () => void
}

const routeTitles: Record<string, string> = {
    '/clientes-documental-calendario': 'Gestor Documental/Calendario',
    '/metricas': 'Dashboard de Métricas',
    '/dashboard': 'Dashboard',
    '/administracion': 'Roles y Usuarios',
    '/config-avisos': 'Configuración de Avisos',
    '/clientes': 'Clientes',
    '/procesos': 'Procesos',
    '/hitos': 'Hitos',
    '/plantillas': 'Plantillas',
    '/metadatos': 'Metadatos',
    '/cumplimiento-masivo': 'Cumplimiento Masivo',
    '/status-todos-clientes': 'Status Todos Clientes',
    '/auditoria-general': 'Auditoría General',
    '/asistente': 'Asistente Documental',
}

const AtisaHeader = ({ onToggleSidebar }: HeaderProps) => {
    const location = useLocation()
    const navigate = useNavigate()
    const { logout } = useAuth()

    const currentPath = location.pathname
    const pageTitle = routeTitles[currentPath] || getDeepTitle(currentPath)

    return (
        <header id="atisa-header" className="atisa-header">
            <div className="atisa-header__left">
                <button
                    id="btn-toggle-sidebar"
                    className="atisa-header__toggle"
                    onClick={onToggleSidebar}
                    title="Menú"
                >
                    <i className="fa-solid fa-bars"></i>
                </button>
                <div className="atisa-header__breadcrumb">
                    <i className="fa-solid fa-house" style={{ fontSize: '0.7rem' }}></i>
                    <span>/</span>
                    <span className="atisa-header__breadcrumb-page">{pageTitle}</span>
                </div>
            </div>
            <div className="atisa-header__right">
                <button
                    id="btn-asistente-header"
                    className="btn btn-sm btn-light-primary me-2"
                    onClick={() => navigate('/asistente')}
                    title="Asistente Documental"
                    style={{
                        backgroundColor: 'var(--atisa-accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    <i className="bi bi-chat-dots-fill"></i>
                    Asistente
                </button>
                <button
                    id="btn-logout-header"
                    className="btn-icon"
                    onClick={logout}
                    title="Cerrar sesión"
                    style={{ color: 'var(--atisa-dark)' }}
                >
                    <i className="fa-solid fa-right-from-bracket"></i>
                </button>
            </div>
        </header>
    )
}

function getDeepTitle(path: string): string {
    if (path.startsWith('/cliente-calendario/')) return 'Calendario Cliente'
    if (path.startsWith('/edicion-calendario/')) return 'Edición Calendario'
    if (path.startsWith('/historial-auditoria/')) return 'Historial Auditoría'
    if (path.startsWith('/gestor-documental/')) return 'Gestor Documental'
    if (path.startsWith('/historico-cumplimientos/')) return 'Histórico Cumplimientos'
    if (path.startsWith('/status-cliente/')) return 'Status Cliente'
    return 'Página'
}

export default AtisaHeader
