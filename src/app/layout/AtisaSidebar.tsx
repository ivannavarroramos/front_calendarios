import { NavLink } from 'react-router-dom'
import { useAuth } from '../modules/auth/core/Auth'

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
}

const AtisaSidebar = ({ isOpen, onClose }: SidebarProps) => {
    const { currentUser, isAdmin, logout } = useAuth()

    const userInitials = currentUser?.email
        ? currentUser.email.substring(0, 2).toUpperCase()
        : 'AT'

    return (
        <>
            {/* Overlay mobile */}
            <div
                id="sidebar-overlay"
                className={`atisa-sidebar-overlay ${isOpen ? 'open' : ''}`}
                onClick={onClose}
            />

            <aside id="atisa-sidebar" className={`atisa-sidebar ${isOpen ? 'open' : ''}`}>
                {/* Logo */}
                <div className="atisa-sidebar__logo">
                    <img
                        id="sidebar-logo-img"
                        src="/Atisa_logo+tagline_color_negativo_RGB_300.png"
                        alt="ATISA"
                        className="atisa-sidebar__logo-img"
                    />
                </div>

                {/* Navegación Principal */}
                <nav className="atisa-sidebar__nav">
                    <div className="atisa-sidebar__section-title">Principal</div>

                    <NavLink
                        id="nav-gestor-documental"
                        to="/clientes-documental-calendario"
                        className={({ isActive }) => `atisa-sidebar__link ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <i className="bi bi-calendar"></i>
                        Gestor Documental/Calendario
                    </NavLink>

                    <NavLink
                        id="nav-metricas"
                        to="/metricas"
                        className={({ isActive }) => `atisa-sidebar__link ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <i className="bi bi-graph-up"></i>
                        Dashboard de Métricas
                    </NavLink>

                    {/* Gestión de Negocio - Accesible para todos los autorizados según PrivateRoutes */}
                    <div className="atisa-sidebar__section-title">Gestión</div>


                    <NavLink
                        id="nav-status-todos"
                        to="/status-todos-clientes"
                        className={({ isActive }) => `atisa-sidebar__link ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <i className="bi bi-card-checklist"></i>
                        Status Todos Clientes
                    </NavLink>

                    <NavLink
                        id="nav-clientes"
                        to="/clientes"
                        className={({ isActive }) => `atisa-sidebar__link ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <i className="bi bi-people"></i>
                        Clientes
                    </NavLink>

                    <NavLink
                        id="nav-procesos"
                        to="/procesos"
                        className={({ isActive }) => `atisa-sidebar__link ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <i className="bi bi-diagram-3"></i>
                        Procesos
                    </NavLink>

                    <NavLink
                        id="nav-hitos"
                        to="/hitos"
                        className={({ isActive }) => `atisa-sidebar__link ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <i className="bi bi-flag"></i>
                        Hitos
                    </NavLink>

                    <NavLink
                        id="nav-plantillas"
                        to="/plantillas"
                        className={({ isActive }) => `atisa-sidebar__link ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <i className="bi bi-file-earmark-text"></i>
                        Plantillas
                    </NavLink>

                    <NavLink
                        id="nav-metadatos"
                        to="/metadatos"
                        className={({ isActive }) => `atisa-sidebar__link ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <i className="bi bi-tags"></i>
                        Metadatos
                    </NavLink>

                    <NavLink
                        id="nav-auditoria-general"
                        to="/auditoria-general"
                        className={({ isActive }) => `atisa-sidebar__link ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <i className="bi bi-journal-text"></i>
                        Auditoría General
                    </NavLink>

                    <NavLink
                        id="nav-config-avisos"
                        to="/config-avisos"
                        className={({ isActive }) => `atisa-sidebar__link ${isActive ? 'active' : ''}`}
                        onClick={onClose}
                    >
                        <i className="bi bi-bell"></i>
                        Configuración de Avisos
                    </NavLink>

                    {/* Sección Admin - Solo rutas protegidas en PrivateRoutes */}
                    {isAdmin && (
                        <>
                            <div className="atisa-sidebar__section-title">Administración</div>

                            <NavLink
                                id="nav-administracion"
                                to="/administracion"
                                className={({ isActive }) => `atisa-sidebar__link ${isActive ? 'active' : ''}`}
                                onClick={onClose}
                            >
                                <i className="bi bi-shield-lock"></i>
                                Roles y Usuarios
                            </NavLink>

                            <NavLink
                                id="nav-dashboard"
                                to="/dashboard"
                                className={({ isActive }) => `atisa-sidebar__link ${isActive ? 'active' : ''}`}
                                onClick={onClose}
                            >
                                <i className="bi bi-speedometer2"></i>
                                Dashboard General
                            </NavLink>
                        </>
                    )}
                </nav>

                {/* User Info */}
                <div className="atisa-sidebar__user">
                    <div className="atisa-sidebar__user-avatar">{userInitials}</div>
                    <div className="atisa-sidebar__user-info">
                        <div className="atisa-sidebar__user-name">
                            {currentUser?.first_name || currentUser?.username || 'Usuario'}
                        </div>
                        <div className="atisa-sidebar__user-email">
                            {currentUser?.email || ''}
                        </div>
                    </div>
                    <button
                        id="btn-logout-sidebar"
                        className="atisa-sidebar__logout"
                        onClick={logout}
                        title="Cerrar sesión"
                    >
                        <i className="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </aside>
        </>
    )
}

export default AtisaSidebar
