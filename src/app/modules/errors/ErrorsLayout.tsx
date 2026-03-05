import { Outlet } from 'react-router-dom'

const ErrorsLayout = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--atisa-bg-body)',
      padding: '2rem'
    }}>
      <div className='card shadow-sm border-0' style={{
        maxWidth: '500px',
        width: '100%',
        borderRadius: 'var(--radius-lg)',
        borderTop: '4px solid var(--atisa-primary)',
        textAlign: 'center',
        padding: '3rem 2rem'
      }}>
        <Outlet />
      </div>
    </div>
  )
}

export { ErrorsLayout }
