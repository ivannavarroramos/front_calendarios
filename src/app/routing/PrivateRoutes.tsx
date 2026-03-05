import { FC, Suspense } from 'react'
import { Route, Routes, Navigate, useParams } from 'react-router-dom'
import AtisaLayout from '../layout/AtisaLayout'

import EntityDashboard from '../pages/dashboard/EntityDashboard'
import ClientesList from '../pages/dashboard/ClientesList'
import ProcesosList from '../pages/dashboard/ProcesosList'
import HitosList from '../pages/dashboard/HitosList'
import PlantillasList from '../pages/dashboard/PlantillasList'
import ClientesDocumentalCalendarioList from '../pages/cliente-documental/ClientesDocumentalCalendarioList'
import CalendarioCliente from '../pages/cliente-documental/components/calendario/CalendarioCliente'
import EdicionCalendarioCliente from '../pages/dashboard/edicion_calendarios/EdicionCalendarioCliente'
import GestorDocumental from '../pages/cliente-documental/components/gestor_documental/GestorDocumental'
import MetricasList from '../pages/dashboard-metricas/MetricasList'
import HistoricoCumplimientos from '../pages/cliente-documental/components/calendario/HistoricoCumplimientos'
import StatusCliente from '../pages/cliente-documental/components/calendario/StatusCliente'
import StatusTodosClientes from '../pages/cliente-documental/components/calendario/StatusTodosClientes'
import AdministradoresPage from '../pages/administracion/AdministradoresPage'
import ConfigAvisosPage from '../pages/config-avisos/ConfigAvisosPage'
import AdminRoute from './AdminRoute'
import CumplimientoMasivo from '../pages/cliente-documental/components/calendario/CumplimientoMasivo'
import HistorialAuditoria from '../pages/dashboard/edicion_calendarios/HistorialAuditoria'
import { HistorialAuditoriaGlobal } from '../pages/dashboard/components/HistorialAuditoriaGlobal'
import { useAuth } from '../modules/auth/core/Auth'
import MetadatosList from '../pages/dashboard/MetadatosList'
import DocumentSearchChat from '../components/DocumentSearchChat'

const PrivateRoutes = () => {
  const { isAdmin } = useAuth()

  return (
    <Routes>
      <Route element={<AtisaLayout />}>
        {/* Redirect after login */}
        <Route path='auth/*' element={<Navigate to={isAdmin ? '/dashboard' : '/clientes-documental-calendario'} />} />

        {/* Dashboard - Solo admin */}
        <Route path='dashboard' element={
          <AdminRoute>
            <EntityDashboard />
          </AdminRoute>
        } />

        {/* Páginas de negocio */}
        <Route path='clientes' element={<ClientesList />} />
        <Route path='procesos' element={<ProcesosList />} />
        <Route path='hitos' element={<HitosList />} />
        <Route path='plantillas' element={<PlantillasList />} />
        <Route path='clientes-documental-calendario' element={<ClientesDocumentalCalendarioList />} />
        <Route path='cumplimiento-masivo' element={<CumplimientoMasivo />} />
        <Route path='/cliente-calendario/:clienteId' element={<CalendarioClienteWrapper />} />
        <Route path='/edicion-calendario/:clienteId' element={<EdicionCalendarioClienteWrapper />} />
        <Route path='/historial-auditoria/:clienteId' element={<HistorialAuditoria />} />
        <Route path='/auditoria-general' element={<HistorialAuditoriaGlobal />} />
        <Route path='gestor-documental/:clienteId' element={<GestorDocumentalWrapper />} />
        <Route path='historico-cumplimientos/:clienteId' element={<HistoricoCumplimientosWrapper />} />
        <Route path='status-cliente/:clienteId' element={<StatusClienteWrapper />} />
        <Route path='status-todos-clientes' element={<StatusTodosClientes />} />
        <Route path='metadatos' element={<MetadatosList />} />
        <Route path='metricas' element={<MetricasList />} />
        <Route path='config-avisos' element={<ConfigAvisosPage />} />
        <Route path='asistente' element={<DocumentSearchChat />} />

        {/* Administración - Solo admin */}
        <Route path='administracion' element={
          <AdminRoute>
            <AdministradoresPage />
          </AdminRoute>
        } />

        {/* 404 */}
        <Route path='*' element={<Navigate to='/error/404' />} />
      </Route>
    </Routes>
  )
}

// Wrappers para extraer parámetros de URL
const CalendarioClienteWrapper: FC = () => {
  const { clienteId } = useParams<{ clienteId: string }>()
  if (!clienteId) return null
  return <CalendarioCliente clienteId={clienteId} />
}

const EdicionCalendarioClienteWrapper: FC = () => {
  const { clienteId } = useParams<{ clienteId: string }>()
  if (!clienteId) return null
  return <EdicionCalendarioCliente clienteId={clienteId} />
}

const GestorDocumentalWrapper: FC = () => {
  const { clienteId } = useParams<{ clienteId: string }>()
  if (!clienteId) return null
  return <GestorDocumental clienteId={clienteId} />
}

const HistoricoCumplimientosWrapper: FC = () => {
  const { clienteId } = useParams<{ clienteId: string }>()
  if (!clienteId) return null
  return <HistoricoCumplimientos clienteId={clienteId} />
}

const StatusClienteWrapper: FC = () => {
  const { clienteId } = useParams<{ clienteId: string }>()
  if (!clienteId) return null
  return <StatusCliente clienteId={clienteId} />
}

export { PrivateRoutes }
