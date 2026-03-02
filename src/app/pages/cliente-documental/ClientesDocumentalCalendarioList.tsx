import { FC, useState, useEffect, useMemo } from 'react'
import { KTCard, KTCardBody } from '../../../_metronic/helpers'
import { Cliente, getAllClientes, getClientesUsuario, getDropdownClientes } from '../../api/clientes'
import { getClienteProcesosByCliente } from '../../api/clienteProcesos'
import SharedPagination from '../../components/pagination/SharedPagination'
import { useNavigate } from 'react-router-dom'
import { atisaStyles } from '../../styles/atisaStyles'

import CustomToast from '../../components/ui/CustomToast'
import { useAuth } from '../../modules/auth/core/Auth'

const ClientesDocumentalCalendarioList: FC = () => {
  const navigate = useNavigate()
  const { isAdmin, currentUser } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10
  const [allClientes, setAllClientes] = useState<Cliente[]>([])
  const [sortField, setSortField] = useState<string>('idcliente')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [clientesConProcesos, setClientesConProcesos] = useState<Set<string>>(new Set())
  const [filtroCalendario, setFiltroCalendario] = useState<'todos' | 'con' | 'sin'>('todos')
  const [clientesCalendarioIds, setClientesCalendarioIds] = useState<Set<string>>(new Set())


  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'info'
  })

  // Cargar lista global de IDs de clientes con calendario
  useEffect(() => {
    const loadGlobalCalendarIds = async () => {
      try {
        const cls = await getDropdownClientes()
        setClientesCalendarioIds(new Set(cls.map(c => c.idcliente)))
      } catch (e) {
        console.error('Error al cargar clientes con calendario global:', e)
      }
    }
    loadGlobalCalendarIds()
  }, [])

  // Debounce para el término de búsqueda
  useEffect(() => {
    if (searchTerm) {
      setSearching(true)
    }

    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      // No establecer searching en false aquí, se establecerá cuando termine loadAllClientes
    }, 300) // 300ms de delay

    return () => {
      clearTimeout(timer)
      if (!searchTerm) {
        setSearching(false)
      }
    }
  }, [searchTerm])

  // Cargar clientes paginados cuando NO hay búsqueda ni filtro
  useEffect(() => {
    // Solo cargar si tenemos información de usuario
    if (!debouncedSearchTerm.trim() && filtroCalendario === 'todos') {
      loadClientes()
    }
  }, [page, sortField, sortDirection, debouncedSearchTerm, filtroCalendario, isAdmin, currentUser])

  // Cargar todos los clientes cuando hay búsqueda o filtro
  useEffect(() => {
    if (debouncedSearchTerm.trim() || filtroCalendario !== 'todos') {
      setPage(1) // Resetear a la primera página cuando hay búsqueda o filtro
      loadAllClientes()
    } else {
      // Limpiar todos los clientes cuando no hay búsqueda ni filtro
      setAllClientes([])
    }
  }, [debouncedSearchTerm, filtroCalendario, isAdmin, currentUser])

  const loadAllClientes = async () => {
    try {
      setLoading(true)
      setSearching(true)
      setSearching(true)
      // Cargar todos los clientes sin paginación para búsqueda (limit grande para traer todos)
      let response
      if (isAdmin) {
        response = await getAllClientes(1, 10000)
      } else if (currentUser?.email) {
        // Usuario normal: endpoint específico
        response = await getClientesUsuario(currentUser.email, undefined, undefined, undefined, 'asc')
      } else {
        response = { clientes: [], total: 0 }
      }
      setAllClientes(response.clientes || [])
    } catch (error) {
      setError('Error al cargar los clientes')
      console.error('Error al cargar todos los clientes:', error)
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const loadClientes = async () => {
    try {
      setLoading(true)
      let response
      if (isAdmin) {
        response = await getAllClientes(page, limit, sortField, sortDirection)
      } else if (currentUser?.email) {
        // Usuario normal: endpoint específico
        response = await getClientesUsuario(currentUser.email, page, limit, sortField, sortDirection)
      } else {
        response = { clientes: [], total: 0 }
      }
      setClientes(response.clientes || [])
      setTotal(response.total || 0)

      // Verificar qué clientes tienen procesos asignados
      if (response.clientes && response.clientes.length > 0) {
        await verificarProcesosDeClientes(response.clientes)
      }
    } catch (error) {
      setError('Error al cargar las empresas')
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const verificarProcesosDeClientes = async (clientesList: Cliente[]) => {
    try {
      const procesosPromises = clientesList.map(async (cliente) => {
        try {
          const response = await getClienteProcesosByCliente(cliente.idcliente)
          return {
            clienteId: cliente.idcliente,
            tieneProcesos: (response.clienteProcesos || []).length > 0
          }
        } catch (error) {
          console.error(`Error al verificar procesos del cliente ${cliente.idcliente}:`, error)
          return {
            clienteId: cliente.idcliente,
            tieneProcesos: false
          }
        }
      })

      const resultados = await Promise.all(procesosPromises)

      setClientesConProcesos(prev => {
        const actualizado = new Set(prev)
        resultados.forEach((resultado) => {
          if (resultado.tieneProcesos) {
            actualizado.add(resultado.clienteId)
          } else {
            actualizado.delete(resultado.clienteId)
          }
        })
        return actualizado
      })
    } catch (error) {
      console.error('Error al verificar procesos de clientes:', error)
    }
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setPage(1) // Reset to first page when sorting changes
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return (
        <span className='ms-1 text-muted'>
          <i className='bi bi-arrow-down-up' style={{ fontSize: '12px' }}></i>
        </span>
      )
    }
    return (
      <span className='ms-1 text-primary'>
        <i className={`bi ${sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down'}`} style={{ fontSize: '12px' }}></i>
      </span>
    )
  }

  // Función auxiliar para normalizar texto (sin tildes, sin mayúsculas)
  const normalizeText = (text: string | null | undefined): string => {
    if (!text) return ''
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  // Filtrar clientes usando useMemo para optimizar el rendimiento
  const filteredClientes = useMemo(() => {
    const isSearchActive = debouncedSearchTerm.trim().length > 0
    const isFilterActive = filtroCalendario !== 'todos'

    // Si hay búsqueda o filtro, usar allClientes; si no, usar clientes paginados
    const clientesToFilter = (isSearchActive || isFilterActive) ? allClientes : clientes

    if (!isSearchActive && !isFilterActive) return clientesToFilter

    // Normalizar el término de búsqueda
    const searchTermStr = String(debouncedSearchTerm).trim()
    const searchNormalized = searchTermStr ? normalizeText(searchTermStr) : ''

    return clientesToFilter.filter((cliente) => {
      let matchesSearch = true
      if (searchNormalized) {
        const searchFields = [cliente.razsoc, cliente.cif]
        matchesSearch = searchFields.some(field => {
          if (!field) return false
          const fieldNormalized = normalizeText(field)
          return fieldNormalized.includes(searchNormalized)
        })
      }

      let matchesFilter = true
      if (isFilterActive) {
        const hasCalendar = clientesCalendarioIds.has(cliente.idcliente)
        if (filtroCalendario === 'con') {
          matchesFilter = hasCalendar
        } else if (filtroCalendario === 'sin') {
          matchesFilter = !hasCalendar
        }
      }

      return matchesSearch && matchesFilter
    })
  }, [clientes, allClientes, debouncedSearchTerm, filtroCalendario, clientesCalendarioIds])

  // Aplicar paginación a los resultados filtrados
  const paginatedClientes = useMemo(() => {
    if (!debouncedSearchTerm.trim() && filtroCalendario === 'todos') {
      return filteredClientes
    }
    // Cuando hay búsqueda o filtro, aplicar paginación local a los resultados filtrados
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    return filteredClientes.slice(startIndex, endIndex)
  }, [filteredClientes, page, limit, debouncedSearchTerm, filtroCalendario])

  // Verificar procesos para los clientes visibles en la página actual (solo cuando hay búsqueda o filtro)
  useEffect(() => {
    if ((debouncedSearchTerm.trim() || filtroCalendario !== 'todos') && paginatedClientes.length > 0) {
      // Verificar procesos solo para los clientes visibles en la página actual
      // Esto asegura que los botones "Ver Calendario" aparezcan correctamente
      verificarProcesosDeClientes(paginatedClientes)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginatedClientes, debouncedSearchTerm, filtroCalendario])

  // Calcular el total para la paginación
  const totalForPagination = useMemo(() => {
    return (debouncedSearchTerm.trim() || filtroCalendario !== 'todos') ? filteredClientes.length : total
  }, [filteredClientes.length, total, debouncedSearchTerm, filtroCalendario])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
  }

  const handleCalendarClick = (clienteId: string) => {
    navigate(`/cliente-calendario/${clienteId}`)
  }

  return (
    <>
      <style>
        {`
          .tooltip-text {
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
          }
          .btn:hover + .tooltip-text {
            opacity: 1;
          }
        `}
      </style>
      <div
        className="container-fluid py-5"
        style={{
          fontFamily: atisaStyles.fonts.secondary,
          backgroundColor: '#f8f9fa',
          minHeight: '100vh'
        }}
      >
        <div
          className='mb-8'
          style={{
            background: 'linear-gradient(135deg, #00505c 0%, #007b8a 100%)',
            color: 'white',
            padding: '32px 24px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 80, 92, 0.15)',
            marginBottom: '24px'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '1rem', width: '100%' }}>
            {/* Columna izquierda: Espacio vacío */}
            <div></div>

            {/* Columna centro: Título */}
            <div style={{ textAlign: 'center' }}>
              <h1
                style={{
                  fontFamily: atisaStyles.fonts.primary,
                  fontWeight: 'bold',
                  color: 'white',
                  margin: 0,
                  fontSize: '2rem'
                }}
              >
                <i className="bi bi-building me-3" style={{ color: 'white' }}></i>
                Gestor Documental/Calendario
              </h1>
              <h4
                style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  color: atisaStyles.colors.light,
                  margin: '8px 0 0 0',
                  fontSize: '1.2rem',
                  fontWeight: '500'
                }}
              >
                Directorio de empresas
              </h4>
            </div>

            {/* Columna derecha: Botones */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type='button'
                className='btn'
                onClick={() => navigate('/cumplimiento-masivo')}
                style={{
                  backgroundColor: atisaStyles.colors.success,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: atisaStyles.fonts.secondary,
                  fontWeight: '600',
                  padding: '10px 20px',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              >
                <i className="bi bi-check-all" style={{ color: 'white', fontSize: '18px' }}></i>
                Cumplimiento masivo
              </button>

              <button
                type='button'
                className='btn'
                onClick={() => navigate('/status-todos-clientes')}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  fontFamily: atisaStyles.fonts.secondary,
                  fontWeight: '600',
                  padding: '10px 20px',
                  fontSize: '14px',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <i className="bi bi-info-circle" style={{ color: 'white' }}></i>
                Ver Status Global
              </button>
            </div>
          </div>
        </div>

        <div
          className='mb-6'
          style={{
            backgroundColor: 'white',
            padding: '20px 24px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
            border: `1px solid ${atisaStyles.colors.light}`
          }}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className='input-group' style={{ position: 'relative', flex: '1 1 min-content' }}>
              <input
                type='text'
                className='form-control'
                placeholder='Buscar por razón social o CIF...'
                value={searchTerm}
                onChange={handleSearch}
                style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  fontSize: '14px',
                  padding: '12px 16px',
                  height: '48px',
                  border: `2px solid ${atisaStyles.colors.light}`,
                  borderRadius: '8px 0 0 8px',
                  transition: 'all 0.3s ease',
                  backgroundColor: 'white',
                  paddingRight: searching ? '50px' : '16px'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = atisaStyles.colors.accent
                  e.target.style.boxShadow = `0 0 0 3px ${atisaStyles.colors.accent}20`
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = atisaStyles.colors.light
                  e.target.style.boxShadow = 'none'
                }}
              />
              {searching && (
                <div
                  style={{
                    position: 'absolute',
                    right: '60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10
                  }}
                >
                  <div
                    className="spinner-border spinner-border-sm"
                    role="status"
                    style={{
                      color: atisaStyles.colors.primary,
                      width: '20px',
                      height: '20px'
                    }}
                  >
                    <span className="visually-hidden">Buscando...</span>
                  </div>
                </div>
              )}
              <button
                className='btn btn-primary'
                type='button'
                style={{
                  backgroundColor: atisaStyles.colors.secondary,
                  border: `2px solid ${atisaStyles.colors.secondary}`,
                  borderRadius: '0 8px 8px 0',
                  height: '48px',
                  padding: '0 20px',
                  fontFamily: atisaStyles.fonts.secondary,
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                  e.currentTarget.style.borderColor = atisaStyles.colors.accent
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                  e.currentTarget.style.borderColor = atisaStyles.colors.secondary
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <i className='bi bi-search' style={{ fontSize: '16px' }}></i>
              </button>
            </div>

            <div style={{ flexShrink: 0, minWidth: '220px' }}>
              <select
                className='form-select'
                value={filtroCalendario}
                onChange={(e) => {
                  setFiltroCalendario(e.target.value as 'todos' | 'con' | 'sin')
                }}
                style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  fontSize: '14px',
                  height: '48px',
                  border: `2px solid ${atisaStyles.colors.light}`,
                  borderRadius: '8px',
                  color: atisaStyles.colors.dark,
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = atisaStyles.colors.accent
                  e.target.style.boxShadow = `0 0 0 3px ${atisaStyles.colors.accent}20`
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = atisaStyles.colors.light
                  e.target.style.boxShadow = 'none'
                }}
              >
                <option value='todos'>Todos</option>
                <option value='con'>Con calendario</option>
                <option value='sin'>Sin calendario</option>
              </select>
            </div>
          </div>
        </div>

        <div
          className='table-responsive'
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
            border: `1px solid ${atisaStyles.colors.light}`,
            overflow: 'hidden'
          }}
        >
          <table
            className='table table-hover table-rounded table-striped border gy-7 gs-7'
            style={{
              fontFamily: atisaStyles.fonts.secondary,
              margin: 0
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: atisaStyles.colors.primary,
                  color: 'white'
                }}
              >
                <th
                  className='cursor-pointer user-select-none'
                  onClick={() => handleSort('cif')}
                  style={{
                    transition: 'all 0.2s',
                    fontFamily: atisaStyles.fonts.primary,
                    fontWeight: 'bold',
                    fontSize: '14px',
                    padding: '16px 12px',
                    border: 'none',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                  }}
                >
                  CIF {getSortIcon('cif')}
                </th>
                <th
                  className='cursor-pointer user-select-none'
                  onClick={() => handleSort('razsoc')}
                  style={{
                    transition: 'all 0.2s',
                    fontFamily: atisaStyles.fonts.primary,
                    fontWeight: 'bold',
                    fontSize: '14px',
                    padding: '16px 12px',
                    border: 'none',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                  }}
                >
                  Empresa {getSortIcon('razsoc')}
                </th>
                <th
                  className='text-end'
                  style={{
                    fontFamily: atisaStyles.fonts.primary,
                    fontWeight: 'bold',
                    fontSize: '14px',
                    padding: '16px 12px',
                    border: 'none',
                    color: 'white'
                  }}
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedClientes.map((cliente, index) => (
                <tr
                  key={cliente.idcliente}
                  style={{
                    backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 80, 92, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f8f9fa'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <td
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      color: atisaStyles.colors.primary,
                      fontWeight: '600',
                      padding: '16px 12px'
                    }}
                  >
                    {cliente.cif || '-'}
                  </td>
                  <td
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      color: atisaStyles.colors.dark,
                      padding: '16px 12px'
                    }}
                  >
                    {cliente.razsoc || cliente.idcliente}
                  </td>
                  <td className='text-end' style={{ padding: '16px 12px' }}>
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'flex-end',
                        alignItems: 'center'
                      }}
                    >
                      {/* Botón Calendario */}
                      {clientesConProcesos.has(cliente.idcliente) && (
                        <div style={{ position: 'relative' }}>
                          <button
                            className='btn btn-icon'
                            title='Ver Calendario'
                            onClick={() => handleCalendarClick(cliente.idcliente)}
                            style={{
                              backgroundColor: atisaStyles.colors.secondary,
                              color: 'white',
                              border: 'none',
                              borderRadius: '10px',
                              width: '42px',
                              height: '42px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.3s ease',
                              fontFamily: atisaStyles.fonts.secondary,
                              boxShadow: '0 2px 8px rgba(156, 186, 57, 0.3)',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                              e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'
                              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 161, 222, 0.4)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                              e.currentTarget.style.transform = 'translateY(0) scale(1)'
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(156, 186, 57, 0.3)'
                            }}
                          >
                            <i className='bi bi-calendar3' style={{ fontSize: '18px', color: 'white' }}></i>
                          </button>
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '-25px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              backgroundColor: atisaStyles.colors.primary,
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontFamily: atisaStyles.fonts.secondary,
                              fontWeight: '600',
                              whiteSpace: 'nowrap',
                              opacity: 0,
                              transition: 'opacity 0.3s ease',
                              pointerEvents: 'none',
                              zIndex: 1000
                            }}
                            className="tooltip-text"
                          >
                            Calendario
                          </div>
                        </div>
                      )}

                      {/* Botón Gestor Documental */}
                      <div style={{ position: 'relative' }}>
                        <button
                          className='btn btn-icon'
                          title='Gestor Documental'
                          onClick={() => navigate(`/gestor-documental/${cliente.idcliente}`)}
                          style={{
                            backgroundColor: atisaStyles.colors.accent,
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            width: '42px',
                            height: '42px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease',
                            fontFamily: atisaStyles.fonts.secondary,
                            boxShadow: '0 2px 8px rgba(0, 161, 222, 0.3)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                            e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 80, 92, 0.4)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                            e.currentTarget.style.transform = 'translateY(0) scale(1)'
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 161, 222, 0.3)'
                          }}
                        >
                          <i className="bi bi-folder2-open" style={{ fontSize: '18px', color: 'white' }}></i>
                        </button>
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '-25px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: atisaStyles.colors.primary,
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontFamily: atisaStyles.fonts.secondary,
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            opacity: 0,
                            transition: 'opacity 0.3s ease',
                            pointerEvents: 'none',
                            zIndex: 1000
                          }}
                          className="tooltip-text"
                        >
                          Documentos
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mostrar paginación siempre que haya datos */}
        {!loading && !error && filteredClientes.length > 0 && (
          <div className='d-flex justify-content-end mt-5'>
            <SharedPagination
              currentPage={page}
              totalItems={totalForPagination}
              pageSize={limit}
              onPageChange={setPage}
            />
          </div>
        )}

        {loading && (
          <div
            className='text-center py-4'
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
              border: `1px solid ${atisaStyles.colors.light}`,
              padding: '40px 24px'
            }}
          >
            <div
              className='spinner-border'
              role='status'
              style={{
                color: atisaStyles.colors.primary,
                width: '3rem',
                height: '3rem'
              }}
            >
              <span className='visually-hidden'>Cargando...</span>
            </div>
            <div
              style={{
                fontFamily: atisaStyles.fonts.secondary,
                color: atisaStyles.colors.dark,
                marginTop: '16px',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              Cargando empresas...
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              color: '#721c24',
              padding: '20px',
              borderRadius: '12px',
              fontFamily: atisaStyles.fonts.secondary,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)'
            }}
          >
            <i className="bi bi-exclamation-triangle me-3" style={{ fontSize: '20px', color: '#721c24' }}></i>
            {error}
          </div>
        )}

        {!loading && !error && clientes.length === 0 && (
          <div
            className='text-center py-4'
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
              border: `1px solid ${atisaStyles.colors.light}`,
              padding: '40px 24px'
            }}
          >
            <i
              className="bi bi-building"
              style={{
                fontSize: '48px',
                color: atisaStyles.colors.light,
                marginBottom: '16px'
              }}
            ></i>
            <div
              style={{
                fontFamily: atisaStyles.fonts.secondary,
                color: atisaStyles.colors.dark,
                fontSize: '18px',
                fontWeight: '500'
              }}
            >
              No se encontraron empresas
            </div>
            <div
              style={{
                fontFamily: atisaStyles.fonts.secondary,
                color: atisaStyles.colors.light,
                fontSize: '14px',
                marginTop: '8px'
              }}
            >
              Intenta ajustar los filtros de búsqueda
            </div>
          </div>
        )}
      </div>



      <CustomToast
        show={toast.show}
        onClose={() => setToast({ ...toast, show: false })}
        message={toast.message}
        type={toast.type}
      />
    </>
  )
}

export default ClientesDocumentalCalendarioList
