
import { useEffect } from 'react'
import { Outlet, Link } from 'react-router-dom'

const AuthLayout = () => {
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) root.style.height = '100%'
    return () => {
      if (root) root.style.height = 'auto'
    }
  }, [])

  return (
    <div className='d-flex flex-column flex-lg-row h-100' style={{ minHeight: '100vh' }}>
      {/* Formulario */}
      <div className='d-flex flex-column flex-lg-row-fluid w-lg-50 p-5 order-2 order-lg-1' style={{ background: 'var(--atisa-bg-body)' }}>
        <div className='d-flex flex-column justify-content-center align-items-center flex-grow-1' style={{ transform: 'translateY(60px)' }}>
          <div style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}>
            <Outlet />
          </div>
        </div>
        <div className='text-center py-3' style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
          © {new Date().getFullYear()} ATISA — Gestión Integral
        </div>
      </div>

      {/* Panel lateral decorativo */}
      <div
        className='d-flex flex-column justify-content-center align-items-center w-lg-50 order-1 order-lg-2 p-5'
        style={{
          background: 'linear-gradient(135deg, var(--atisa-dark) 0%, #003d45 100%)',
          color: '#fff',
          minHeight: '200px',
        }}
      >
        <div className='text-center' style={{ maxWidth: '400px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', background: 'var(--atisa-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
            fontSize: '1.5rem', boxShadow: '0 4px 12px rgba(156,186,57,0.3)'
          }}>
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <h1 style={{ fontFamily: 'var(--font-headings)', fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Gestión Inteligente de Calendarios
          </h1>
          <p style={{ opacity: 0.8, fontSize: '0.9rem', lineHeight: 1.6 }}>
            Accede a todos los procesos y documentos de tus clientes de forma centralizada y segura.
            Mantén el control de tus hitos y plazos con la confianza de ATISA.
          </p>
        </div>
      </div>
    </div>
  )
}

export { AuthLayout }
