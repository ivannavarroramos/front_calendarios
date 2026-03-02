import { FC, useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { KTCard, KTCardBody } from '../../../_metronic/helpers'
import CustomToast from '../../components/ui/CustomToast'
import HitoModal from './components/HitoModal'
import ActualizaMasivaHitosModal from './components/ActualizaMasivaHitosModal'
import { Hito, getAllHitos, createHito, updateHito, deleteHito } from '../../api/hitos'
import { deshabilitarHitosPorHitoDesde, deleteProcesoHitosByHito } from '../../api/clienteProcesoHitos'
import SharedPagination from '../../components/pagination/SharedPagination'
import { atisaStyles } from '../../styles/atisaStyles'
import { formatDateDisplay } from '../../utils/dateFormatter'

const HitosList: FC = () => {
  const navigate = useNavigate()
  const [hitos, setHitos] = useState<Hito[]>([])
  const [allHitos, setAllHitos] = useState<Hito[]>([]) // Todos los hitos para búsqueda
  const [hitoEditando, setHitoEditando] = useState<Hito | null>(null)
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
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null)
  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({})
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info')
  const [showDeshabilitarModal, setShowDeshabilitarModal] = useState(false)
  const [hitoADeshabilitar, setHitoADeshabilitar] = useState<Hito | null>(null)
  const [fechaDesdeDeshabilitar, setFechaDesdeDeshabilitar] = useState('')
  const [showConfirmarDeshabilitar, setShowConfirmarDeshabilitar] = useState(false)
  const [showMassUpdateModal, setShowMassUpdateModal] = useState(false)
  const [hitoMassUpdate, setHitoMassUpdate] = useState<Hito | null>(null)
  const [showEliminarModal, setShowEliminarModal] = useState(false)
  const [hitoAEliminar, setHitoAEliminar] = useState<Hito | null>(null)

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
      // No establecer searching en false aquí, se establecerá cuando termine loadAllHitos
    }, 300) // 300ms de delay

    return () => {
      clearTimeout(timer)
      if (!searchTerm) {
        setSearching(false)
      }
    }
  }, [searchTerm])

  // Cargar hitos paginados cuando NO hay búsqueda
  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      loadHitos()
    }
  }, [page, sortField, sortDirection, debouncedSearchTerm])

  // Cargar todos los hitos cuando hay búsqueda
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      setPage(1) // Resetear a la primera página cuando hay búsqueda
      loadAllHitos()
    } else {
      // Limpiar todos los hitos cuando no hay búsqueda
      setAllHitos([])
    }
  }, [debouncedSearchTerm])

  // Función para calcular la posición del dropdown
  const calculateDropdownPosition = (buttonElement: HTMLButtonElement) => {
    const rect = buttonElement.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const dropdownHeight = 250 // Estimación amortiguada del menú

    const showAbove = rect.bottom + dropdownHeight > viewportHeight

    return {
      top: showAbove ? rect.top + window.scrollY - 4 : rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      placement: showAbove ? 'top' as const : 'bottom' as const
    }
  }

  // Función para manejar el clic en el botón de acciones
  const handleActionsClick = (hitoId: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (activeDropdown === hitoId) {
      setActiveDropdown(null)
      setDropdownPosition(null)
    } else {
      const position = calculateDropdownPosition(event.currentTarget)
      setActiveDropdown(hitoId)
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

  const loadHitos = async () => {
    try {
      setLoading(true)
      const data = await getAllHitos(page, limit, sortField, sortDirection)
      setHitos(data.hitos)
      setTotal(data.total)
      setError(null) // Limpiar errores previos
    } catch (error: any) {
      // Si es un error 404, mostrar tabla vacía (no hay hitos)
      if (error?.response?.status === 404) {
        setHitos([])
        setTotal(0)
        setError(null)
      } else {
        // Para otros errores, mostrar mensaje de error
        setError('Error al cargar los hitos')
        console.error('Error:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadAllHitos = async () => {
    try {
      setLoading(true)
      setSearching(true)
      // Cargar todos los hitos sin paginación para búsqueda
      const data = await getAllHitos()
      setAllHitos(data.hitos || [])
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setAllHitos([])
      } else {
        setError('Error al cargar los hitos')
        console.error('Error:', error)
      }
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const handleSaveHito = async (hitoData: Omit<Hito, 'id'>) => {
    try {
      if (hitoEditando) {
        const updated = await updateHito(hitoEditando.id, hitoData)
        setHitos(hitos.map((h) => (h.id === hitoEditando.id ? updated : h)))
        if (debouncedSearchTerm.trim()) {
          setAllHitos(allHitos.map((h) => (h.id === hitoEditando.id ? updated : h)))
        }
      } else {
        const created = await createHito(hitoData)
        setHitos([...hitos, created])
        if (debouncedSearchTerm.trim()) {
          setAllHitos([...allHitos, created])
        }
      }
      setShowModal(false)
    } catch (error) {
      console.error('Error al guardar el hito:', error)
    }
  }

  const handleEliminar = (id: number) => {
    const hito = hitos.find(h => h.id === id) || allHitos.find(h => h.id === id)
    if (hito) {
      setHitoAEliminar(hito)
      setShowEliminarModal(true)
      setActiveDropdown(null)
      setDropdownPosition(null)
    }
  }

  const confirmarEliminar = async () => {
    if (!hitoAEliminar) return

    try {
      await deleteHito(hitoAEliminar.id)
      setHitos(hitos.filter((hito) => hito.id !== hitoAEliminar.id))
      if (debouncedSearchTerm.trim()) {
        setAllHitos(allHitos.filter((hito) => hito.id !== hitoAEliminar.id))
      }
      showToastMessage('Hito eliminado correctamente', 'success')
    } catch (error: any) {
      // Extraer el mensaje de error del backend
      let errorMessage = 'Error al eliminar el hito'
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error?.message) {
        errorMessage = error.message
      }
      showToastMessage(errorMessage, 'error')
    } finally {
      setShowEliminarModal(false)
      setHitoAEliminar(null)
    }
  }

  const cancelarEliminar = () => {
    setShowEliminarModal(false)
    setHitoAEliminar(null)
  }

  // Funciones para deshabilitar hito
  const abrirModalDeshabilitar = (hito: Hito) => {
    setHitoADeshabilitar(hito)
    // Establecer la fecha actual por defecto
    const fechaActual = new Date().toISOString().split('T')[0]
    setFechaDesdeDeshabilitar(fechaActual)
    setShowDeshabilitarModal(true)
    setActiveDropdown(null)
    setDropdownPosition(null)
  }

  // Función para deshabilitar hito directamente (sin modal)
  const deshabilitarHitoDirecto = async (hito: Hito) => {
    try {
      // Usar la fecha actual como fecha desde la cual deshabilitar
      const fechaActual = new Date().toISOString().split('T')[0]

      // 1. Deshabilitar hitos desde la fecha actual
      try {
        await deshabilitarHitosPorHitoDesde(hito.id, fechaActual)
      } catch (error: any) {
        // Si no hay relaciones, continuar con el proceso
        if (error?.response?.data?.detail?.includes('No se encontraron relaciones')) {
          // No hay relaciones para deshabilitar, continuar con el proceso
        } else {
          throw error
        }
      }

      // 2. Eliminar registros de proceso_hito
      try {
        await deleteProcesoHitosByHito(hito.id)
      } catch (error: any) {
        // Si no hay registros de proceso_hito, continuar con el proceso
        if (error?.response?.data?.detail?.includes('No se encontraron relaciones')) {
          // No hay registros de proceso_hito para eliminar, continuar con el proceso
        } else {
          throw error
        }
      }

      // 3. Actualizar el campo habilitado del hito a 0
      await updateHito(hito.id, {
        ...hito,
        habilitado: 0
      })

      showToastMessage(`Hito "${hito.nombre}" deshabilitado correctamente`, 'success')

      // Recargar la lista de hitos
      if (debouncedSearchTerm.trim()) {
        loadAllHitos()
      } else {
        loadHitos()
      }

    } catch (error: any) {
      console.error('Error al deshabilitar hito:', error)
      let errorMessage = 'Error al deshabilitar el hito'
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error?.message) {
        errorMessage = error.message
      }
      showToastMessage(errorMessage, 'error')
    }
  }

  const cerrarModalDeshabilitar = () => {
    setShowDeshabilitarModal(false)
    setHitoADeshabilitar(null)
    setFechaDesdeDeshabilitar('')
    setShowConfirmarDeshabilitar(false)
  }

  const abrirConfirmacionDeshabilitar = () => {
    if (!fechaDesdeDeshabilitar) {
      showToastMessage('Por favor seleccione una fecha desde la cual deshabilitar', 'warning')
      return
    }
    setShowConfirmarDeshabilitar(true)
  }

  const cancelarDeshabilitar = () => {
    setShowConfirmarDeshabilitar(false)
  }

  const confirmarDeshabilitar = async () => {
    if (!hitoADeshabilitar) return

    try {
      // 1. Deshabilitar hitos desde la fecha especificada
      try {
        await deshabilitarHitosPorHitoDesde(hitoADeshabilitar.id, fechaDesdeDeshabilitar)
      } catch (error: any) {
        // Si no hay relaciones, continuar con el proceso
        if (error?.response?.data?.detail?.includes('No se encontraron relaciones')) {
          // No hay relaciones para deshabilitar, continuar con el proceso
        } else {
          throw error
        }
      }

      // 2. Eliminar registros de proceso_hito
      try {
        await deleteProcesoHitosByHito(hitoADeshabilitar.id)
      } catch (error: any) {
        // Si no hay registros de proceso_hito, continuar con el proceso
        if (error?.response?.data?.detail?.includes('No se encontraron relaciones')) {
          // No hay registros de proceso_hito para eliminar, continuar con el proceso
        } else {
          throw error
        }
      }

      // 3. Actualizar el campo habilitado del hito a 0
      await updateHito(hitoADeshabilitar.id, {
        ...hitoADeshabilitar,
        habilitado: 0
      })

      showToastMessage(`Hito "${hitoADeshabilitar.nombre}" deshabilitado correctamente desde ${fechaDesdeDeshabilitar}`, 'success')
      cerrarModalDeshabilitar()

      // Recargar la lista de hitos
      if (debouncedSearchTerm.trim()) {
        loadAllHitos()
      } else {
        loadHitos()
      }

    } catch (error: any) {
      console.error('Error al deshabilitar hito:', error)
      let errorMessage = 'Error al deshabilitar el hito'
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error?.message) {
        errorMessage = error.message
      }
      showToastMessage(errorMessage, 'error')
    }
  }

  // Función para habilitar hito
  const habilitarHito = async (hito: Hito) => {
    try {
      // Solo actualizar el campo habilitado del hito a 1
      await updateHito(hito.id, {
        ...hito,
        habilitado: 1
      })

      showToastMessage(`Hito "${hito.nombre}" habilitado correctamente`, 'success')

      // Recargar la lista de hitos
      if (debouncedSearchTerm.trim()) {
        loadAllHitos()
      } else {
        loadHitos()
      }

    } catch (error: any) {
      console.error('Error al habilitar hito:', error)
      let errorMessage = 'Error al habilitar el hito'
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error?.message) {
        errorMessage = error.message
      }
      showToastMessage(errorMessage, 'error')
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

  // Filtrar hitos usando useMemo para optimizar el rendimiento
  const filteredHitos = useMemo(() => {
    // Si hay búsqueda, usar allHitos; si no, usar hitos paginados
    const hitosToFilter = debouncedSearchTerm.trim() ? allHitos : hitos

    if (!debouncedSearchTerm || !debouncedSearchTerm.trim()) return hitosToFilter

    // Normalizar el término de búsqueda (asegurarse de que se convierta a string y luego normalizar)
    const searchTermStr = String(debouncedSearchTerm).trim()
    if (!searchTermStr) return hitosToFilter

    const searchNormalized = normalizeText(searchTermStr)

    return hitosToFilter.filter((hito) => {
      return Object.values(hito).some(value => {
        if (value === null || value === undefined) return false
        const valueNormalized = normalizeText(value.toString())
        return valueNormalized.includes(searchNormalized)
      })
    })
  }, [hitos, allHitos, debouncedSearchTerm])

  // Aplicar paginación a los resultados filtrados
  const paginatedHitos = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return filteredHitos
    }
    // Cuando hay búsqueda, aplicar paginación a los resultados filtrados
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    return filteredHitos.slice(startIndex, endIndex)
  }, [filteredHitos, page, limit, debouncedSearchTerm])

  // Calcular el total para la paginación
  const totalForPagination = useMemo(() => {
    return debouncedSearchTerm.trim() ? filteredHitos.length : total
  }, [filteredHitos.length, total, debouncedSearchTerm])

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
                style={{
                  backgroundColor: 'transparent',
                  border: `2px solid white`,
                  color: 'white',
                  fontFamily: atisaStyles.fonts.secondary,
                  fontWeight: '600',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  transition: 'all 0.3s ease'
                }}
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
              <div className='d-flex align-items-center position-relative' style={{ position: 'relative' }}>
                <i
                  className='bi bi-search position-absolute ms-6'
                  style={{ color: atisaStyles.colors.light, zIndex: 1 }}
                ></i>
                <input
                  type='text'
                  className='form-control form-control-solid w-250px ps-14'
                  placeholder='Buscar hito...'
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
                Gestión de Hitos
              </h3>
            </div>

            {/* Derecha: Botón Nuevo */}
            <div className='d-flex gap-2' style={{ justifyContent: 'flex-end' }}>
              <button
                type='button'
                className='btn'
                onClick={() => {
                  setHitoEditando(null)
                  setShowModal(true)
                }}
                style={{
                  backgroundColor: atisaStyles.colors.secondary,
                  border: `2px solid ${atisaStyles.colors.secondary}`,
                  color: 'white',
                  fontFamily: atisaStyles.fonts.secondary,
                  fontWeight: '600',
                  borderRadius: '8px',
                  padding: '8px 16px',
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
                <i className="bi bi-plus-circle me-2"></i>
                Nuevo Hito
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
                borderRadius: '8px'
              }}
            >
              {error}
            </div>
          ) : (
            <>
              {filteredHitos.length === 0 ? (
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
                    className='bi bi-calendar-check'
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
                    No hay hitos disponibles
                  </h4>
                  <p
                    style={{
                      fontFamily: atisaStyles.fonts.secondary,
                      color: atisaStyles.colors.dark,
                      margin: 0
                    }}
                  >
                    {debouncedSearchTerm ? 'No se encontraron hitos que coincidan con tu búsqueda.' : 'Comienza creando tu primer hito.'}
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
                            transition: 'all 0.2s',
                            padding: '16px 8px',
                            borderBottom: `3px solid ${atisaStyles.colors.primary}`,
                            fontFamily: atisaStyles.fonts.primary,
                            fontWeight: 'bold',
                            borderLeft: 'none',
                            borderRight: 'none'
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
                            transition: 'all 0.2s',
                            padding: '16px 8px',
                            borderBottom: `3px solid ${atisaStyles.colors.primary}`,
                            fontFamily: atisaStyles.fonts.primary,
                            fontWeight: 'bold',
                            borderLeft: 'none',
                            borderRight: 'none'
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
                          Nombre {getSortIcon('nombre')}
                        </th>
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('descripcion')}
                          style={{
                            transition: 'all 0.2s',
                            padding: '16px 8px',
                            borderBottom: `3px solid ${atisaStyles.colors.primary}`,
                            fontFamily: atisaStyles.fonts.primary,
                            fontWeight: 'bold',
                            borderLeft: 'none',
                            borderRight: 'none'
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
                          onClick={() => handleSort('fecha_limite')}
                          style={{
                            transition: 'all 0.2s',
                            padding: '16px 8px',
                            borderBottom: `3px solid ${atisaStyles.colors.primary}`,
                            fontFamily: atisaStyles.fonts.primary,
                            fontWeight: 'bold',
                            borderLeft: 'none',
                            borderRight: 'none'
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
                          Fecha Límite {getSortIcon('fecha_limite')}
                        </th>
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('hora_limite')}
                          style={{
                            transition: 'all 0.2s',
                            padding: '16px 8px',
                            borderBottom: `3px solid ${atisaStyles.colors.primary}`,
                            fontFamily: atisaStyles.fonts.primary,
                            fontWeight: 'bold',
                            borderLeft: 'none',
                            borderRight: 'none'
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
                          Hora Límite {getSortIcon('hora_limite')}
                        </th>
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('obligatorio')}
                          style={{
                            transition: 'all 0.2s',
                            padding: '16px 8px',
                            borderBottom: `3px solid ${atisaStyles.colors.primary}`,
                            fontFamily: atisaStyles.fonts.primary,
                            fontWeight: 'bold',
                            borderLeft: 'none',
                            borderRight: 'none'
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
                          Obligatorio {getSortIcon('obligatorio')}
                        </th>
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('critico')}
                          style={{
                            transition: 'all 0.2s',
                            padding: '16px 8px',
                            borderBottom: `3px solid ${atisaStyles.colors.primary}`,
                            fontFamily: atisaStyles.fonts.primary,
                            fontWeight: 'bold',
                            borderLeft: 'none',
                            borderRight: 'none'
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
                          Crítico {getSortIcon('critico')}
                        </th>
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('tipo')}
                          style={{
                            transition: 'all 0.2s',
                            padding: '16px 8px',
                            borderBottom: `3px solid ${atisaStyles.colors.primary}`,
                            fontFamily: atisaStyles.fonts.primary,
                            fontWeight: 'bold',
                            borderLeft: 'none',
                            borderRight: 'none'
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
                          Tipo {getSortIcon('tipo')}
                        </th>
                        <th
                          className='cursor-pointer user-select-none'
                          onClick={() => handleSort('habilitado')}
                          style={{
                            transition: 'all 0.2s',
                            padding: '16px 8px',
                            borderBottom: `3px solid ${atisaStyles.colors.primary}`,
                            fontFamily: atisaStyles.fonts.primary,
                            fontWeight: 'bold',
                            borderLeft: 'none',
                            borderRight: 'none'
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
                          Habilitado {getSortIcon('habilitado')}
                        </th>
                        <th
                          className='text-start'
                          style={{
                            padding: '16px 8px',
                            borderBottom: `3px solid ${atisaStyles.colors.primary}`,
                            fontFamily: atisaStyles.fonts.primary,
                            fontWeight: 'bold',
                            backgroundColor: atisaStyles.colors.light,
                            color: atisaStyles.colors.primary,
                            borderLeft: 'none',
                            borderRight: 'none'
                          }}
                        >
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedHitos.map((hito, index) => (
                        <tr
                          key={hito.id}
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
                            padding: '12px 8px',
                            color: atisaStyles.colors.primary,
                            fontWeight: '600',
                            borderBottom: `1px solid ${atisaStyles.colors.light}`,
                            borderLeft: 'none',
                            borderRight: 'none'
                          }}>
                            {hito.id}
                          </td>
                          <td style={{
                            padding: '12px 8px',
                            color: atisaStyles.colors.dark,
                            fontWeight: '600',
                            borderBottom: `1px solid ${atisaStyles.colors.light}`,
                            borderLeft: 'none',
                            borderRight: 'none'
                          }}>
                            {hito.nombre}
                          </td>
                          <td style={{
                            padding: '12px 8px',
                            color: atisaStyles.colors.dark,
                            borderBottom: `1px solid ${atisaStyles.colors.light}`,
                            borderLeft: 'none',
                            borderRight: 'none',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {hito.descripcion || '-'}
                          </td>
                          <td style={{
                            padding: '12px 8px',
                            color: atisaStyles.colors.dark,
                            borderBottom: `1px solid ${atisaStyles.colors.light}`,
                            borderLeft: 'none',
                            borderRight: 'none'
                          }}>
                            {formatDateDisplay(hito.fecha_limite)}
                          </td>
                          <td style={{
                            padding: '12px 8px',
                            color: atisaStyles.colors.dark,
                            borderBottom: `1px solid ${atisaStyles.colors.light}`,
                            borderLeft: 'none',
                            borderRight: 'none'
                          }}>
                            {hito.hora_limite ? hito.hora_limite.slice(0, 5) : '-'}
                          </td>
                          <td style={{
                            padding: '12px 8px',
                            borderBottom: `1px solid ${atisaStyles.colors.light}`,
                            borderLeft: 'none',
                            borderRight: 'none'
                          }}>
                            <span
                              className='badge'
                              style={{
                                backgroundColor: hito.obligatorio ? atisaStyles.colors.secondary : atisaStyles.colors.accent,
                                color: 'white',
                                fontFamily: atisaStyles.fonts.secondary,
                                fontWeight: '600',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '12px'
                              }}
                            >
                              {hito.obligatorio ? 'Sí' : 'No'}
                            </span>
                          </td>
                          <td style={{
                            padding: '12px 8px',
                            borderBottom: `1px solid ${atisaStyles.colors.light}`,
                            borderLeft: 'none',
                            borderRight: 'none',
                            textAlign: 'center'
                          }}>
                            <span className={`badge ${hito.critico ? 'badge-light-danger' : 'badge-light-info'}`} style={{
                              fontFamily: atisaStyles.fonts.secondary,
                              fontSize: '11px',
                              fontWeight: 'bold',
                              padding: '6px 10px',
                              borderRadius: '6px'
                            }}>
                              {hito.critico ? 'SÍ' : 'NO'}
                            </span>
                          </td>
                          <td style={{
                            padding: '12px 8px',
                            color: atisaStyles.colors.dark,
                            borderBottom: `1px solid ${atisaStyles.colors.light}`,
                            borderLeft: 'none',
                            borderRight: 'none'
                          }}>
                            {hito.tipo}
                          </td>
                          <td style={{
                            padding: '12px 8px',
                            borderBottom: `1px solid ${atisaStyles.colors.light}`,
                            borderLeft: 'none',
                            borderRight: 'none'
                          }}>
                            <span
                              className='badge'
                              style={{
                                backgroundColor: hito.habilitado === 1 ? atisaStyles.colors.secondary : '#6c757d',
                                color: 'white',
                                fontFamily: atisaStyles.fonts.secondary,
                                fontWeight: '600',
                                padding: '6px 12px',
                                borderRadius: '20px',
                                fontSize: '12px'
                              }}
                            >
                              {hito.habilitado === 1 ? 'Sí' : 'No'}
                            </span>
                          </td>
                          <td className='text-start' style={{
                            padding: '12px 8px',
                            borderBottom: `1px solid ${atisaStyles.colors.light}`,
                            borderLeft: 'none',
                            borderRight: 'none',
                            position: 'relative'
                          }}>
                            <div className='dropdown-container' style={{
                              position: 'relative',
                              display: 'inline-block',
                              width: '100%'
                            }}>
                              <button
                                ref={(el) => (buttonRefs.current[hito.id] = el)}
                                className='btn'
                                type='button'
                                onClick={(e) => handleActionsClick(hito.id, e)}
                                style={{
                                  backgroundColor: atisaStyles.colors.primary,
                                  border: `2px solid ${atisaStyles.colors.primary}`,
                                  color: 'white',
                                  fontFamily: atisaStyles.fonts.secondary,
                                  fontWeight: '600',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  transition: 'all 0.3s ease',
                                  cursor: 'pointer'
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
                                Acciones
                                <i className={`bi ${activeDropdown === hito.id ? 'bi-chevron-up' : 'bi-chevron-down'} ms-1`}></i>
                              </button>

                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredHitos.length > 0 && (
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
                  const hito = filteredHitos.find(h => h.id === activeDropdown)
                  if (hito) {
                    setHitoEditando(hito)
                    setShowModal(true)
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
                <i className="bi bi-pencil-square me-3" style={{ fontSize: '16px', color: 'inherit' }}></i>
                Editar
              </button>

              <div style={{
                height: '1px',
                backgroundColor: atisaStyles.colors.light,
                margin: '4px 0'
              }}></div>

              <button
                onClick={() => {
                  const hito = filteredHitos.find(h => h.id === activeDropdown)
                  if (hito) {
                    setHitoMassUpdate(hito)
                    setShowMassUpdateModal(true)
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
                <i className="bi bi-calendar-range me-3" style={{ fontSize: '16px', color: 'inherit' }}></i>
                Actualizar Fecha Límite
              </button>

              <div style={{
                height: '1px',
                backgroundColor: atisaStyles.colors.light,
                margin: '4px 0'
              }}></div>

              <button
                onClick={() => {
                  const hito = filteredHitos.find(h => h.id === activeDropdown)
                  if (hito) {
                    if (hito.habilitado === 1) {
                      abrirModalDeshabilitar(hito)
                    } else {
                      habilitarHito(hito)
                    }
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
                  color: filteredHitos.find(h => h.id === activeDropdown)?.habilitado === 1 ? '#f59e0b' : '#28a745',
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
                  const hito = filteredHitos.find(h => h.id === activeDropdown)
                  if (hito?.habilitado === 1) {
                    e.currentTarget.style.backgroundColor = '#fef3cd'
                    e.currentTarget.style.color = '#856404'
                  } else {
                    e.currentTarget.style.backgroundColor = '#d4edda'
                    e.currentTarget.style.color = '#155724'
                  }
                }}
                onMouseLeave={(e) => {
                  const hito = filteredHitos.find(h => h.id === activeDropdown)
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = hito?.habilitado === 1 ? '#f59e0b' : '#28a745'
                }}
              >
                <i
                  className={`bi ${filteredHitos.find(h => h.id === activeDropdown)?.habilitado === 1 ? 'bi-slash-circle' : 'bi-check-circle'} me-3`}
                  style={{ fontSize: '16px', color: 'inherit' }}
                ></i>
                {filteredHitos.find(h => h.id === activeDropdown)?.habilitado === 1 ? 'Deshabilitar' : 'Habilitar'}
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
                <i className="bi bi-trash3 me-3" style={{ fontSize: '16px', color: 'inherit' }}></i>
                Eliminar
              </button>
            </div>
          </div>,
          document.body
        )}

        <HitoModal
          show={showModal}
          onHide={() => setShowModal(false)}
          onSave={handleSaveHito}
          hito={hitoEditando}
        />

        <ActualizaMasivaHitosModal
          show={showMassUpdateModal}
          onHide={() => setShowMassUpdateModal(false)}
          hito={hitoMassUpdate}
          onSuccess={(msg) => {
            showToastMessage(msg, 'success')
            if (debouncedSearchTerm.trim()) {
              loadAllHitos()
            } else {
              loadHitos()
            }
          }}
          onError={(msg) => showToastMessage(msg, 'error')}
        />

        {/* Modal para deshabilitar hito */}
        {showDeshabilitarModal && hitoADeshabilitar && (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header" style={{ backgroundColor: atisaStyles.colors.primary, color: 'white' }}>
                  <h5 className="modal-title" style={{ color: 'white' }}>
                    <i className="bi bi-slash-circle me-2"></i>
                    Deshabilitar Hito
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={cerrarModalDeshabilitar}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: '600', color: atisaStyles.colors.primary }}>
                      <i className="bi bi-calendar me-2"></i>
                      Hito a deshabilitar
                    </label>
                    <div
                      className="form-control"
                      style={{
                        backgroundColor: '#f8f9fa',
                        border: `2px solid ${atisaStyles.colors.light}`,
                        borderRadius: '6px',
                        fontFamily: atisaStyles.fonts.secondary,
                        fontWeight: '600',
                        color: atisaStyles.colors.primary
                      }}
                    >
                      {hitoADeshabilitar.nombre}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label" style={{ fontWeight: '600', color: atisaStyles.colors.primary }}>
                      <i className="bi bi-calendar-date me-2"></i>
                      Fecha desde la cual deshabilitar <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={fechaDesdeDeshabilitar}
                      onChange={(e) => setFechaDesdeDeshabilitar(e.target.value)}
                      required
                      style={{
                        fontFamily: atisaStyles.fonts.secondary,
                        border: `2px solid ${!fechaDesdeDeshabilitar ? '#ef4444' : atisaStyles.colors.light}`,
                        borderRadius: '6px'
                      }}
                    />
                    {!fechaDesdeDeshabilitar && (
                      <div className="text-danger" style={{ fontSize: '0.875rem', marginTop: '4px' }}>
                        <i className="bi bi-exclamation-circle me-1"></i>
                        Este campo es obligatorio
                      </div>
                    )}
                  </div>

                  <div className="alert alert-warning" style={{ marginBottom: '0' }}>
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    <strong>Advertencia:</strong> Esta acción deshabilitará el hito desde la fecha seleccionado en los calendarios de
                    los clientes y eliminara el hito en los procesos que este asociado.
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={cerrarModalDeshabilitar}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ backgroundColor: '#f59e0b', color: 'white' }}
                    onClick={abrirConfirmacionDeshabilitar}
                    disabled={!fechaDesdeDeshabilitar}
                  >
                    <i className="bi bi-slash-circle me-2"></i>
                    Continuar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación para deshabilitar */}
        {showConfirmarDeshabilitar && hitoADeshabilitar && (
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
                    backgroundColor: '#f59e0b',
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
                    <i className="bi bi-exclamation-triangle-fill" style={{ color: 'white', fontSize: '1.5rem' }}></i>
                    Confirmar Deshabilitación
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={cancelarDeshabilitar}
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
                        backgroundColor: '#fff3cd',
                        borderRadius: '50%',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <i className="bi bi-exclamation-triangle-fill" style={{ color: '#f59e0b', fontSize: '24px' }}></i>
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
                        ¿Está seguro de deshabilitar este hito?
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
                        <p style={{ color: atisaStyles.colors.dark, marginBottom: '8px', fontFamily: atisaStyles.fonts.secondary }}>
                          <strong>Hito:</strong> {hitoADeshabilitar.nombre}
                        </p>
                        <p style={{ color: atisaStyles.colors.dark, marginBottom: '0', fontFamily: atisaStyles.fonts.secondary }}>
                          <strong>Fecha desde:</strong> {fechaDesdeDeshabilitar}
                        </p>
                      </div>
                      <div
                        className="alert"
                        style={{
                          backgroundColor: '#f8d7da',
                          border: '1px solid #f5c6cb',
                          color: '#721c24',
                          borderRadius: '8px',
                          marginBottom: '0',
                          fontFamily: atisaStyles.fonts.secondary
                        }}
                      >
                        <i className="bi bi-info-circle me-2"></i>
                        <strong>Esta acción No se puede deshacer</strong>
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
                    onClick={cancelarDeshabilitar}
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
                    onClick={confirmarDeshabilitar}
                    style={{
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontFamily: atisaStyles.fonts.secondary,
                      fontWeight: '600',
                      padding: '10px 20px',
                      fontSize: '14px',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#d97706'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f59e0b'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    Confirmar Deshabilitación
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación para eliminar */}
        {showEliminarModal && hitoAEliminar && (
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
                        ¿Está seguro de eliminar este hito?
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
                          <strong>Hito:</strong> {hitoAEliminar.nombre}
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
                        <strong>Esta acción eliminará el hito permanentemente y no se puede deshacer.</strong>
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


        {/* Custom Toast */}
        <CustomToast
          show={showToast}
          onClose={() => setShowToast(false)}
          message={toastMessage}
          type={toastType}
          delay={5000}
        />
      </KTCard>
    </div>
  )
}

export default HitosList
