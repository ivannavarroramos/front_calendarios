import { FC, useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import CustomToast from '../../components/ui/CustomToast'
import PlantillaModal from './components/PlantillaModal'
import PlantillaProcesosModal from './components/PlantillaProcesosModal'
import { Plantilla, getAllPlantillas, createPlantilla, updatePlantilla, deletePlantilla } from '../../api/plantillas'
import { PlantillaProcesos, getAllPlantillaProcesos, createPlantillaProcesos, deletePlantillaProcesos } from '../../api/plantillaProcesos'
import { Proceso, getAllProcesos } from '../../api/procesos'
import SharedPagination from '../../components/pagination/SharedPagination'
import { atisaStyles, getPrimaryButtonStyles, getSecondaryButtonStyles, getTableHeaderStyles, getTableCellStyles, getBadgeStyles, getDropdownStyles, getActionsButtonStyles } from '../../styles/atisaStyles'
import { Input, Button, ListCard, Pagination } from '../../../../atisa/AtisaComponents'
import PageHeader from '../../components/ui/PageHeader'

const PlantillasList: FC = () => {
  const navigate = useNavigate()
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [allPlantillas, setAllPlantillas] = useState<Plantilla[]>([]) // Todas las plantillas para búsqueda
  const [plantillaEditando, setPlantillaEditando] = useState<Plantilla | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)
  const [sortField, setSortField] = useState<string>('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [plantillaProcesos, setPlantillaProcesos] = useState<PlantillaProcesos[]>([])
  const [showProcesosModal, setShowProcesosModal] = useState(false)
  const [selectedPlantillaForProcesos, setSelectedPlantillaForProcesos] = useState<Plantilla | null>(null)
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null)
  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({})
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info')
  const [showEliminarModal, setShowEliminarModal] = useState(false)
  const [plantillaAEliminar, setPlantillaAEliminar] = useState<Plantilla | null>(null)
  const limit = 10

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
      // No establecer searching en false aquí, se establecerá cuando termine loadAllPlantillas
    }, 300) // 300ms de delay

    return () => {
      clearTimeout(timer)
      if (!searchTerm) {
        setSearching(false)
      }
    }
  }, [searchTerm])

  // Cargar plantillas paginadas cuando NO hay búsqueda
  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      loadAll()
    }
  }, [page, sortField, sortDirection, debouncedSearchTerm])

  // Cargar todas las plantillas cuando hay búsqueda
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      setPage(1) // Resetear a la primera página cuando hay búsqueda
      loadAllPlantillas()
    } else {
      // Limpiar todas las plantillas cuando no hay búsqueda
      setAllPlantillas([])
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
  const handleActionsClick = (plantillaId: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (activeDropdown === plantillaId) {
      setActiveDropdown(null)
      setDropdownPosition(null)
    } else {
      const position = calculateDropdownPosition(event.currentTarget)
      setActiveDropdown(plantillaId)
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
      const [plantillasData, procesosData, plantillaProcesosData] = await Promise.all([
        getAllPlantillas(page, limit, sortField, sortDirection),
        getAllProcesos(),
        getAllPlantillaProcesos()
      ])

      setPlantillas(plantillasData.plantillas)
      setTotal(plantillasData.total)
      setProcesos(procesosData.procesos || [])
      setPlantillaProcesos(plantillaProcesosData.plantillaProcesos || [])
      setError(null) // Limpiar errores previos
    } catch (error: any) {
      // Si es un error 404, mostrar tabla vacía (no hay plantillas)
      if (error?.response?.status === 404) {
        setPlantillas([])
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

  const loadAllPlantillas = async () => {
    try {
      setLoading(true)
      setSearching(true)
      // Cargar todas las plantillas sin paginación para búsqueda
      const plantillasData = await getAllPlantillas()
      setAllPlantillas(plantillasData.plantillas || [])
      // NO cargar datos adicionales durante la búsqueda para mejorar el rendimiento
      // Solo cargar si realmente no están disponibles
      if (procesos.length === 0 || plantillaProcesos.length === 0) {
        const [procesosData, plantillaProcesosData] = await Promise.all([
          getAllProcesos(),
          getAllPlantillaProcesos()
        ])
        setProcesos(procesosData.procesos || [])
        setPlantillaProcesos(plantillaProcesosData.plantillaProcesos || [])
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setAllPlantillas([])
      } else {
        setError('Error al cargar las plantillas')
        console.error('Error:', error)
      }
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  const handleSavePlantilla = async (plantillaData: Omit<Plantilla, 'id'>) => {
    try {
      if (plantillaEditando) {
        const updated = await updatePlantilla(plantillaEditando.id, plantillaData)
        setPlantillas(plantillas.map((p) => (p.id === plantillaEditando.id ? updated : p)))
      } else {
        const created = await createPlantilla(plantillaData)
        setPlantillas([...plantillas, created])
      }
      setShowModal(false)
      if (debouncedSearchTerm.trim()) {
        await loadAllPlantillas()
      } else {
        await loadAll()
      }
    } catch (error) {
      console.error('Error al guardar la plantilla:', error)
    }
  }

  const handleEliminar = (id: number) => {
    const plantilla = plantillas.find(p => p.id === id) || filteredPlantillas.find(p => p.id === id)
    if (plantilla) {
      setPlantillaAEliminar(plantilla)
      setShowEliminarModal(true)
      setActiveDropdown(null)
      setDropdownPosition(null)
    }
  }

  const confirmarEliminar = async () => {
    if (!plantillaAEliminar) return

    try {
      await deletePlantilla(plantillaAEliminar.id)
      if (debouncedSearchTerm.trim()) {
        await loadAllPlantillas()
      } else {
        await loadAll()
      }
      showToastMessage('Plantilla eliminada correctamente', 'success')
    } catch (error: any) {
      // Extraer el mensaje de error del backend
      let errorMessage = 'Error al eliminar la plantilla'
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error?.message) {
        errorMessage = error.message
      }
      showToastMessage(errorMessage, 'error')
    } finally {
      setShowEliminarModal(false)
      setPlantillaAEliminar(null)
    }
  }

  const cancelarEliminar = () => {
    setShowEliminarModal(false)
    setPlantillaAEliminar(null)
  }

  const handleSaveProcesos = async (newRelations: Omit<PlantillaProcesos, 'id'>[]) => {
    try {
      const promises = newRelations.map(relation => createPlantillaProcesos(relation))
      await Promise.all(promises)
      if (debouncedSearchTerm.trim()) {
        await loadAllPlantillas()
      } else {
        await loadAll()
      }
      setShowProcesosModal(false)
    } catch (error) {
      console.error('Error al guardar procesos:', error)
    }
  }

  // Filtrar plantillas usando useMemo para optimizar el rendimiento
  // Función auxiliar para normalizar texto (sin tildes, sin mayúsculas)
  const normalizeText = (text: string | null | undefined): string => {
    if (!text) return ''
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  // Filtrar plantillas usando useMemo para optimizar el rendimiento
  const filteredPlantillas = useMemo(() => {
    // Si hay búsqueda, usar allPlantillas; si no, usar plantillas paginadas
    const plantillasToFilter = debouncedSearchTerm.trim() ? allPlantillas : plantillas

    if (!debouncedSearchTerm || !debouncedSearchTerm.trim()) return plantillasToFilter

    // Normalizar el término de búsqueda (asegurarse de que se convierta a string y luego normalizar)
    const searchTermStr = String(debouncedSearchTerm).trim()
    if (!searchTermStr) return plantillasToFilter

    const searchNormalized = normalizeText(searchTermStr)

    return plantillasToFilter.filter((plantilla) => {
      return Object.values(plantilla).some(value => {
        if (value === null || value === undefined) return false
        const valueNormalized = normalizeText(value.toString())
        return valueNormalized.includes(searchNormalized)
      })
    })
  }, [plantillas, allPlantillas, debouncedSearchTerm])

  // Aplicar paginación a los resultados filtrados
  const paginatedPlantillas = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return filteredPlantillas
    }
    // Cuando hay búsqueda, aplicar paginación a los resultados filtrados
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    return filteredPlantillas.slice(startIndex, endIndex)
  }, [filteredPlantillas, page, limit, debouncedSearchTerm])

  // Calcular el total para la paginación
  const totalForPagination = useMemo(() => {
    return debouncedSearchTerm.trim() ? filteredPlantillas.length : total
  }, [filteredPlantillas.length, total, debouncedSearchTerm])

  const groupedPlantillaProcesos = plantillaProcesos.reduce((groups, pp) => {
    if (!groups[pp.plantilla_id]) {
      groups[pp.plantilla_id] = []
    }
    const proceso = procesos.find(p => p.id === pp.proceso_id)
    if (proceso) {
      groups[pp.plantilla_id].push({ ...pp, procesoData: proceso })
    }
    return groups
  }, {} as Record<number, Array<PlantillaProcesos & { procesoData: Proceso }>>)

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
          title="Gestión de Plantillas"
          subtitle="Configuración y estructura de plantillas base"
          icon="file-earmark-text"
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
                  placeholder='Buscar plantilla...'
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
                onClick={() => {
                  setPlantillaEditando(null)
                  setShowModal(true)
                }}
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
                Nueva Plantilla
              </button>
            </div>
          }
        />

        <div className='card border-0' style={{ boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>

          <div className='p-0'>
            {loading ? (
              <div className='d-flex justify-content-center py-5'>
                <div className='spinner-border text-primary' role='status' style={{ width: '3rem', height: '3rem' }}>
                  <span className='visually-hidden'>Cargando...</span>
                </div>
              </div>
            ) : error ? (
              <div className='alert alert-danger mx-3'>{error}</div>
            ) : (
              <>
                {filteredPlantillas.length === 0 ? (
                  <div className='text-center py-5 mx-3 border border-2 border-dashed rounded-3'>
                    <i className='bi bi-file-earmark-text fs-1 text-muted opacity-50 mb-3 d-block'></i>
                    <h4 className='text-muted'>No se encontraron plantillas</h4>
                    <p className='text-muted small'>Intenta con otro término de búsqueda o crea una nueva.</p>
                  </div>
                ) : (
                  <div className='table-responsive'>
                    <table className='table table-hover align-middle mb-0'>
                      <thead className='bg-light'>
                        <tr className='text-uppercase fs-8 fw-black text-muted' style={{ letterSpacing: '0.05em' }}>
                          <th className='ps-3' onClick={() => handleSort('id')} style={{ cursor: 'pointer' }}>ID {getSortIcon('id')}</th>
                          <th onClick={() => handleSort('nombre')} style={{ cursor: 'pointer' }}>Nombre {getSortIcon('nombre')}</th>
                          <th>Descripción</th>
                          <th>Procesos</th>
                          <th className='text-end pe-3'>Acciones</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '0.825rem' }}>
                        {paginatedPlantillas.map((plantilla) => (
                          <tr key={plantilla.id}>
                            <td className='ps-3 fw-bold text-primary'>{plantilla.id}</td>
                            <td className='fw-bold'>{plantilla.nombre}</td>
                            <td className='text-muted'>{plantilla.descripcion || '-'}</td>
                            <td>
                              <div className='d-flex flex-wrap gap-1'>
                                {groupedPlantillaProcesos[plantilla.id]?.map((pp) => (
                                  <span key={pp.id} className="badge bg-light text-dark border-0 fw-normal" style={{ fontSize: '0.65rem', padding: '0.35em 0.65em' }}>
                                    {pp.procesoData.nombre}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className='text-end pe-3'>
                              <div className='d-flex justify-content-end gap-2'>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  outline
                                  onClick={() => {
                                    setSelectedPlantillaForProcesos(plantilla)
                                    setShowProcesosModal(true)
                                  }}
                                >
                                  Procesos
                                </Button>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={(e) => handleActionsClick(plantilla.id, e as any)}
                                  icon={<i className={`bi ${activeDropdown === plantilla.id ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>}
                                >
                                  Acciones
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {totalForPagination > 0 && (
                  <div className="p-3 border-top">
                    <Pagination
                      currentPage={page}
                      totalPages={Math.ceil(totalForPagination / limit)}
                      onPageChange={setPage}
                      totalItems={totalForPagination}
                      pageSize={limit}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Dropdown Portal */}
          {activeDropdown !== null && dropdownPosition && createPortal(
            <div
              className="dropdown-portal"
              style={{
                position: 'absolute',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                transform: dropdownPosition.placement === 'top' ? 'translateY(-100%)' : 'none',
                backgroundColor: 'white',
                border: `1px solid var(--atisa-border)`,
                borderRadius: '8px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                zIndex: 10000,
                minWidth: '150px',
                padding: '6px'
              }}
            >
              <button
                className="btn btn-sm w-100 text-start d-flex align-items-center gap-2 p-2 fw-bold text-dark"
                style={{ fontSize: '0.75rem', borderRadius: '4px' }}
                onClick={() => {
                  const p = filteredPlantillas.find(x => x.id === activeDropdown);
                  if (p) { setPlantillaEditando(p); setShowModal(true); }
                  setActiveDropdown(null);
                }}
              >
                <i className="bi bi-pencil-square"></i> Editar
              </button>
              <div className="my-1 border-top"></div>
              <button
                className="btn btn-sm w-100 text-start d-flex align-items-center gap-2 p-2 fw-bold text-danger"
                style={{ fontSize: '0.75rem', borderRadius: '4px' }}
                onClick={() => handleEliminar(activeDropdown)}
              >
                <i className="bi bi-trash3"></i> Eliminar
              </button>
            </div>,
            document.body
          )}

          {/* Modals */}
          <PlantillaModal
            show={showModal}
            onHide={() => setShowModal(false)}
            onSave={handleSavePlantilla}
            plantilla={plantillaEditando}
          />

          {selectedPlantillaForProcesos && (
            <PlantillaProcesosModal
              show={showProcesosModal}
              onHide={() => setShowProcesosModal(false)}
              onSave={handleSaveProcesos}
              plantillas={plantillas}
              procesos={procesos}
              selectedPlantillaId={selectedPlantillaForProcesos.id}
              procesosActuales={plantillaProcesos}
            />
          )}

          {showEliminarModal && plantillaAEliminar && (
            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1060 }}>
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px' }}>
                  <div className="modal-header border-0 pb-0">
                    <h5 className="modal-title fw-black" style={{ color: 'var(--atisa-primary)' }}>Confirmar Eliminación</h5>
                    <button type="button" className="btn-close shadow-none" onClick={cancelarEliminar}></button>
                  </div>
                  <div className="modal-body py-4">
                    <p className="mb-0">¿Estás seguro de que deseas eliminar la plantilla <strong>{plantillaAEliminar.nombre}</strong>?</p>
                  </div>
                  <div className="modal-footer border-0 pt-0">
                    <Button onClick={cancelarEliminar} variant="secondary" outline>Cancelar</Button>
                    <Button onClick={confirmarEliminar} variant="danger">Eliminar</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <CustomToast show={showToast} onClose={() => setShowToast(false)} message={toastMessage} type={toastType} />
        </div>
      </div>
    </div>
  )
}

export default PlantillasList
