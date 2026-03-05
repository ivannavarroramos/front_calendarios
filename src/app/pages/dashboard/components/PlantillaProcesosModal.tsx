import { FC, useState, useEffect, useCallback, useMemo } from 'react'
import { Modal, Alert, Spinner } from 'react-bootstrap'
import { PlantillaProcesos } from '../../../api/plantillaProcesos'
import { Plantilla } from '../../../api/plantillas'
import { Proceso } from '../../../api/procesos'
import SharedPagination from '../../../components/pagination/SharedPagination'
import { deletePlantillaProcesos } from '../../../api/plantillaProcesos'
import { atisaStyles, getTableHeaderStyles, getTableCellStyles } from '../../../styles/atisaStyles'

interface Props {
  show: boolean
  onHide: () => void
  onSave: (plantillaProceso: Omit<PlantillaProcesos, 'id'>[]) => void
  plantillas: Plantilla[]
  procesos?: Proceso[]
  selectedPlantillaId?: number
  procesosActuales?: PlantillaProcesos[]
}

const PlantillaProcesosModal: FC<Props> = ({
  show,
  onHide,
  onSave,
  plantillas,
  procesos = [], // Aseguramos valor por defecto
  selectedPlantillaId = 0,
  procesosActuales = []
}) => {
  const [selectedProcesos, setSelectedProcesos] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const itemsPerPage = 5 // Cambiado de 10 a 5

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset a primera página al buscar
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    if (show) {
      if (selectedPlantillaId) {
        // Obtener los procesos actuales de la plantilla
        const procesosDePlantilla = procesosActuales
          .filter(p => p.plantilla_id === selectedPlantillaId)
          .map(p => p.proceso_id)
        setSelectedProcesos(procesosDePlantilla)
      } else {
        setSelectedProcesos([])
      }
      // Limpiar mensajes de estado
      setError(null)
      setSuccess(null)
    } else {
      // Limpiar estados cuando se cierra el modal
      setSearchTerm('')
      setDebouncedSearchTerm('')
      setCurrentPage(1)
      setError(null)
      setSuccess(null)
    }
  }, [selectedPlantillaId, procesosActuales, show])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPlantillaId) {
      setError('No se ha seleccionado una plantilla válida')
      return
    }

    if (selectedProcesos.length === 0) {
      setError('Por favor selecciona al menos un proceso')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Primero eliminar todos los procesos actuales de la plantilla
      const procesosABorrar = procesosActuales.filter(p => p.plantilla_id === selectedPlantillaId)
      await Promise.all(procesosABorrar.map(p => deletePlantillaProcesos(p.id)))

      // Luego crear las nuevas relaciones
      const newRelations = selectedProcesos.map(procesoId => ({
        plantilla_id: selectedPlantillaId,
        proceso_id: procesoId
      }))

      await onSave(newRelations)
      setSuccess('Procesos asignados correctamente')

      // Cerrar modal después de un breve delay para mostrar el mensaje de éxito
      setTimeout(() => {
        onHide()
      }, 1500)

    } catch (error) {
      console.error('Error al actualizar procesos:', error)
      setError('Error al asignar procesos. Por favor intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }, [selectedPlantillaId, selectedProcesos, procesosActuales, onSave, onHide])

  // Filtrar y paginar procesos con debounce
  const filteredProcesos = useMemo(() => {
    return procesos.filter(proceso =>
      proceso.nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (proceso.descripcion || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
  }, [procesos, debouncedSearchTerm])

  const currentProcesos = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    return filteredProcesos.slice(indexOfFirstItem, indexOfLastItem)
  }, [filteredProcesos, currentPage, itemsPerPage])

  const totalItems = filteredProcesos.length

  // Obtener el nombre de la plantilla actual
  const plantillaActual = useMemo(() => {
    return plantillas.find(p => p.id === selectedPlantillaId)
  }, [plantillas, selectedPlantillaId])

  // Manejar selección de todos los procesos de la página actual
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const newSelected = [...new Set([...selectedProcesos, ...currentProcesos.map(p => p.id)])]
      setSelectedProcesos(newSelected)
    } else {
      const currentIds = new Set(currentProcesos.map(p => p.id))
      setSelectedProcesos(selectedProcesos.filter(id => !currentIds.has(id)))
    }
  }, [selectedProcesos, currentProcesos])

  // Manejar selección individual de proceso
  const handleProcessToggle = useCallback((procesoId: number, checked: boolean) => {
    if (checked) {
      setSelectedProcesos([...selectedProcesos, procesoId])
    } else {
      setSelectedProcesos(selectedProcesos.filter(id => id !== procesoId))
    }
  }, [selectedProcesos])

  return (
    <Modal
      show={show}
      onHide={onHide}
      size='lg'
      backdrop="static"
      keyboard={false}
      style={{
        fontFamily: atisaStyles.fonts.secondary
      }}
      aria-labelledby="plantilla-procesos-modal-title"
      aria-describedby="plantilla-procesos-modal-description"
    >
      <Modal.Header
        style={{
          background: 'linear-gradient(135deg, #00505c 0%, #007b8a 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px 12px 0 0',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Modal.Title
          id="plantilla-procesos-modal-title"
          style={{
            fontFamily: atisaStyles.fonts.primary,
            fontWeight: 'bold',
            color: 'white',
            fontSize: '1.5rem',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <i className="bi bi-diagram-3 me-2" style={{ color: 'white' }}></i>
          Asignar Procesos
        </Modal.Title>
        <div
          className='btn btn-icon btn-sm'
          onClick={onHide}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <i className="bi bi-x" style={{ color: 'white', fontSize: '16px' }}></i>
        </div>
      </Modal.Header>
      <Modal.Body
        id="plantilla-procesos-modal-description"
        style={{
          backgroundColor: 'white',
          padding: '24px',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}
      >
        {/* Mensajes de estado */}
        {error && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setError(null)}
            style={{
              borderRadius: '8px',
              fontFamily: atisaStyles.fonts.secondary,
              marginBottom: '20px'
            }}
          >
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setSuccess(null)}
            style={{
              borderRadius: '8px',
              fontFamily: atisaStyles.fonts.secondary,
              marginBottom: '20px'
            }}
          >
            <i className="bi bi-check-circle me-2"></i>
            {success}
          </Alert>
        )}

        {/* Información de la Plantilla Actual */}
        <div className='mb-4'>
          <div
            style={{
              backgroundColor: '#f8f9fa',
              padding: '16px 20px',
              borderRadius: '8px',
              border: `1px solid ${atisaStyles.colors.light}`,
              marginBottom: '20px'
            }}
          >
            <div className='d-flex align-items-center'>
              <i
                className="bi bi-file-earmark-text me-3"
                style={{
                  color: atisaStyles.colors.primary,
                  fontSize: '20px'
                }}
              ></i>
              <div>
                <h6
                  style={{
                    color: atisaStyles.colors.primary,
                    fontFamily: atisaStyles.fonts.primary,
                    fontWeight: 'bold',
                    margin: 0,
                    fontSize: '16px'
                  }}
                >
                  Plantilla Seleccionada
                </h6>
                <p
                  style={{
                    color: atisaStyles.colors.dark,
                    margin: 0,
                    fontSize: '14px'
                  }}
                >
                  {plantillaActual?.nombre || 'Plantilla no encontrada'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className='d-flex align-items-center position-relative my-1'>
          <i
            className='bi bi-search position-absolute'
            style={{
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: atisaStyles.colors.primary,
              fontSize: '16px',
              zIndex: 10
            }}
          ></i>
          <input
            type='text'
            className='form-control form-control-solid ps-14'
            placeholder='Buscar proceso...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: `2px solid ${atisaStyles.colors.light}`,
              borderRadius: '8px',
              fontFamily: atisaStyles.fonts.secondary,
              fontSize: '14px',
              paddingLeft: '48px',
              height: '48px',
              width: '100%',
              maxWidth: '400px'
            }}
            aria-label="Buscar proceso"
          />
        </div>

        {/* Contador de resultados */}
        <div className='mb-3'>
          <small
            style={{
              color: atisaStyles.colors.dark,
              fontFamily: atisaStyles.fonts.secondary,
              fontSize: '12px'
            }}
          >
            {totalItems > 0 ? (
              <>
                Mostrando {currentProcesos.length} de {totalItems} procesos
                {selectedProcesos.length > 0 && (
                  <span style={{ color: atisaStyles.colors.secondary, fontWeight: '600' }}>
                    {' '}• {selectedProcesos.length} seleccionados
                  </span>
                )}
              </>
            ) : (
              'No se encontraron procesos'
            )}
          </small>
        </div>

        <div
          className='table-responsive border rounded-3 position-relative'
          style={{
            borderRadius: '12px',
            borderColor: atisaStyles.colors.light,
            overflow: 'hidden'
          }}
        >
          <table
            className='table align-middle table-row-dashed fs-6 gy-5'
            style={{
              fontFamily: atisaStyles.fonts.secondary,
              margin: 0,
              width: '100%'
            }}
            role="table"
            aria-label="Lista de procesos disponibles"
          >
            <thead>
              <tr
                className="fw-bold fs-6"
              >
                <th
                  className="ps-4 w-50px py-3" style={getTableHeaderStyles()}
                  scope="col"
                >
                  <div className='form-check form-check-sm form-check-custom form-check-solid'>
                    <input
                      className='form-check-input'
                      type='checkbox'
                      checked={currentProcesos.length > 0 && currentProcesos.every(p => selectedProcesos.includes(p.id))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      style={{
                        border: `1px solid ${atisaStyles.colors.primary}`
                      }}
                      aria-label="Seleccionar todos los procesos de esta página"
                    />
                  </div>
                </th>
                <th
                  scope="col"
                  className="py-3" style={getTableHeaderStyles()}
                >
                  Proceso
                </th>
                <th
                  scope="col"
                  className="py-3" style={getTableHeaderStyles()}
                >
                  Descripción
                </th>
              </tr>
            </thead>
            <tbody>
              {currentProcesos.length > 0 ? (
                currentProcesos.map((proceso, index) => {
                  const isSelected = selectedProcesos.includes(proceso.id);
                  return (
                    <tr
                      key={proceso.id}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'rgba(156, 186, 57, 0.15)' : (index % 2 === 0 ? 'white' : '#f8f9fa'),
                        transition: 'all 0.2s ease'
                      }}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).tagName !== 'INPUT') {
                          handleProcessToggle(proceso.id, !isSelected)
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 80, 92, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f8f9fa'
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }
                      }}
                    >
                      <td className='ps-4' style={{ ...getTableCellStyles(), borderBottom: `1px solid ${atisaStyles.colors.light}` }}>
                        <div className='form-check form-check-sm form-check-custom form-check-solid'>
                          <input
                            className='form-check-input'
                            type='checkbox'
                            checked={selectedProcesos.includes(proceso.id)}
                            onChange={(e) => handleProcessToggle(proceso.id, e.target.checked)}
                            aria-label={`Seleccionar proceso ${proceso.nombre}`}
                          />
                        </div>
                      </td>
                      <td
                        style={{ ...getTableCellStyles(), borderBottom: `1px solid ${atisaStyles.colors.light}` }}
                      >
                        <span
                          className={`fw-bold fs-6`}
                          style={{ color: isSelected ? atisaStyles.colors.secondary : atisaStyles.colors.primary }}
                        >
                          {proceso.nombre}
                        </span>
                      </td>
                      <td
                        style={{ ...getTableCellStyles(), borderBottom: `1px solid ${atisaStyles.colors.light}` }}
                      >
                        {proceso.descripcion || '-'}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      textAlign: 'center',
                      padding: '40px 20px',
                      color: atisaStyles.colors.dark,
                      fontFamily: atisaStyles.fonts.secondary,
                      fontSize: '14px'
                    }}
                  >
                    <i className="bi bi-search me-2"></i>
                    {debouncedSearchTerm ? 'No se encontraron procesos que coincidan con la búsqueda' : 'No hay procesos disponibles'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          className="mt-4 d-flex justify-content-between align-items-center flex-wrap"
        >
          <div className="text-gray-600 fs-7" style={{ fontFamily: atisaStyles.fonts.secondary }}>
            Mostrando <span className="fw-bold text-dark">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="fw-bold text-dark">{Math.min(currentPage * itemsPerPage, totalItems)}</span> de <span className="fw-bold text-dark">{totalItems}</span> registros
          </div>

          <SharedPagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </Modal.Body>
      <Modal.Footer
        style={{
          backgroundColor: '#f8f9fa',
          border: 'none',
          borderRadius: '0 0 12px 12px',
          padding: '20px 24px'
        }}
      >
        <div className="d-flex flex-column flex-sm-row gap-2 w-100 justify-content-end">
          <button
            type='button'
            className='btn me-3'
            onClick={onHide}
            disabled={isLoading}
            style={{
              backgroundColor: 'white',
              color: atisaStyles.colors.primary,
              border: `2px solid ${atisaStyles.colors.primary}`,
              borderRadius: '8px',
              fontFamily: atisaStyles.fonts.secondary,
              fontWeight: '600',
              padding: '10px 20px',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              opacity: isLoading ? 0.6 : 1,
              minWidth: '120px'
            }}
            aria-label="Cancelar y cerrar modal"
          >
            Cancelar
          </button>
          <button
            type='button'
            className='btn'
            onClick={handleSubmit}
            disabled={!selectedPlantillaId || selectedProcesos.length === 0 || isLoading}
            style={{
              backgroundColor: selectedProcesos.length === 0 || !selectedPlantillaId ? '#6c757d' : atisaStyles.colors.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontFamily: atisaStyles.fonts.secondary,
              fontWeight: '600',
              padding: '10px 20px',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              position: 'relative',
              minWidth: '120px',
              boxShadow: selectedProcesos.length > 0 ? '0 4px 15px rgba(156, 186, 57, 0.3)' : 'none'
            }}
            aria-label={isLoading ? 'Guardando...' : (selectedPlantillaId ? 'Actualizar procesos' : 'Guardar procesos')}
          >
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  style={{ marginRight: '8px' }}
                />
                Guardando...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                {selectedPlantillaId ? 'Actualizar' : 'Guardar'} {selectedProcesos.length > 0 ? `(${selectedProcesos.length})` : ''}
              </>
            )}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

export default PlantillaProcesosModal
