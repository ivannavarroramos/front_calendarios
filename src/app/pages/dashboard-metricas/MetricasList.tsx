import React, { FC, useState, useEffect, useRef } from 'react'
import {
  getResumenMetricas,
  getCumplimientoHitos,
  getHitosPorProceso,
  getTiempoResolucion,
  getVolumenMensual,
  ResumenMetricasResponse,
  CumplimientoHitosResponse,
  HitosPorProcesoResponse,
  TiempoResolucionResponse,
  VolumenMensualResponse
} from '../../api/metricas'
import { CumplimientoHitosChart } from './components/CumplimientoHitosChart'
import { HitosPorProcesoChart } from './components/HitosPorProcesoChart'
import { HitosPorClienteChart } from './components/HitosPorClienteChart'
import { TiempoResolucionChart } from './components/TiempoResolucionChart'
import { VolumenMensualChart } from './components/VolumenMensualChart'
import { atisaStyles } from '../../styles/atisaStyles'
import { ClienteData } from '../../api/metricas'
import PageHeader from '../../components/ui/PageHeader'

const MetricasList: FC = () => {
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [metricasData, setMetricasData] = useState<ResumenMetricasResponse | null>(null)
  const [cumplimientoData, setCumplimientoData] = useState<CumplimientoHitosResponse | null>(null)
  const [procesosData, setProcesosData] = useState<HitosPorProcesoResponse | null>(null)
  const [resolucionData, setResolucionData] = useState<TiempoResolucionResponse | null>(null)
  const [volumenData, setVolumenData] = useState<VolumenMensualResponse | null>(null)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('')
  const [clientesDisponibles, setClientesDisponibles] = useState<ClienteData[]>([])

  const isInitialMount = useRef(true)

  // Cargar datos de métricas al montar el componente
  useEffect(() => {
    loadMetricas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Actualizar lista de clientes cuando se cargan los datos de procesos (solo si no hay cliente seleccionado)
  useEffect(() => {
    if (procesosData?.clientesData && !clienteSeleccionado) {
      setClientesDisponibles(procesosData.clientesData)
    }
  }, [procesosData, clienteSeleccionado])

  // Recargar métricas cuando cambia el cliente seleccionado (no en la carga inicial)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (clienteSeleccionado !== undefined) {
      loadMetricas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteSeleccionado])

  const loadMetricas = async () => {
    try {
      setLoading(true)
      setError(null)

      const clienteId = clienteSeleccionado || undefined

      // Cargar todas las métricas en paralelo con el filtro de cliente si está seleccionado
      const [resumen, cumplimiento, procesos, resolucion, volumen] = await Promise.all([
        getResumenMetricas(),
        getCumplimientoHitos(clienteId),
        getHitosPorProceso(clienteId),
        getTiempoResolucion(clienteId),
        getVolumenMensual(clienteId)
      ])

      setMetricasData(resumen)
      setCumplimientoData(cumplimiento)
      setProcesosData(procesos)
      setResolucionData(resolucion)
      setVolumenData(volumen)
    } catch (error) {
      console.error('Error al cargar métricas:', error)
      setError('Error al cargar las métricas')
    } finally {
      setLoading(false)
    }
  }

  // Configuración de métricas con datos reales
  const getMetricas = () => {
    if (!metricasData) return []

    return [
      {
        id: 1,
        titulo: 'Hitos Completados',
        valor: metricasData.hitosCompletados.valor,
        porcentaje: metricasData.hitosCompletados.tendencia,
        tendencia: metricasData.hitosCompletados.tendencia.startsWith('+') ? 'up' : 'down',
        descripcion: 'Cumplimiento general',
        icono: 'flag',
        color: 'success'
      },
      {
        id: 2,
        titulo: 'Hitos Pendientes',
        valor: metricasData.hitosPendientes.valor.toString(),
        porcentaje: metricasData.hitosPendientes.tendencia,
        tendencia: metricasData.hitosPendientes.tendencia.startsWith('+') ? 'up' : 'down',
        descripcion: 'En proceso',
        icono: 'time',
        color: 'warning'
      },
      {
        id: 3,
        titulo: 'Hitos Vencidos',
        valor: metricasData.hitosVencidos.valor.toString(),
        porcentaje: metricasData.hitosVencidos.tendencia,
        tendencia: metricasData.hitosVencidos.tendencia.startsWith('+') ? 'up' : 'down',
        descripcion: 'Requieren atención',
        icono: 'warning',
        color: 'danger'
      },
      {
        id: 4,
        titulo: 'Clientes Inactivos',
        valor: metricasData.clientesInactivos.valor.toString(),
        porcentaje: metricasData.clientesInactivos.tendencia,
        tendencia: metricasData.clientesInactivos.tendencia.startsWith('+') ? 'up' : 'down',
        descripcion: 'Sin hitos activos',
        icono: 'user',
        color: 'info'
      }
    ]
  }

  const getIconPath = (icon: string) => {
    const iconMap: { [key: string]: string } = {
      user: '/media/icons/duotune/general/gen021.svg',
      flow: '/media/icons/duotune/general/gen027.svg',
      flag: '/media/icons/duotune/general/gen003.svg',
      copy: '/media/icons/duotune/files/fil012.svg',
      time: '/media/icons/duotune/general/gen014.svg',
      warning: '/media/icons/duotune/general/gen035.svg'
    }
    return iconMap[icon] || '/media/icons/duotune/general/gen003.svg'
  }

  const getTendenciaColor = (tendencia: string) => {
    return tendencia === 'up' ? 'text-success' : 'text-danger'
  }

  const getTendenciaIcon = (tendencia: string) => {
    return tendencia === 'up' ? 'arrow-up' : 'arrow-down'
  }

  return (
    <div
      className="container-fluid"
      style={{
        fontFamily: atisaStyles.fonts.secondary,
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        padding: '20px'
      }}
    >
      <div className="d-flex flex-column">
        <PageHeader
          title="Dashboard de Métricas"
          subtitle="Análisis y seguimiento del sistema"
          icon="graph-up"
          actions={
            clientesDisponibles.length > 0 && (
              <div style={{ minWidth: '300px' }}>
                <label
                  className="form-label mb-2"
                  style={{
                    fontFamily: atisaStyles.fonts.secondary,
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  <i className="bi bi-funnel me-2"></i>
                  Filtrar por Cliente
                </label>
                <select
                  className="form-select"
                  value={clienteSeleccionado}
                  onChange={(e) => setClienteSeleccionado(e.target.value)}
                  style={{
                    fontFamily: atisaStyles.fonts.secondary,
                    borderRadius: '8px',
                    border: `2px solid ${atisaStyles.colors.light}`,
                    padding: '10px 16px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    color: atisaStyles.colors.primary,
                    fontWeight: '500'
                  }}
                >
                  <option value="">Todos los clientes</option>
                  {clientesDisponibles.map((cliente) => (
                    <option key={cliente.clienteId.trim()} value={cliente.clienteId.trim()}>
                      {cliente.clienteNombre.trim()}
                    </option>
                  ))}
                </select>
              </div>
            )
          }
        />

        {/* Métricas Cards */}
        {loading && (
          <div className="d-flex justify-content-center mb-5">
            <div
              className="spinner-border"
              role="status"
              style={{
                color: atisaStyles.colors.primary,
                width: '3rem',
                height: '3rem'
              }}
            >
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        )}

        {error && (
          <div
            className="alert alert-danger mb-5"
            role="alert"
            style={{
              backgroundColor: '#f8d7da',
              border: `1px solid #f5c6cb`,
              color: '#721c24',
              fontFamily: atisaStyles.fonts.secondary,
              borderRadius: '8px',
              padding: '16px 20px'
            }}
          >
            {error}
            <button
              type="button"
              className="btn btn-sm ms-3"
              onClick={loadMetricas}
              style={{
                backgroundColor: atisaStyles.colors.primary,
                border: `2px solid ${atisaStyles.colors.primary}`,
                color: 'white',
                fontFamily: atisaStyles.fonts.secondary,
                fontWeight: '600',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                e.currentTarget.style.borderColor = atisaStyles.colors.accent
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                e.currentTarget.style.borderColor = atisaStyles.colors.primary
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="row g-5 g-xl-8 mb-5 mb-xl-8">
            {getMetricas().map((metrica) => (
              <div className="col-xl-3" key={metrica.id}>
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
                    border: `1px solid ${atisaStyles.colors.light}`,
                    height: '175px',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 80, 92, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 80, 92, 0.1)'
                  }}
                >
                  <div className="d-flex flex-column p-6 h-100">
                    {/* Header con icono y título */}
                    <div className="d-flex align-items-center mb-4">
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          backgroundColor: metrica.color === 'success' ? atisaStyles.colors.secondary :
                            metrica.color === 'warning' ? atisaStyles.colors.accent :
                              metrica.color === 'danger' ? '#dc3545' : atisaStyles.colors.primary,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '12px'
                        }}
                      >
                        <i
                          className={`bi bi-${metrica.icono === 'flag' ? 'flag' :
                            metrica.icono === 'time' ? 'clock' :
                              metrica.icono === 'warning' ? 'exclamation-triangle' :
                                metrica.icono === 'user' ? 'people' : 'flag'}`}
                          style={{
                            fontSize: '24px',
                            color: 'white'
                          }}
                        ></i>
                      </div>
                      <div className="flex-grow-1">
                        <h4
                          className="fs-6 fw-bold mb-1"
                          style={{
                            fontFamily: atisaStyles.fonts.primary,
                            color: atisaStyles.colors.primary,
                            margin: 0
                          }}
                        >
                          {metrica.titulo}
                        </h4>
                        <span
                          className="fs-7"
                          style={{
                            fontFamily: atisaStyles.fonts.secondary,
                            color: atisaStyles.colors.dark
                          }}
                        >
                          {metrica.descripcion}
                        </span>
                      </div>
                    </div>

                    {/* Valor y tendencia */}
                    <div className="d-flex align-items-center justify-content-between mt-auto">
                      <div
                        className="fs-2x fw-bolder"
                        style={{
                          fontFamily: atisaStyles.fonts.primary,
                          color: atisaStyles.colors.primary,
                          fontSize: '2.5rem'
                        }}
                      >
                        {metrica.valor}
                      </div>
                      <div className="d-flex align-items-center">
                        <i
                          className={`bi bi-arrow-${metrica.tendencia === 'up' ? 'up' : 'down'}`}
                          style={{
                            fontSize: '20px',
                            color: metrica.tendencia === 'up' ? atisaStyles.colors.secondary : '#dc3545',
                            marginRight: '4px'
                          }}
                        ></i>
                        <span
                          className="fw-bold fs-6"
                          style={{
                            fontFamily: atisaStyles.fonts.secondary,
                            color: metrica.tendencia === 'up' ? atisaStyles.colors.secondary : '#dc3545'
                          }}
                        >
                          {metrica.porcentaje}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Gráficos de Métricas */}
        {!loading && !error && (
          <>
            <div className="row g-5 g-xl-8 mb-5 mb-xl-8">
              {/* Porcentaje de cumplimiento de hitos por cliente */}
              <div className="col-xl-6">
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
                    border: `1px solid ${atisaStyles.colors.light}`,
                    height: '450px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    className="card-header border-0 pt-5"
                    style={{
                      backgroundColor: atisaStyles.colors.light,
                      padding: '20px 24px',
                      borderBottom: `2px solid ${atisaStyles.colors.primary}`
                    }}
                  >
                    <h3 className="card-title align-items-start flex-column">
                      <span
                        className="card-label fw-bolder fs-3 mb-1"
                        style={{
                          fontFamily: atisaStyles.fonts.primary,
                          color: atisaStyles.colors.primary
                        }}
                      >
                        <i className="bi bi-pie-chart me-2"></i>
                        Cumplimiento de Hitos
                      </span>
                      <span
                        className="fw-bold fs-7"
                        style={{
                          fontFamily: atisaStyles.fonts.secondary,
                          color: atisaStyles.colors.dark
                        }}
                      >
                        {clienteSeleccionado
                          ? `Cliente: ${clientesDisponibles.find(c => c.clienteId.trim() === clienteSeleccionado)?.clienteNombre.trim() || 'Seleccionado'}`
                          : 'Porcentaje general'}
                      </span>
                    </h3>
                  </div>
                  <div className="pt-0" style={{ padding: '20px 24px' }}>
                    {cumplimientoData && (
                      <CumplimientoHitosChart
                        chartColor="primary"
                        chartHeight="280px"
                        porcentaje={cumplimientoData.porcentajeGeneral}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Hitos por tipo de proceso o por cliente */}
              <div className="col-xl-6">
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
                    border: `1px solid ${atisaStyles.colors.light}`,
                    height: '450px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    className="card-header border-0 pt-5"
                    style={{
                      backgroundColor: atisaStyles.colors.light,
                      padding: '20px 24px',
                      borderBottom: `2px solid ${atisaStyles.colors.primary}`
                    }}
                  >
                    <h3 className="card-title align-items-start flex-column">
                      <span
                        className="card-label fw-bolder fs-3 mb-1"
                        style={{
                          fontFamily: atisaStyles.fonts.primary,
                          color: atisaStyles.colors.primary
                        }}
                      >
                        <i className="bi bi-bar-chart me-2"></i>
                        {clienteSeleccionado ? 'Hitos por Proceso' : 'Hitos por Cliente'}
                      </span>
                      <span
                        className="fw-bold fs-7"
                        style={{
                          fontFamily: atisaStyles.fonts.secondary,
                          color: atisaStyles.colors.dark
                        }}
                      >
                        {clienteSeleccionado ? 'Distribución por tipo' : 'Distribución por cliente'}
                      </span>
                    </h3>
                  </div>
                  <div className="pt-0" style={{ padding: '20px 24px' }}>
                    {clienteSeleccionado && procesosData ? (
                      <HitosPorProcesoChart
                        className="card-xl-stretch"
                        procesoData={procesosData.procesoData}
                      />
                    ) : procesosData?.clientesData && procesosData.clientesData.length > 0 ? (
                      <HitosPorClienteChart
                        className="card-xl-stretch"
                        clientesData={procesosData.clientesData}
                      />
                    ) : procesosData ? (
                      <HitosPorProcesoChart
                        className="card-xl-stretch"
                        procesoData={procesosData.procesoData}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-5 g-xl-8 mb-5 mb-xl-8">
              {/* Tiempo medio de resolución */}
              <div className="col-xl-6">
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
                    border: `1px solid ${atisaStyles.colors.light}`,
                    height: '450px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    className="card-header border-0 pt-5"
                    style={{
                      backgroundColor: atisaStyles.colors.light,
                      padding: '20px 24px',
                      borderBottom: `2px solid ${atisaStyles.colors.primary}`
                    }}
                  >
                    <h3 className="card-title align-items-start flex-column">
                      <span
                        className="card-label fw-bolder fs-3 mb-1"
                        style={{
                          fontFamily: atisaStyles.fonts.primary,
                          color: atisaStyles.colors.primary
                        }}
                      >
                        <i className="bi bi-clock-history me-2"></i>
                        Tiempo de Resolución
                      </span>
                      <span
                        className="fw-bold fs-7"
                        style={{
                          fontFamily: atisaStyles.fonts.secondary,
                          color: atisaStyles.colors.dark
                        }}
                      >
                        Evolución temporal
                      </span>
                    </h3>
                  </div>
                  <div className="pt-0" style={{ padding: '20px 24px' }}>
                    {resolucionData && (
                      <TiempoResolucionChart
                        className="card-xl-stretch"
                        resolucionData={resolucionData.resolucionData}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Volumen mensual de hitos */}
              <div className="col-xl-6">
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
                    border: `1px solid ${atisaStyles.colors.light}`,
                    height: '450px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    className="card-header border-0 pt-5"
                    style={{
                      backgroundColor: atisaStyles.colors.light,
                      padding: '20px 24px',
                      borderBottom: `2px solid ${atisaStyles.colors.primary}`
                    }}
                  >
                    <h3 className="card-title align-items-start flex-column">
                      <span
                        className="card-label fw-bolder fs-3 mb-1"
                        style={{
                          fontFamily: atisaStyles.fonts.primary,
                          color: atisaStyles.colors.primary
                        }}
                      >
                        <i className="bi bi-graph-up me-2"></i>
                        Volumen Mensual
                      </span>
                      <span
                        className="fw-bold fs-7"
                        style={{
                          fontFamily: atisaStyles.fonts.secondary,
                          color: atisaStyles.colors.dark
                        }}
                      >
                        Creados vs Completados
                      </span>
                    </h3>
                  </div>
                  <div className="pt-0" style={{ padding: '20px 24px' }}>
                    {volumenData && (
                      <VolumenMensualChart
                        className="card-xl-stretch"
                        volumenData={volumenData.volumenData}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MetricasList
