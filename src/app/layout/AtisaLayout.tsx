import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AtisaSidebar from './AtisaSidebar'
import AtisaHeader from './AtisaHeader'
import './AtisaLayout.css'

const AtisaLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div id="atisa-app" className="atisa-app">
            <AtisaSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />
            <div className="atisa-main">
                <AtisaHeader onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
                <main id="atisa-content" className="atisa-content">
                    <Outlet />
                </main>
                <footer className="atisa-footer">
                    © {new Date().getFullYear()} ATISA — Gestión Integral
                </footer>
            </div>
        </div>
    )
}

export default AtisaLayout
