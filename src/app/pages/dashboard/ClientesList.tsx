import React, { FC, useEffect, useState, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { KTCard, KTCardBody } from '../../../_metronic/helpers'
import { Cliente, getAllClientes, getDropdownClientes } from '../../api/clientes'
import { getAllPlantillas, Plantilla } from '../../api/plantillas'
import SharedPagination from '../../components/pagination/SharedPagination'
import ClienteProcesosModal from './components/ClienteProcesosModal'
import { GenerarCalendarioParams } from '../../api/clienteProcesos'
import { getAllProcesos, Proceso } from '../../api/procesos'
import { generarCalendarioClienteProceso, getClienteProcesosByCliente } from '../../api/clienteProcesos'
import { atisaStyles, getPrimaryButtonStyles, getSecondaryButtonStyles, getTableHeaderStyles, getTableCellStyles, getActionsButtonStyles } from '../../styles/atisaStyles'
import CustomToast from '../../components/ui/CustomToast'

const ClientesList: FC = () => {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [allClientes, setAllClientes] = useState<Cliente[]>([]) // Todos los clientes para búsqueda
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1)
  const [total, setTotal] = useState<number>(0)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')
  const [searching, setSearching] = useState(false)
  const [sortField, setSortField] = useState<string>('idcliente')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showModal, setShowModal] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [procesosList, setProcesosList] = useState<Proceso[]>([])
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null)
  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({})
  const [clientesConProcesos, setClientesConProcesos] = useState<Set<string>>(new Set())
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info')
  const [filtroCalendario, setFiltroCalendario] = useState<'todos' | 'con' | 'sin'>('todos')
  const [clientesCalendarioIds, setClientesCalendarioIds] = useState<Set<string>>(new Set())
  const limit = 10

  useEffect(() => {
    loadInitialData()
    loadProcesos()

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

  // Cargar clientes paginados cuando NO hay búsqueda
  useEffect(() => {
    if (!debouncedSearchTerm.trim() && filtroCalendario === 'todos') {
      loadClientes()
    }
  }, [page, sortField, sortDirection, debouncedSearchTerm, filtroCalendario])

  // Cargar todos los clientes cuando hay búsqueda
  useEffect(() => {
    if (debouncedSearchTerm.trim() || filtroCalendario !== 'todos') {
      setPage(1) // Resetear a la primera página cuando hay búsqueda o filtro
      loadAllClientes()
    } else {
      // Limpiar todos los clientes cuando no hay búsqueda
      setAllClientes([])
    }
  }, [debouncedSearchTerm, filtroCalendario])

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
        <span className='ms-1'>
          <i
            className='bi bi-arrow-down-up'
            style={{
              fontSize: '12px',
              color: atisaStyles.colors.primary,
              opacity: 0.6
            }}
          ></i>
        </span>
      )
    }
    return (
      <span className='ms-1'>
        <i
          className={`bi ${sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down'}`}
          style={{
            fontSize: '12px',
            color: 'white',
            fontWeight: 'bold'
          }}
        ></i>
      </span>
    )
  }

  // Función para calcular la posición del dropdown
  const calculateDropdownPosition = (buttonElement: HTMLButtonElement) => {
    const rect = buttonElement.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const dropdownHeight = 250 // Estimación razonable

    const showAbove = rect.bottom + dropdownHeight > viewportHeight

    return {
      top: showAbove ? rect.top + window.scrollY - 4 : rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      placement: showAbove ? 'top' as const : 'bottom' as const
    }
  }

  // Función para manejar el clic en el botón de acciones
  const handleActionsClick = (clienteId: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (activeDropdown === clienteId) {
      setActiveDropdown(null)
      setDropdownPosition(null)
    } else {
      const position = calculateDropdownPosition(event.currentTarget)
      setActiveDropdown(clienteId)
      setDropdownPosition(position)
    }
  }

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDropdown !== null) {
        const target = event.target as HTMLElement
        if (!target.closest('.dropdown-container') && !target.closest('.dropdown-portal')) {
          setActiveDropdown(null)
          setDropdownPosition(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeDropdown])

  const loadInitialData = async () => {
    try {
      const plantillasData = await getAllPlantillas()
      setPlantillas(plantillasData.plantillas || [])
    } catch (error) {
      console.error('Error al cargar plantillas:', error)
    }
  }

  const loadClientes = async () => {
    try {
      setLoading(true)
      const data = await getAllClientes(page, limit, sortField, sortDirection)
      setClientes(data.clientes || [])
      setTotal(data.total)

      // Verificar qué clientes tienen procesos asignados
      if (data.clientes && data.clientes.length > 0) {
        await verificarProcesosDeClientes(data.clientes)
      }
    } catch (error) {
      setError('Error al cargar los clientes')
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
      const nuevosClientesConProcesos = new Set<string>()

      resultados.forEach((resultado) => {
        if (resultado.tieneProcesos) {
          nuevosClientesConProcesos.add(resultado.clienteId)
        }
      })

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

  const loadAllClientes = async () => {
    try {
      setLoading(true)
      setSearching(true)
      // Cargar todos los clientes sin paginación para búsqueda (limit grande para traer todos)
      const data = await getAllClientes(1, 10000)
      setAllClientes(data.clientes || [])

      // NO verificar procesos durante la búsqueda para mejorar el rendimiento
      // Solo usaremos los datos que ya tenemos en clientesConProcesos
      // La verificación se hará cuando se carguen los clientes paginados normalmente
    } catch (error) {
      setError('Error al cargar los clientes')
      console.error('Error:', error)
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const loadProcesos = async () => {
    try {
      const response = await getAllProcesos()
      setProcesosList(response.procesos || [])
    } catch (error) {
      console.error('Error al cargar procesos:', error)
    }
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

  // Filtrar clientes usando useMemo para optimizar el rendimiento (por múltiples campos)
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
        // Buscar en múltiples campos
        const searchFields = [
          cliente.razsoc,
          cliente.cif
        ]

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
    // Cuando hay búsqueda o filtro, aplicar paginación a los resultados filtrados
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    return filteredClientes.slice(startIndex, endIndex)
  }, [filteredClientes, page, limit, debouncedSearchTerm, filtroCalendario])

  // Verificar procesos para los clientes visibles en la página actual (solo cuando hay búsqueda)
  useEffect(() => {
    if ((debouncedSearchTerm.trim() || filtroCalendario !== 'todos') && paginatedClientes.length > 0) {
      // Verificar procesos solo para los clientes visibles en la página actual
      // Esto asegura que los botones "Editar Calendario" aparezcan correctamente durante la búsqueda
      verificarProcesosDeClientes(paginatedClientes)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginatedClientes, debouncedSearchTerm, filtroCalendario])

  // Calcular el total para la paginación
  const totalForPagination = useMemo(() => {
    return (debouncedSearchTerm.trim() || filtroCalendario !== 'todos') ? filteredClientes.length : total
  }, [filteredClientes.length, total, debouncedSearchTerm, filtroCalendario])

  const handleOpenModal = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedCliente(null)
  }

  const handleSaveClienteProceso = async (calendarios: GenerarCalendarioParams[]) => {
    try {
      for (const calendario of calendarios) {
        await generarCalendarioClienteProceso(calendario)
      }

      // Actualizar el estado para mostrar los botones inmediatamente
      if (selectedCliente && calendarios.length > 0) {
        setClientesConProcesos(prev => {
          const nuevo = new Set(prev)
          nuevo.add(selectedCliente.idcliente)
          return nuevo
        })
      }

      handleCloseModal()
      loadClientes() // Recargar la lista después de guardar

      // Mostrar éxito
      setToastMessage('Calendario generado correctamente')
      setToastType('success')
      setShowToast(true)

    } catch (error: any) {
      console.error('Error al guardar los procesos:', error)
      const detail = error.response?.data?.detail
      if (detail) {
        setToastMessage(detail)
        setToastType('error')
        setShowToast(true)
      } else {
        setToastMessage('Error al generar el calendario. Por favor, inténtelo de nuevo.')
        setToastType('error')
        setShowToast(true)
      }
    }
  }

  return (
    <div style={{
      fontFamily: atisaStyles.fonts.secondary,
      boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
      border: `1px solid ${atisaStyles.colors.light}`,
      borderRadius: '12px',
      overflow: 'hidden',
      margin: 0,
      width: '100%'
    }}>
      <KTCard>
        <div
          className='card-header border-0 pt-6'
          style={{
            background: 'linear-gradient(135deg, #00505c 0%, #007b8a 100%)',
            color: 'white',
            borderRadius: '8px 8px 0 0',
            margin: 0,
            padding: '24px 16px'
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '1rem', width: '100%' }}>
            {/* Izquierda: Botón Volver + Buscador */}
            <div className='d-flex align-items-center gap-3' style={{ justifyContent: 'flex-start' }}>
              <button
                type='button'
                className='btn'
                onClick={() => navigate('/dashboard')}
                style={getSecondaryButtonStyles()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                  e.currentTarget.style.color = atisaStyles.colors.primary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'white'
                }}
              >
                <i className="bi bi-arrow-left me-2"></i>
                Volver a Dashboard
              </button>
              <div className='d-flex align-items-center gap-2'>
                <div className='d-flex align-items-center position-relative' style={{ position: 'relative' }}>
                  <i
                    className='bi bi-search position-absolute ms-6'
                    style={{ color: atisaStyles.colors.light, zIndex: 1 }}
                  ></i>
                  <input
                    type='text'
                    className='form-control form-control-solid w-250px ps-14'
                    placeholder='Buscar por Razón Social o CIF...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      backgroundColor: 'white',
                      border: `2px solid ${atisaStyles.colors.light}`,
                      borderRadius: '8px',
                      fontFamily: atisaStyles.fonts.secondary,
                      fontSize: '14px',
                      paddingRight: searching ? '50px' : '16px'
                    }}
                  />
                  {searching && (
                    <div
                      style={{
                        position: 'absolute',
                        right: '12px',
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
                </div>

                <div style={{ flexShrink: 0, minWidth: '180px' }}>
                  <select
                    className='form-select'
                    value={filtroCalendario}
                    onChange={(e) => {
                      setFiltroCalendario(e.target.value as 'todos' | 'con' | 'sin')
                    }}
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      fontSize: '13px',
                      height: '43px',
                      border: 'none',
                      borderRadius: '8px',
                      color: atisaStyles.colors.dark,
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    <option value='todos'>Todos</option>
                    <option value='con'>Con calendario</option>
                    <option value='sin'>Sin calendario</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Centro: Título */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <h3 style={{
                fontFamily: atisaStyles.fonts.primary,
                fontWeight: 'bold',
                color: 'white',
                margin: 0,
                whiteSpace: 'nowrap',
                fontSize: '2rem'
              }}>
                Gestión de Clientes
              </h3>
            </div>

            {/* Derecha: Botón Auditoría Global */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type='button'
                className='btn btn-sm'
                id='btn-auditoria-global'
                onClick={() => navigate('/auditoria-general')}
                style={{
                  backgroundColor: atisaStyles.colors.primary,
                  border: `2px solid ${atisaStyles.colors.primary}`,
                  color: 'white',
                  fontFamily: atisaStyles.fonts.secondary,
                  fontWeight: '600',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                  e.currentTarget.style.borderColor = atisaStyles.colors.secondary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                  e.currentTarget.style.borderColor = atisaStyles.colors.primary
                }}
              >
                <i className="bi bi-shield-check me-2"></i>
                Ver historial global
              </button>
            </div>
          </div>
        </div>
        <KTCardBody className='p-0'>
          {loading ? (
            <div className='d-flex justify-content-center py-5'>
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
            </div>
          ) : error ? (
            <div
              className='alert alert-danger'
              style={{
                backgroundColor: '#f8d7da',
                border: `1px solid #f5c6cb`,
                color: '#721c24',
                fontFamily: atisaStyles.fonts.secondary,
                borderRadius: '8px',
                margin: '16px'
              }}
            >
              {error}
            </div>
          ) : (
            <>
              {filteredClientes.length === 0 ? (
                <div
                  className='text-center py-5'
                  style={{
                    backgroundColor: atisaStyles.colors.light,
                    borderRadius: '0',
                    border: `2px dashed ${atisaStyles.colors.primary}`,
                    padding: '40px 20px',
                    margin: 0,
                    width: '100%'
                  }}
                >
                  <i
                    className='bi bi-people'
                    style={{
                      fontSize: '48px',
                      color: atisaStyles.colors.primary,
                      marginBottom: '16px'
                    }}
                  ></i>
                  <h4
                    style={{
                      fontFamily: atisaStyles.fonts.primary,
                      color: atisaStyles.colors.primary,
                      marginBottom: '8px'
                    }}
                  >
                    No hay clientes disponibles
                  </h4>
                  <p
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      color: atisaStyles.colors.dark,
                      margin: 0
                    }}
                  >
                    {debouncedSearchTerm ? 'No se encontraron clientes con esa razón social.' : 'No hay clientes registrados en el sistema.'}
                  </p>
                </div>
              ) : (
                <div className='table-responsive' style={{ margin: 0 }}>
                  <table
                    className='table align-middle table-row-dashed fs-6 gy-0'
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      borderCollapse: 'separate',
                      borderSpacing: '0',
                      margin: 0,
                      width: '100%'
                    }}
                  >
                    <thead>
                      <tr
                        className='text-start fw-bold fs-7 text-uppercase gs-0'
                        style={{
                          backgroundColor: atisaStyles.colors.light,
                          color: atisaStyles.colors.primary
                        }}
                      >
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('idcliente')}
                          style={{
                            ...getTableHeaderStyles(),
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                            e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                            e.currentTarget.style.color = atisaStyles.colors.primary
                          }}
                        >
                          ID {getSortIcon('idcliente')}
                        </th>
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('cif')}
                          style={{
                            ...getTableHeaderStyles(),
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                            e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                            e.currentTarget.style.color = atisaStyles.colors.primary
                          }}
                        >
                          CIF {getSortIcon('cif')}
                        </th>
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('razsoc')}
                          style={{
                            ...getTableHeaderStyles(),
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                            e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                            e.currentTarget.style.color = atisaStyles.colors.primary
                          }}
                        >
                          Razón Social {getSortIcon('razsoc')}
                        </th>
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('direccion')}
                          style={{
                            ...getTableHeaderStyles(),
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                            e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                            e.currentTarget.style.color = atisaStyles.colors.primary
                          }}
                        >
                          Dirección {getSortIcon('direccion')}
                        </th>
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('localidad')}
                          style={{
                            ...getTableHeaderStyles(),
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                            e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                            e.currentTarget.style.color = atisaStyles.colors.primary
                          }}
                        >
                          Localidad {getSortIcon('localidad')}
                        </th>
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('provincia')}
                          style={{
                            ...getTableHeaderStyles(),
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                            e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                            e.currentTarget.style.color = atisaStyles.colors.primary
                          }}
                        >
                          Provincia {getSortIcon('provincia')}
                        </th>
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('cpostal')}
                          style={{
                            ...getTableHeaderStyles(),
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                            e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                            e.currentTarget.style.color = atisaStyles.colors.primary
                          }}
                        >
                          C.P. {getSortIcon('cpostal')}
                        </th>
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('pais')}
                          style={{
                            ...getTableHeaderStyles(),
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                            e.currentTarget.style.color = 'white'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                            e.currentTarget.style.color = atisaStyles.colors.primary
                          }}
                        >
                          País {getSortIcon('pais')}
                        </th>
                        <th
                          style={{
                            ...getTableHeaderStyles(),
                            fontFamily: atisaStyles.fonts.primary,
                            fontWeight: 'bold',
                            backgroundColor: atisaStyles.colors.light,
                            color: atisaStyles.colors.primary
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
                            fontFamily: atisaStyles.fonts.secondary,
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
                          <td style={{
                            ...getTableCellStyles(),
                            color: atisaStyles.colors.primary,
                            fontWeight: '600'
                          }}>
                            {cliente.idcliente}
                          </td>
                          <td style={{
                            ...getTableCellStyles(),
                            color: atisaStyles.colors.dark,
                            fontWeight: '600'
                          }}>
                            {cliente.cif || '-'}
                          </td>
                          <td style={{
                            ...getTableCellStyles(),
                            color: atisaStyles.colors.dark,
                            fontWeight: '600',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {cliente.razsoc || '-'}
                          </td>
                          <td style={{
                            ...getTableCellStyles(),
                            color: atisaStyles.colors.dark,
                            maxWidth: '150px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {cliente.direccion || '-'}
                          </td>
                          <td style={{
                            ...getTableCellStyles(),
                            color: atisaStyles.colors.dark
                          }}>
                            {cliente.localidad || '-'}
                          </td>
                          <td style={{
                            ...getTableCellStyles(),
                            color: atisaStyles.colors.dark
                          }}>
                            {cliente.provincia || '-'}
                          </td>
                          <td style={{
                            ...getTableCellStyles(),
                            color: atisaStyles.colors.dark
                          }}>
                            {cliente.cpostal || '-'}
                          </td>
                          <td style={{
                            ...getTableCellStyles(),
                            color: atisaStyles.colors.dark
                          }}>
                            {cliente.pais || '-'}
                          </td>
                          <td style={{
                            ...getTableCellStyles()
                          }}>
                            <div className='d-flex gap-2'>
                              <button
                                className='btn btn-sm'
                                onClick={() => handleOpenModal(cliente)}
                                style={{
                                  backgroundColor: atisaStyles.colors.secondary,
                                  border: `2px solid ${atisaStyles.colors.secondary}`,
                                  color: 'white',
                                  fontFamily: atisaStyles.fonts.secondary,
                                  fontWeight: '600',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '11px',
                                  transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                                  e.currentTarget.style.borderColor = atisaStyles.colors.accent
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                                  e.currentTarget.style.borderColor = atisaStyles.colors.secondary
                                }}
                              >
                                <i className='bi bi-plus-circle me-2'></i>
                                Generar Calendario
                              </button>
                              {clientesConProcesos.has(cliente.idcliente) && (
                                <button
                                  className='btn btn-sm'
                                  onClick={() => navigate(`/edicion-calendario/${cliente.idcliente}`)}
                                  style={{
                                    backgroundColor: atisaStyles.colors.primary,
                                    border: `2px solid ${atisaStyles.colors.primary}`,
                                    color: 'white',
                                    fontFamily: atisaStyles.fonts.secondary,
                                    fontWeight: '600',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    transition: 'all 0.3s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
                                    e.currentTarget.style.borderColor = atisaStyles.colors.secondary
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                                    e.currentTarget.style.borderColor = atisaStyles.colors.primary
                                  }}
                                >
                                  <i className='bi bi-pencil-square me-2'></i>
                                  Editar Calendario
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredClientes.length > 0 && (
                <SharedPagination
                  currentPage={page}
                  totalItems={totalForPagination}
                  pageSize={limit}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </KTCardBody>
      </KTCard>

      <ClienteProcesosModal
        show={showModal}
        onHide={handleCloseModal}
        onSave={handleSaveClienteProceso}
        plantillas={plantillas}
        selectedCliente={selectedCliente}
        procesosList={procesosList}
      />

      <CustomToast
        show={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  )
}

export default ClientesList
