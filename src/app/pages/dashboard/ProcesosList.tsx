import { FC, useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import CustomToast from '../../components/ui/CustomToast'
import PageHeader from '../../components/ui/PageHeader'
import ProcesoModal from './components/ProcesoModal'
import DocumentalCarpetaProcesoModal from './components/DocumentalCarpetaProcesoModal'
import ProcesoHitosMaestroModal from './components/ProcesoHitosMaestroModal'
import { Proceso, getAllProcesos, createProceso, updateProceso, deleteProceso } from '../../api/procesos'
import { ProcesoHitos, getAllProcesoHitosMaestro, createProcesoHitosMaestro } from '../../api/procesoHitosMaestro'
import { Hito, getAllHitos } from '../../api/hitos'
import SharedPagination from '../../components/pagination/SharedPagination'
import { atisaStyles, getPrimaryButtonStyles, getSecondaryButtonStyles, getTableHeaderStyles, getTableCellStyles, getBadgeStyles, getDropdownStyles, getActionsButtonStyles } from '../../styles/atisaStyles'

const ProcesosList: FC = () => {
  const navigate = useNavigate()
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [allProcesos, setAllProcesos] = useState<Proceso[]>([]) // Todos los procesos para búsqueda
  const [procesoEditando, setProcesoEditando] = useState<Proceso | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const [sortField, setSortField] = useState<string>('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [hitos, setHitos] = useState<Hito[]>([])
  const [procesoHitos, setProcesoHitos] = useState<ProcesoHitos[]>([])
  const [showHitosModal, setShowHitosModal] = useState(false)
  const [selectedProcesoForHitos, setSelectedProcesoForHitos] = useState<Proceso | null>(null)
  const [showCarpetasModal, setShowCarpetasModal] = useState(false)
  const [selectedProcesoForCarpetas, setSelectedProcesoForCarpetas] = useState<Proceso | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null)
  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({})
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info')
  const [showEliminarModal, setShowEliminarModal] = useState(false)
  const [procesoAEliminar, setProcesoAEliminar] = useState<Proceso | null>(null)

  // Función auxiliar para mostrar toasts
  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
  }

  // Debounce para el término de búsqueda
  useEffect(() => {
    if (searchTerm) {
      setSearching(true)
    }

    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      // No establecer searching en false aquí, se establecerá cuando termine loadAllProcesos
    }, 300) // 300ms de delay

    return () => {
      clearTimeout(timer)
      if (!searchTerm) {
        setSearching(false)
      }
    }
  }, [searchTerm])

  // Cargar procesos paginados cuando NO hay búsqueda
  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      loadAll()
    }
  }, [page, sortField, sortDirection, debouncedSearchTerm])

  // Cargar todos los procesos cuando hay búsqueda
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      setPage(1) // Resetear a la primera página cuando hay búsqueda
      loadAllProcesos()
    } else {
      // Limpiar todos los procesos cuando no hay búsqueda
      setAllProcesos([])
    }
  }, [debouncedSearchTerm])

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
  const handleActionsClick = (procesoId: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (activeDropdown === procesoId) {
      setActiveDropdown(null)
      setDropdownPosition(null)
    } else {
      const position = calculateDropdownPosition(event.currentTarget)
      setActiveDropdown(procesoId)
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

  const loadAll = async () => {
    try {
      setLoading(true)
      const [procesosData, hitosData, procesoHitosData] = await Promise.all([
        getAllProcesos(page, limit, sortField, sortDirection),
        getAllHitos(),
        getAllProcesoHitosMaestro()
      ])
      setProcesos(procesosData.procesos)
      setTotal(procesosData.total)
      setHitos(hitosData.hitos || [])
      setProcesoHitos(procesoHitosData.ProcesoHitos || [])
      setError(null) // Limpiar errores previos
    } catch (error: any) {
      // Si es un error 404, mostrar tabla vacía (no hay procesos)
      if (error?.response?.status === 404) {
        setProcesos([])
        setTotal(0)
        setError(null)
      } else {
        // Para otros errores, mostrar mensaje de error
        setError('Error al cargar los datos')
        console.error('Error:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadAllProcesos = async () => {
    try {
      setLoading(true)
      setSearching(true)
      // Cargar todos los procesos sin paginación para búsqueda
      const procesosData = await getAllProcesos()
      setAllProcesos(procesosData.procesos || [])
      // NO cargar datos adicionales durante la búsqueda para mejorar el rendimiento
      // Solo cargar si realmente no están disponibles
      if (hitos.length === 0 || procesoHitos.length === 0) {
        const [hitosData, procesoHitosData] = await Promise.all([
          getAllHitos(),
          getAllProcesoHitosMaestro()
        ])
        setHitos(hitosData.hitos || [])
        setProcesoHitos(procesoHitosData.ProcesoHitos || [])
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setAllProcesos([])
      } else {
        setError('Error al cargar los procesos')
        console.error('Error:', error)
      }
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const handleSaveProceso = async (procesoData: Omit<Proceso, 'id'>) => {
    try {
      if (procesoEditando) {
        const updatedProceso = await updateProceso(procesoEditando.id, procesoData)
        setProcesos(procesos.map((p) => (p.id === procesoEditando.id ? updatedProceso : p)))
      } else {
        const newProceso = await createProceso(procesoData)
        setProcesos([...procesos, newProceso])
      }
      setShowModal(false)
      if (debouncedSearchTerm.trim()) {
        await loadAllProcesos()
      } else {
        await loadAll()
      }
    } catch (error) {
      console.error('Error al guardar el proceso:', error)
    }
  }

  const handleEliminar = (id: number) => {
    const proceso = procesos.find(p => p.id === id) || allProcesos.find(p => p.id === id)
    if (proceso) {
      setProcesoAEliminar(proceso)
      setShowEliminarModal(true)
      setActiveDropdown(null)
      setDropdownPosition(null)
    }
  }

  const confirmarEliminar = async () => {
    if (!procesoAEliminar) return

    try {
      await deleteProceso(procesoAEliminar.id)
      if (debouncedSearchTerm.trim()) {
        await loadAllProcesos()
      } else {
        await loadAll()
      }
      showToastMessage('Proceso eliminado correctamente', 'success')
    } catch (error: any) {
      // Extraer el mensaje de error del backend
      let errorMessage = 'Error al eliminar el proceso'
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error?.message) {
        errorMessage = error.message
      }
      showToastMessage(errorMessage, 'error')
    } finally {
      setShowEliminarModal(false)
      setProcesoAEliminar(null)
    }
  }

  const cancelarEliminar = () => {
    setShowEliminarModal(false)
    setProcesoAEliminar(null)
  }

  const handleCrear = () => {
    setProcesoEditando(null)
    setShowModal(true)
  }

  const handleEditar = (proceso: Proceso) => {
    setProcesoEditando(proceso)
    setShowModal(true)
  }

  const handleSaveHitos = async (newRelations: Omit<ProcesoHitos, 'id'>[]) => {
    try {
      const promises = newRelations.map(relation => createProcesoHitosMaestro(relation))
      await Promise.all(promises)
      if (debouncedSearchTerm.trim()) {
        await loadAllProcesos()
      } else {
        await loadAll()
      }
      setShowHitosModal(false)
    } catch (error) {
      console.error('Error al guardar hitos:', error)
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

  // Filtrar procesos usando useMemo para optimizar el rendimiento
  const filteredProcesos = useMemo(() => {
    // Si hay búsqueda, usar allProcesos; si no, usar procesos paginados
    const procesosToFilter = debouncedSearchTerm.trim() ? allProcesos : procesos

    if (!debouncedSearchTerm || !debouncedSearchTerm.trim()) return procesosToFilter

    // Normalizar el término de búsqueda (asegurarse de que se convierta a string y luego normalizar)
    const searchTermStr = String(debouncedSearchTerm).trim()
    if (!searchTermStr) return procesosToFilter

    const searchNormalized = normalizeText(searchTermStr)

    return procesosToFilter.filter((proceso) => {
      return Object.values(proceso).some(value => {
        if (value === null || value === undefined) return false
        const valueNormalized = normalizeText(value.toString())
        return valueNormalized.includes(searchNormalized)
      })
    })
  }, [procesos, allProcesos, debouncedSearchTerm])

  // Aplicar paginación a los resultados filtrados
  const paginatedProcesos = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return filteredProcesos
    }
    // Cuando hay búsqueda, aplicar paginación a los resultados filtrados
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    return filteredProcesos.slice(startIndex, endIndex)
  }, [filteredProcesos, page, limit, debouncedSearchTerm])

  // Calcular el total para la paginación
  const totalForPagination = useMemo(() => {
    return debouncedSearchTerm.trim() ? filteredProcesos.length : total
  }, [filteredProcesos.length, total, debouncedSearchTerm])

  const groupedProcesoHitos = procesoHitos.reduce((groups, ph) => {
    if (!groups[ph.proceso_id]) {
      groups[ph.proceso_id] = []
    }
    const hito = hitos.find(h => h.id === ph.hito_id)
    if (hito) {
      groups[ph.proceso_id].push({ ...ph, hitoData: hito })
    }
    return groups
  }, {} as Record<number, Array<ProcesoHitos & { hitoData: Hito }>>)

  const handleAddHitos = (proceso: Proceso) => {
    // Filtrar los hitos actuales del proceso seleccionado
    const hitosActualesProceso = procesoHitos.filter(ph => ph.proceso_id === proceso.id)
    setSelectedProcesoForHitos(proceso)
    setShowHitosModal(true)
  }

  const handleConfigurarCarpetas = (proceso: Proceso) => {
    setSelectedProcesoForCarpetas(proceso)
    setShowCarpetasModal(true)
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
          title="Gestión de Procesos"
          subtitle="Configuración y administración de procesos de negocio"
          icon="diagram-3"
          actions={
            <div className="d-flex align-items-center gap-3">
              <div className='position-relative'>
                <i
                  className='bi bi-search position-absolute translate-middle-y top-50 ms-4'
                  style={{ color: atisaStyles.colors.light, zIndex: 1 }}
                ></i>
                <input
                  type='text'
                  className='form-control ps-12'
                  placeholder='Buscar proceso...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    fontFamily: atisaStyles.fonts.secondary,
                    fontSize: '14px',
                    width: '250px',
                    height: '42px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
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
              <button
                type='button'
                className='btn'
                onClick={handleCrear}
                style={{
                  backgroundColor: atisaStyles.colors.secondary,
                  border: `2px solid ${atisaStyles.colors.secondary}`,
                  color: 'white',
                  borderRadius: '8px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 20px',
                  fontWeight: '600'
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
                <i className="bi bi-plus-circle"></i>
                Nuevo Proceso
              </button>
            </div>
          }
        />

        <div className='card border-0' style={{ boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
          <div className='card-body p-0'>
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
                {filteredProcesos.length === 0 ? (
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
                      className='bi bi-diagram-3'
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
                      No hay procesos disponibles
                    </h4>
                    <p
                      style={{
                        fontFamily: atisaStyles.fonts.secondary,
                        color: atisaStyles.colors.dark,
                        margin: 0
                      }}
                    >
                      {debouncedSearchTerm ? 'No se encontraron procesos que coincidan con tu búsqueda.' : 'Comienza creando tu primer proceso.'}
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
                            onClick={() => handleSort('id')}
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
                            ID {getSortIcon('id')}
                          </th>
                          <th
                            className='cursor-pointer user-select-none'
                            onClick={() => handleSort('nombre')}
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
                            Proceso {getSortIcon('nombre')}
                          </th>
                          <th
                            className='cursor-pointer user-select-none'
                            onClick={() => handleSort('descripcion')}
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
                            Descripción {getSortIcon('descripcion')}
                          </th>
                          <th
                            className='cursor-pointer user-select-none'
                            onClick={() => handleSort('temporalidad')}
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
                            Temporalidad {getSortIcon('temporalidad')}
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
                            Hitos Asociados
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
                        {paginatedProcesos.map((proceso, index) => (
                          <tr
                            key={proceso.id}
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
                              {proceso.id}
                            </td>
                            <td style={{
                              ...getTableCellStyles(),
                              color: atisaStyles.colors.dark,
                              fontWeight: '600'
                            }}>
                              {proceso.nombre}
                            </td>
                            <td style={{
                              ...getTableCellStyles(),
                              color: atisaStyles.colors.dark,
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {proceso.descripcion || '-'}
                            </td>
                            <td style={{
                              ...getTableCellStyles(),
                              color: atisaStyles.colors.dark,
                              textTransform: 'capitalize'
                            }}>
                              {proceso.temporalidad}
                            </td>
                            <td style={{
                              ...getTableCellStyles()
                            }}>
                              <div className='d-flex flex-column gap-2' style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {groupedProcesoHitos[proceso.id]?.map((ph) => (
                                  <div key={ph.id} className='d-flex align-items-center justify-content-between'>
                                    <div className='d-flex align-items-center'>
                                      <span
                                        className='badge me-2'
                                        style={getBadgeStyles(!!ph.hitoData.obligatorio)}
                                      >
                                        {ph.hitoData.obligatorio ? '●' : '○'}
                                      </span>
                                      <span style={{ fontSize: '12px' }}>{ph.hitoData.nombre}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td style={{
                              ...getTableCellStyles()
                            }}>
                              <div className='d-flex gap-2'>
                                <button
                                  className='btn btn-sm'
                                  onClick={() => handleAddHitos(proceso)}
                                  style={{
                                    backgroundColor: atisaStyles.colors.accent,
                                    border: `2px solid ${atisaStyles.colors.accent}`,
                                    color: 'white',
                                    fontFamily: atisaStyles.fonts.secondary,
                                    fontWeight: '600',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    transition: 'all 0.3s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                                    e.currentTarget.style.borderColor = atisaStyles.colors.primary
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                                    e.currentTarget.style.borderColor = atisaStyles.colors.accent
                                  }}
                                >
                                  Administrar Hitos
                                </button>
                                <div className='dropdown-container' style={{ position: 'relative', display: 'inline-block' }}>
                                  <button
                                    ref={(el) => (buttonRefs.current[proceso.id] = el)}
                                    className='btn btn-sm'
                                    type='button'
                                    onClick={(e) => handleActionsClick(proceso.id, e)}
                                    style={getActionsButtonStyles()}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                                      e.currentTarget.style.borderColor = atisaStyles.colors.accent
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                                      e.currentTarget.style.borderColor = atisaStyles.colors.primary
                                    }}
                                  >
                                    Acciones
                                    <i className={`bi ${activeDropdown === proceso.id ? 'bi-chevron-up' : 'bi-chevron-down'} ms-1`}></i>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {filteredProcesos.length > 0 && (
                  <SharedPagination
                    currentPage={page}
                    totalItems={totalForPagination}
                    pageSize={limit}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </div>

          {/* Dropdown con portal */}
          {activeDropdown !== null && dropdownPosition && createPortal(
            <div
              className="dropdown-portal"
              style={{
                position: 'absolute',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                transform: dropdownPosition.placement === 'top' ? 'translateY(-100%)' : 'none',
                backgroundColor: 'white',
                border: `2px solid ${atisaStyles.colors.light}`,
                borderRadius: '8px',
                boxShadow: '0 8px 25px rgba(0, 80, 92, 0.3)',
                zIndex: 99999,
                minWidth: '160px',
                maxWidth: '200px'
              }}
            >
              <div
                style={{
                  padding: '8px 0',
                  fontFamily: atisaStyles.fonts.secondary
                }}
              >
                <button
                  onClick={() => {
                    const proceso = filteredProcesos.find(p => p.id === activeDropdown)
                    if (proceso) {
                      handleEditar(proceso)
                    }
                    setActiveDropdown(null)
                    setDropdownPosition(null)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: atisaStyles.colors.primary,
                    fontFamily: atisaStyles.fonts.secondary,
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '0'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                    e.currentTarget.style.color = atisaStyles.colors.accent
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = atisaStyles.colors.primary
                  }}
                >
                  <i className="bi bi-pencil-square me-3" style={{ fontSize: '16px', color: atisaStyles.colors.primary }}></i>
                  Editar
                </button>

                <button
                  onClick={() => {
                    const proceso = filteredProcesos.find(p => p.id === activeDropdown)
                    if (proceso) {
                      handleConfigurarCarpetas(proceso)
                    }
                    setActiveDropdown(null)
                    setDropdownPosition(null)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: atisaStyles.colors.primary,
                    fontFamily: atisaStyles.fonts.secondary,
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '0'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                    e.currentTarget.style.color = atisaStyles.colors.accent
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = atisaStyles.colors.primary
                  }}
                >
                  <i className="bi bi-folder2-open me-3" style={{ fontSize: '16px', color: atisaStyles.colors.primary }}></i>
                  Configurar Carpetas
                </button>

                <div style={{
                  height: '1px',
                  backgroundColor: atisaStyles.colors.light,
                  margin: '4px 0'
                }}></div>

                <button
                  onClick={() => {
                    handleEliminar(activeDropdown)
                    setActiveDropdown(null)
                    setDropdownPosition(null)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: '#dc3545',
                    fontFamily: atisaStyles.fonts.secondary,
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '0'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8d7da'
                    e.currentTarget.style.color = '#721c24'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#dc3545'
                  }}
                >
                  <i className="bi bi-trash3 me-3" style={{ fontSize: '16px', color: 'white' }}></i>
                  Eliminar
                </button>
              </div>
            </div>,
            document.body
          )}

          <ProcesoModal
            show={showModal}
            onHide={() => setShowModal(false)}
            onSave={handleSaveProceso}
            proceso={procesoEditando}
          />

          <ProcesoHitosMaestroModal
            show={showHitosModal}
            onHide={() => setShowHitosModal(false)}
            onSave={handleSaveHitos}
            procesos={procesos}
            hitoMaestro={null}
            hitosActuales={procesoHitos}
            selectedProcesoId={selectedProcesoForHitos?.id || 0}
          />

          <DocumentalCarpetaProcesoModal
            show={showCarpetasModal}
            onHide={() => setShowCarpetasModal(false)}
            proceso={selectedProcesoForCarpetas}
          />

          {/* Custom Toast */}
          <CustomToast
            show={showToast}
            onClose={() => setShowToast(false)}
            message={toastMessage}
            type={toastType}
            delay={5000}
          />
          {/* Modal de confirmación para eliminar */}
          {showEliminarModal && procesoAEliminar && (
            <div
              className="modal fade show d-block"
              tabIndex={-1}
              style={{
                background: 'rgba(0, 80, 92, 0.5)',
                zIndex: 10000,
                backdropFilter: 'blur(2px)'
              }}
            >
              <div className="modal-dialog modal-dialog-centered">
                <div
                  className="modal-content"
                  style={{
                    borderRadius: '16px',
                    border: `2px solid ${atisaStyles.colors.light}`,
                    boxShadow: '0 12px 40px rgba(0, 80, 92, 0.4)',
                    fontFamily: atisaStyles.fonts.secondary,
                    overflow: 'hidden'
                  }}
                >
                  <div
                    className="modal-header"
                    style={{
                      backgroundColor: atisaStyles.colors.error,
                      color: 'white',
                      borderRadius: '14px 14px 0 0',
                      border: 'none',
                      padding: '20px 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <h5
                      className="modal-title"
                      style={{
                        fontFamily: atisaStyles.fonts.primary,
                        fontWeight: 'bold',
                        margin: 0,
                        fontSize: '1.3rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                    >
                      <i className="bi bi-trash3-fill" style={{ color: 'white', fontSize: '1.5rem' }}></i>
                      Confirmar Eliminación
                    </h5>
                    <button
                      type="button"
                      className="btn-close btn-close-white"
                      onClick={cancelarEliminar}
                      style={{
                        filter: 'invert(1)',
                        opacity: 0.8,
                        transition: 'opacity 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.8'
                      }}
                    ></button>
                  </div>
                  <div
                    className="modal-body"
                    style={{
                      padding: '28px 24px',
                      backgroundColor: 'white'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '16px',
                        marginBottom: '20px'
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: '#fee2e2',
                          borderRadius: '50%',
                          width: '48px',
                          height: '48px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <i className="bi bi-exclamation-octagon-fill" style={{ color: atisaStyles.colors.error, fontSize: '24px' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4
                          style={{
                            color: atisaStyles.colors.primary,
                            marginBottom: '16px',
                            fontFamily: atisaStyles.fonts.primary,
                            fontWeight: 'bold',
                            fontSize: '1.2rem'
                          }}
                        >
                          ¿Está seguro de eliminar este proceso?
                        </h4>
                        <div
                          style={{
                            backgroundColor: '#f8f9fa',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            border: `1px solid ${atisaStyles.colors.light}`
                          }}
                        >
                          <p style={{ color: atisaStyles.colors.dark, marginBottom: '0', fontFamily: atisaStyles.fonts.secondary }}>
                            <strong>Proceso:</strong> {procesoAEliminar.nombre}
                          </p>
                        </div>
                        <div
                          className="alert"
                          style={{
                            backgroundColor: '#fee2e2',
                            border: '1px solid #fecaca',
                            color: '#b91c1c',
                            borderRadius: '8px',
                            marginBottom: '0',
                            fontFamily: atisaStyles.fonts.secondary
                          }}
                        >
                          <i className="bi bi-info-circle me-2"></i>
                          <strong>Esta acción eliminará el proceso permanentemente y no se puede deshacer.</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="modal-footer"
                    style={{
                      border: 'none',
                      padding: '20px 24px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '0 0 14px 14px',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '12px'
                    }}
                  >
                    <button
                      type="button"
                      className="btn"
                      onClick={cancelarEliminar}
                      style={{
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: atisaStyles.fonts.secondary,
                        fontWeight: '600',
                        padding: '10px 20px',
                        fontSize: '14px',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(108, 117, 125, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#5a6268'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.3)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#6c757d'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(108, 117, 125, 0.2)'
                      }}
                    >
                      <i className="bi bi-x-circle me-2"></i>
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={confirmarEliminar}
                      style={{
                        backgroundColor: atisaStyles.colors.error,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: atisaStyles.fonts.secondary,
                        fontWeight: '600',
                        padding: '10px 20px',
                        fontSize: '14px',
                        transition: 'all 0.3s ease',
                        boxShadow: `0 2px 8px ${atisaStyles.colors.error}4D`
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.filter = 'brightness(0.9)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = `0 4px 12px ${atisaStyles.colors.error}66`
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = 'none'
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = `0 2px 8px ${atisaStyles.colors.error}4D`
                      }}
                    >
                      <i className="bi bi-trash3 me-2"></i>
                      Confirmar Eliminación
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProcesosList
