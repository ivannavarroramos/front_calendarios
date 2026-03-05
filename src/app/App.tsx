import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { AuthInit } from './modules/auth'

const App = () => {
  return (
    <Suspense fallback={
      <div className="atisa-splash">
        <div className="atisa-splash__logo"><i className="fa-solid fa-shield-halved"></i></div>
        <div className="atisa-splash__text">Cargando...</div>
      </div>
    }>
      <AuthInit>
        <Outlet />
      </AuthInit>
    </Suspense>
  )
}

export { App }
