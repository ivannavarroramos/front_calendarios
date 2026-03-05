import { FC } from 'react'
import { Link } from 'react-router-dom'

const Error404: FC = () => {
  return (
    <>
      <i className="fa-solid fa-triangle-exclamation mb-4" style={{ fontSize: '3rem', color: 'var(--atisa-warning)' }}></i>
      <h1 style={{ fontFamily: 'var(--font-headings)', fontWeight: 700, color: 'var(--atisa-dark)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>
        Página no encontrada
      </h1>
      <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        La página que buscas no existe o ha sido movida.
      </p>
      <Link to='/clientes-documental-calendario' className='btn btn-sm' style={{
        backgroundColor: 'var(--atisa-accent)', color: '#fff', border: 'none',
        borderRadius: 'var(--radius-md)', fontWeight: 700, padding: '0.5rem 1.25rem'
      }}>
        <i className="fa-solid fa-house me-2"></i>Volver al inicio
      </Link>
    </>
  )
}

export { Error404 }
