import { FC, useEffect, useState } from 'react'
import { Modal } from 'react-bootstrap'
import { ProcesoHitos, deleteProcesoHitosMaestro } from '../../../api/procesoHitosMaestro'
import { Proceso } from '../../../api/procesos'
import { Hito, getHitosHabilitados } from '../../../api/hitos'
import SharedPagination from '../../../components/pagination/SharedPagination'
import { atisaStyles, getTableHeaderStyles, getTableCellStyles } from '../../../styles/atisaStyles'
import { formatDateDisplay } from '../../../utils/dateFormatter'

interface Props {
  show: boolean
  onHide: () => void
  onSave: (procesoHito: Omit<ProcesoHitos, 'id'>[]) => void
  procesos: Proceso[]
  hitoMaestro: ProcesoHitos | null
  hitosActuales?: ProcesoHitos[] // Añadimos esta prop para recibir los hitos actuales
  selectedProcesoId?: number
}

const ProcesoHitosMaestroModal: FC<Props> = ({
  show,
  onHide,
  onSave,
  procesos,
  hitoMaestro,
  hitosActuales = [],
  selectedProcesoId = 0
}) => {
  const [hitos, setHitos] = useState<Hito[]>([])
  const [selectedHitos, setSelectedHitos] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHitos, setIsLoadingHitos] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectAll, setSelectAll] = useState(false)
  const itemsPerPage = 5

  // Filtrar y paginar hitos
  const filteredHitos = hitos.filter(hito =>
    hito.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (hito.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentHitos = filteredHitos.slice(indexOfFirstItem, indexOfLastItem)
  const totalItems = filteredHitos.length

  // Función para cargar hitos habilitados
  const loadHitosHabilitados = async () => {
    try {
      setIsLoadingHitos(true)
      const hitosHabilitados = await getHitosHabilitados()
      setHitos(hitosHabilitados)
    } catch (error) {
      console.error('Error al cargar hitos habilitados:', error)
      setError('Error al cargar los hitos habilitados')
    } finally {
      setIsLoadingHitos(false)
    }
  }

  useEffect(() => {
    if (show) {
      // Cargar hitos habilitados cuando se abre el modal
      loadHitosHabilitados()

      if (selectedProcesoId) {
        const hitosDelProceso = hitosActuales
          .filter(h => h.proceso_id === selectedProcesoId)
          .map(h => h.hito_id)
        setSelectedHitos(hitosDelProceso)
        setSelectAll(hitosDelProceso.length > 0)
      } else {
        setSelectedHitos([])
        setSelectAll(false)
      }
      setError('')
      setSuccess('')
    } else {
      setSearchTerm('')
      setCurrentPage(1)
      setError('')
      setSuccess('')
      setSelectAll(false)
    }
  }, [show, selectedProcesoId, hitosActuales])

  // Efecto para actualizar el estado de "Seleccionar todo" cuando cambian los hitos seleccionados
  useEffect(() => {
    const allCurrentHitosSelected = currentHitos.length > 0 && currentHitos.every(h => selectedHitos.includes(h.id))
    setSelectAll(allCurrentHitosSelected)
  }, [selectedHitos, currentHitos])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProcesoId) {
      setError('Debe seleccionar un proceso')
      return
    }

    if (selectedHitos.length === 0) {
      setError('Debe seleccionar al menos un hito')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      // Primero eliminar todos los hitos actuales del proceso
      const hitosABorrar = hitosActuales.filter(h => h.proceso_id === selectedProcesoId)
      await Promise.all(hitosABorrar.map(h => deleteProcesoHitosMaestro(h.id)))

      // Luego crear las nuevas relaciones
      const newRelations = selectedHitos.map(hitoId => ({
        proceso_id: selectedProcesoId,
        hito_id: hitoId
      }))

      await onSave(newRelations)
      setSuccess(`Se asignaron ${selectedHitos.length} hitos al proceso exitosamente`)

      // Cerrar modal después de un breve delay
      setTimeout(() => {
        onHide()
      }, 1500)
    } catch (error) {
      console.error('Error al actualizar hitos:', error)
      setError('Error al asignar hitos al proceso. Intente nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  // Obtener el nombre del proceso seleccionado
  const selectedProceso = procesos.find(p => p.id === selectedProcesoId)
  const selectedProcesoName = selectedProceso?.nombre || 'Proceso no seleccionado'

  // Funciones para manejar la selección
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = [...new Set([...selectedHitos, ...currentHitos.map(h => h.id)])]
      setSelectedHitos(newSelected)
    } else {
      const currentIds = new Set(currentHitos.map(h => h.id))
      setSelectedHitos(selectedHitos.filter(id => !currentIds.has(id)))
    }
  }

  const handleSelectHito = (hitoId: number, checked: boolean) => {
    if (checked) {
      setSelectedHitos([...selectedHitos, hitoId])
    } else {
      setSelectedHitos(selectedHitos.filter(id => id !== hitoId))
    }
  }

  const handleClearAll = () => {
    setSelectedHitos([])
    setSelectAll(false)
  }

  const handleSelectAllPages = () => {
    setSelectedHitos(filteredHitos.map(h => h.id))
    setSelectAll(true)
  }

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
          Asignar Hitos a Proceso
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
        style={{
          backgroundColor: 'white',
          padding: '24px'
        }}
      >
        {/* Información del proceso seleccionado y búsqueda */}
        <div
          style={{
            backgroundColor: '#f8f9fa',
            padding: '16px 20px',
            borderRadius: '8px',
            border: `1px solid ${atisaStyles.colors.light}`,
            marginBottom: '20px'
          }}
        >
          <div className="d-flex align-items-center justify-content-between">
            {/* Información del proceso */}
            <div className="d-flex align-items-center">
              <i
                className="bi bi-gear-fill me-3"
                style={{
                  color: atisaStyles.colors.primary,
                  fontSize: '20px'
                }}
              ></i>
              <div>
                <h6
                  style={{
                    fontFamily: atisaStyles.fonts.primary,
                    color: atisaStyles.colors.primary,
                    fontWeight: 'bold',
                    margin: '0 0 4px 0',
                    fontSize: '16px'
                  }}
                >
                  Proceso Seleccionado
                </h6>
                <p
                  style={{
                    fontFamily: atisaStyles.fonts.secondary,
                    color: atisaStyles.colors.dark,
                    margin: '0',
                    fontSize: '14px'
                  }}
                >
                  {selectedProcesoName}
                </p>
              </div>
            </div>

            {/* Área de búsqueda */}
            <div className="d-flex align-items-center position-relative">
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
                className='form-control form-control-solid'
                placeholder='Buscar hito...'
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                style={{
                  border: `2px solid ${atisaStyles.colors.light}`,
                  borderRadius: '8px',
                  fontFamily: atisaStyles.fonts.secondary,
                  fontSize: '14px',
                  paddingLeft: '48px',
                  height: '42px',
                  width: '300px',
                  minWidth: '250px'
                }}
              />
            </div>
          </div>
        </div>

        {/* Alertas */}
        {error && (
          <div
            className="alert alert-danger"
            style={{
              backgroundColor: '#f8d7da',
              border: `1px solid #f5c6cb`,
              color: '#721c24',
              borderRadius: '6px',
              fontFamily: atisaStyles.fonts.secondary,
              marginBottom: '20px',
              fontSize: '13px',
              padding: '8px 12px'
            }}
          >
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}
        {success && (
          <div
            className="alert alert-success"
            style={{
              backgroundColor: '#d4edda',
              border: `1px solid #c3e6cb`,
              color: '#155724',
              borderRadius: '6px',
              fontFamily: atisaStyles.fonts.secondary,
              marginBottom: '20px',
              fontSize: '13px',
              padding: '8px 12px'
            }}
          >
            <i className="bi bi-check-circle me-2"></i>
            {success}
          </div>
        )}

        {/* Contador de hitos seleccionados */}
        <div
          style={{
            backgroundColor: atisaStyles.colors.light,
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            border: `1px solid ${atisaStyles.colors.accent}`
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <span
                style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  color: atisaStyles.colors.primary,
                  fontWeight: '600',
                  fontSize: '14px',
                  marginRight: '16px'
                }}
              >
                <i className="bi bi-check-circle me-2"></i>
                Hitos seleccionados: {selectedHitos.length}
              </span>
              {filteredHitos.length > 0 && (
                <span
                  style={{
                    fontFamily: atisaStyles.fonts.secondary,
                    color: atisaStyles.colors.dark,
                    fontSize: '12px'
                  }}
                >
                  de {filteredHitos.length} hitos disponibles
                </span>
              )}
            </div>
            <div className="d-flex gap-2">
              {filteredHitos.length > 0 && selectedHitos.length < filteredHitos.length && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleSelectAllPages}
                  style={{
                    backgroundColor: atisaStyles.colors.accent,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    padding: '4px 8px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                    e.currentTarget.style.transform = 'translateY(-1px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <i className="bi bi-check-all me-1"></i>
                  Seleccionar todos
                </button>
              )}
              {selectedHitos.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={handleClearAll}
                  style={{
                    backgroundColor: 'transparent',
                    color: atisaStyles.colors.dark,
                    border: `1px solid ${atisaStyles.colors.dark}`,
                    borderRadius: '4px',
                    fontSize: '12px',
                    padding: '4px 8px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.dark
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = atisaStyles.colors.dark
                  }}
                >
                  <i className="bi bi-x me-1"></i>
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        {isLoadingHitos ? (
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
              border: `1px solid ${atisaStyles.colors.light}`,
              padding: '40px 20px',
              textAlign: 'center'
            }}
          >
            <div
              className='spinner-border'
              role='status'
              style={{
                color: atisaStyles.colors.primary,
                width: '3rem',
                height: '3rem',
                marginBottom: '16px'
              }}
            >
              <span className='visually-hidden'>Cargando hitos habilitados...</span>
            </div>
            <p
              style={{
                fontFamily: atisaStyles.fonts.secondary,
                color: atisaStyles.colors.primary,
                fontSize: '16px',
                margin: 0
              }}
            >
              Cargando hitos habilitados...
            </p>
          </div>
        ) : (
          <div
            className='table-responsive border rounded-3 position-relative'
            style={{
              borderColor: atisaStyles.colors.light,
              overflow: 'hidden'
            }}
          >
            <table
              className='table align-middle table-row-dashed fs-6 gy-5'
              style={{
                fontFamily: atisaStyles.fonts.secondary,
                margin: 0
              }}
            >
              <thead>
                <tr className="fw-bold fs-6">
                  <th
                    className="ps-4 w-50px py-3" style={getTableHeaderStyles()}
                  >
                    <div className='form-check form-check-sm form-check-custom form-check-solid'>
                      <input
                        className='form-check-input'
                        type='checkbox'
                        checked={selectAll}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        style={{
                          border: `1px solid ${atisaStyles.colors.primary}`
                        }}
                      />
                    </div>
                  </th>
                  <th
                    className="py-3" style={getTableHeaderStyles()}
                  >
                    Hito
                  </th>
                  <th
                    className="py-3" style={getTableHeaderStyles()}
                  >
                    Descripción
                  </th>
                  <th
                    className="py-3" style={getTableHeaderStyles()}
                  >
                    Fecha Inicio
                  </th>
                  <th
                    className="py-3" style={getTableHeaderStyles()}
                  >
                    Fecha Fin
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentHitos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        fontFamily: atisaStyles.fonts.secondary,
                        color: atisaStyles.colors.dark,
                        fontSize: '14px'
                      }}
                    >
                      <i className="bi bi-inbox" style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}></i>
                      {searchTerm ? 'No se encontraron hitos que coincidan con la búsqueda' : 'No hay hitos habilitados disponibles'}
                    </td>
                  </tr>
                ) : (
                  currentHitos.map((hito, index) => {
                    const isSelected = selectedHitos.includes(hito.id);
                    return (
                      <tr
                        key={hito.id}
                        style={{
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(156, 186, 57, 0.15)' : (index % 2 === 0 ? 'white' : '#f8f9fa'),
                          transition: 'all 0.2s ease'
                        }}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).tagName !== 'INPUT') {
                            handleSelectHito(hito.id, !isSelected)
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
                              checked={selectedHitos.includes(hito.id)}
                              onChange={(e) => handleSelectHito(hito.id, e.target.checked)}
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
                            {hito.nombre}
                          </span>
                        </td>
                        <td
                          style={{ ...getTableCellStyles(), borderBottom: `1px solid ${atisaStyles.colors.light}` }}
                        >
                          {hito.descripcion || '-'}
                        </td>
                        <td
                          style={{ ...getTableCellStyles(), borderBottom: `1px solid ${atisaStyles.colors.light}` }}
                        >
                          {formatDateDisplay(hito.fecha_limite)}
                        </td>
                        <td
                          style={{ ...getTableCellStyles(), borderBottom: `1px solid ${atisaStyles.colors.light}` }}
                        >
                          -
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

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
              minWidth: '120px'
            }}
          >
            Cancelar
          </button>
          <button
            type='button'
            className='btn'
            onClick={handleSubmit}
            disabled={!selectedProcesoId || selectedHitos.length === 0 || isLoading}
            style={{
              backgroundColor: selectedHitos.length === 0 || !selectedProcesoId ? '#6c757d' : atisaStyles.colors.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontFamily: atisaStyles.fonts.secondary,
              fontWeight: '600',
              padding: '10px 20px',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              marginLeft: '12px',
              opacity: isLoading ? 0.7 : 1,
              minWidth: '120px',
              boxShadow: selectedHitos.length > 0 ? '0 4px 15px rgba(156, 186, 57, 0.3)' : 'none'
            }}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Procesando...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                {hitoMaestro ? 'Actualizar' : 'Asignar Hitos'} {selectedHitos.length > 0 ? `(${selectedHitos.length})` : ''}
              </>
            )}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  )
}

export default ProcesoHitosMaestroModal
