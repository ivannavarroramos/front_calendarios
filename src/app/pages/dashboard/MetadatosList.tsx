import React, { FC, useEffect, useState, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import CustomToast from '../../components/ui/CustomToast'
import { Metadato, getAllMetadatos, createMetadato, updateMetadato, deleteMetadato } from '../../api/metadatos'
import SharedPagination from '../../components/pagination/SharedPagination'
import MetadatoModal from './components/MetadatoModal'
import PageHeader from '../../components/ui/PageHeader'
import { atisaStyles, getPrimaryButtonStyles, getSecondaryButtonStyles, getTableHeaderStyles, getTableCellStyles, getBadgeStyles, getDropdownStyles, getActionsButtonStyles } from '../../styles/atisaStyles'

const MetadatosList: FC = () => {
  const navigate = useNavigate()
  const [metadatos, setMetadatos] = useState<Metadato[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados para paginación y ordenamiento
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [sortField, setSortField] = useState('id')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Estados para búsqueda
  const [allMetadatos, setAllMetadatos] = useState<Metadato[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searching, setSearching] = useState(false)

  // Estados para el modal
  const [showModal, setShowModal] = useState(false)
  const [editingMetadato, setEditingMetadato] = useState<Metadato | null>(null)

  const [activeDropdown, setActiveDropdown] = useState<number | null>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null)
  const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({})
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('info')
  const [showEliminarModal, setShowEliminarModal] = useState(false)
  const [metadatoAEliminar, setMetadatoAEliminar] = useState<Metadato | null>(null)

  // Función auxiliar para mostrar toasts
  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setShowToast(true)
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
    const dropdownHeight = 250 // Estimación amortiguada

    const showAbove = rect.bottom + dropdownHeight > viewportHeight

    return {
      top: showAbove ? rect.top + window.scrollY - 4 : rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      placement: showAbove ? 'top' as const : 'bottom' as const
    }
  }

  // Función para manejar el clic en el botón de acciones
  const handleActionsClick = (metadatoId: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (activeDropdown === metadatoId) {
      setActiveDropdown(null)
      setDropdownPosition(null)
    } else {
      const position = calculateDropdownPosition(event.currentTarget)
      setActiveDropdown(metadatoId)
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

  // Debounce para el término de búsqueda
  useEffect(() => {
    if (searchTerm) {
      setSearching(true)
    }

    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => {
      clearTimeout(timer)
      if (!searchTerm) {
        setSearching(false)
      }
    }
  }, [searchTerm])

  // Cargar todos los metadatos cuando hay búsqueda
  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      setPage(1)
      loadAllMetadatos()
    } else {
      setAllMetadatos([])
    }
  }, [debouncedSearchTerm])

  const loadAll = async () => {
    try {
      setLoading(true)

      const metadatosData = await getAllMetadatos(page, limit, sortField, sortDirection)
      setMetadatos(metadatosData.metadatos || [])
      setTotal(metadatosData.total || 0)
      setError(null)

    } catch (error: any) {
      if (error?.response?.status === 404) {
        setMetadatos([])
        setTotal(0)
        setError(null)
      } else {
        setError('Error al cargar los datos')
        console.error('Error in loadAll:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadAllMetadatos = async () => {
    try {
      setLoading(true)
      setSearching(true)
      const metadatosData = await getAllMetadatos()
      setAllMetadatos(metadatosData.metadatos || [])

    } catch (error: any) {
      console.error('Error loading all metadatos:', error)
      if (error?.response?.status === 404) {
        setAllMetadatos([])
      }
    } finally {
      setLoading(false)
      setSearching(false)
    }
  }

  useEffect(() => {
    if (!debouncedSearchTerm.trim()) {
      loadAll()
    }
  }, [page, limit, sortField, sortDirection, debouncedSearchTerm])

  // Filtrar metadatos por término de búsqueda
  const filteredMetadatos = useMemo(() => {
    const metadatosToFilter = debouncedSearchTerm.trim() ? allMetadatos : metadatos
    if (!debouncedSearchTerm.trim()) return metadatosToFilter

    return metadatosToFilter.filter(metadato =>
      metadato.nombre.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (metadato.descripcion || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      metadato.tipo_generacion.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
  }, [metadatos, allMetadatos, debouncedSearchTerm])

  // Aplicar paginación a los resultados filtrados
  const paginatedMetadatos = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return filteredMetadatos
    }
    // Cuando hay búsqueda, aplicar paginación a los resultados filtrados
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    return filteredMetadatos.slice(startIndex, endIndex)
  }, [filteredMetadatos, page, limit, debouncedSearchTerm])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleCreate = () => {
    setEditingMetadato(null)
    setShowModal(true)
  }

  const handleEdit = (metadato: Metadato) => {
    setEditingMetadato(metadato)
    setShowModal(true)
  }

  const handleSave = async (metadatoData: Omit<Metadato, 'id'>) => {
    try {
      if (editingMetadato) {
        await updateMetadato(editingMetadato.id, metadatoData)
      } else {
        await createMetadato(metadatoData)
      }
      setShowModal(false)
      setEditingMetadato(null)
      setEditingMetadato(null)
      if (debouncedSearchTerm.trim()) {
        await loadAllMetadatos()
      } else {
        await loadAll()
      }
    } catch (error) {
      console.error('Error al guardar metadato:', error)
      setError('Error al guardar el metadato')
    }
  }

  const handleEliminar = (id: number) => {
    const metadato = metadatos.find(m => m.id === id) || allMetadatos.find(m => m.id === id)
    if (metadato) {
      setMetadatoAEliminar(metadato)
      setShowEliminarModal(true)
      setActiveDropdown(null)
      setDropdownPosition(null)
    }
  }

  const confirmarEliminar = async () => {
    if (!metadatoAEliminar) return

    try {
      await deleteMetadato(metadatoAEliminar.id)
      if (debouncedSearchTerm.trim()) {
        await loadAllMetadatos()
      } else {
        await loadAll()
      }
      showToastMessage('Elemento eliminado correctamente', 'success')
    } catch (error: any) {
      // Extraer el mensaje de error del backend
      let errorMessage = 'Error al eliminar el elemento'
      if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail
      } else if (error?.message) {
        errorMessage = error.message
      }
      showToastMessage(errorMessage, 'error')
    } finally {
      setShowEliminarModal(false)
      setMetadatoAEliminar(null)
    }
  }

  const cancelarEliminar = () => {
    setShowEliminarModal(false)
    setMetadatoAEliminar(null)
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
          title="Gestión de Metadatos"
          subtitle="Configuración y administración de campos personalizados"
          icon="tags"
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
                  placeholder='Buscar metadatos...'
                  value={searchTerm}
                  onChange={handleSearch}
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
              </div>
              <button
                type='button'
                className='btn'
                onClick={handleCreate}
                style={{
                  backgroundColor: atisaStyles.colors.secondary,
                  border: `2px solid ${atisaStyles.colors.secondary} `,
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
                <i className='bi bi-plus-circle'></i>
                Nuevo Metadato
              </button>
            </div>
          }
        />

        <div className='card border-0' style={{ boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)', borderRadius: '12px', overflow: 'hidden' }}>
          <div className='card-body p-0'>
            {loading ? (
              <div className='d-flex justify-content-center py-10'>
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
                className='alert alert-danger m-6'
                role='alert'
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
                {filteredMetadatos.length === 0 ? (
                  <div
                    className='text-center py-5'
                    style={{
                      backgroundColor: atisaStyles.colors.light,
                      borderRadius: '0',
                      border: `2px dashed ${atisaStyles.colors.primary} `,
                      padding: '40px 20px',
                      margin: 0,
                      width: '100%'
                    }}
                  >
                    <i
                      className='bi bi-tags'
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
                      No hay metadatos disponibles
                    </h4>
                    <p
                      style={{
                        fontFamily: atisaStyles.fonts.secondary,
                        color: atisaStyles.colors.dark,
                        margin: 0
                      }}
                    >
                      {debouncedSearchTerm ? 'No se encontraron metadatos que coincidan con tu búsqueda.' : 'Comienza creando tu primer metadato.'}
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
                            Nombre {getSortIcon('nombre')}
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
                            onClick={() => handleSort('tipo_generacion')}
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
                            Tipo Generación {getSortIcon('tipo_generacion')}
                          </th>
                          <th
                            className='cursor-pointer user-select-none'
                            onClick={() => handleSort('global_')}
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
                            Global {getSortIcon('global_')}
                          </th>
                          <th
                            className='cursor-pointer user-select-none'
                            onClick={() => handleSort('activo')}
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
                            Estado {getSortIcon('activo')}
                          </th>
                          <th
                            className='text-start'
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
                        {paginatedMetadatos.map((metadato, index) => (
                          <tr
                            key={metadato.id}
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
                              {metadato.id}
                            </td>
                            <td style={{
                              ...getTableCellStyles(),
                              color: atisaStyles.colors.dark,
                              fontWeight: '600'
                            }}>
                              <div className='d-flex flex-column'>
                                <span className='fw-bold'>{metadato.nombre}</span>
                              </div>
                            </td>
                            <td style={{
                              ...getTableCellStyles(),
                              color: atisaStyles.colors.dark,
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {metadato.descripcion || '-'}
                            </td>
                            <td style={{
                              ...getTableCellStyles()
                            }}>
                              <span
                                className='badge'
                                style={getBadgeStyles(metadato.tipo_generacion === 'automatico')}
                              >
                                {metadato.tipo_generacion}
                              </span>
                            </td>
                            <td style={{
                              ...getTableCellStyles()
                            }}>
                              <span
                                className='badge'
                                style={getBadgeStyles(!!metadato.global_)}
                              >
                                {metadato.global_ ? 'Sí' : 'No'}
                              </span>
                            </td>
                            <td style={{
                              ...getTableCellStyles()
                            }}>
                              <span
                                className='badge'
                                style={getBadgeStyles(!!metadato.activo)}
                              >
                                {metadato.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td
                              className='text-start'
                              style={{
                                ...getTableCellStyles()
                              }}
                            >
                              {metadato.tipo_generacion !== 'automatico' && (
                                <div className='d-flex gap-2'>
                                  <div className='dropdown-container' style={{ position: 'relative', display: 'inline-block' }}>
                                    <button
                                      ref={(el) => (buttonRefs.current[metadato.id] = el)}
                                      className='btn btn-sm'
                                      type='button'
                                      onClick={(e) => handleActionsClick(metadato.id, e)}
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
                                      <i className={`bi ${activeDropdown === metadato.id ? 'bi-chevron-up' : 'bi-chevron-down'} ms - 1`}></i>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {filteredMetadatos.length > 0 && (
                  <SharedPagination
                    currentPage={page}
                    totalItems={debouncedSearchTerm.trim() ? filteredMetadatos.length : total}
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
                border: `2px solid ${atisaStyles.colors.light} `,
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
                {(() => {
                  const metadato = filteredMetadatos.find(m => m.id === activeDropdown)

                  if (metadato && metadato.tipo_generacion === 'automatico') {
                    return (
                      <div style={{
                        padding: '12px 16px',
                        color: atisaStyles.colors.dark,
                        fontFamily: atisaStyles.fonts.secondary,
                        fontSize: '14px',
                        opacity: 0.6,
                        fontStyle: 'italic',
                        textAlign: 'center'
                      }}>
                        Sin acciones disponibles
                      </div>
                    )
                  }

                  return (
                    <>
                      <button
                        onClick={() => {
                          if (metadato) {
                            handleEdit(metadato)
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
                        <i className="bi bi-pencil-square me-3" style={{ fontSize: '16px' }}></i>
                        Editar
                      </button>

                      <div style={{
                        height: '1px',
                        backgroundColor: atisaStyles.colors.light,
                        margin: '4px 0'
                      }}></div>

                      <button
                        onClick={() => {
                          if (activeDropdown) handleEliminar(activeDropdown)
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
                        <i className="bi bi-trash3 me-3" style={{ fontSize: '16px' }}></i>
                        Eliminar
                      </button>
                    </>
                  )
                })()}
              </div>
            </div>,
            document.body
          )}
        </div>

        <MetadatoModal
          show={showModal}
          onHide={() => {
            setShowModal(false)
            setEditingMetadato(null)
          }}
          onSave={handleSave}
          metadato={editingMetadato}
        />

        {/* Modal de confirmación para eliminar */}
        {showEliminarModal && metadatoAEliminar && (
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
                  border: `2px solid ${atisaStyles.colors.light} `,
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
                        ¿Está seguro de eliminar este elemento?
                      </h4>
                      <div
                        style={{
                          backgroundColor: '#f8f9fa',
                          padding: '12px',
                          borderRadius: '8px',
                          marginBottom: '16px',
                          border: `1px solid ${atisaStyles.colors.light} `
                        }}
                      >
                        <p style={{ color: atisaStyles.colors.dark, marginBottom: '0', fontFamily: atisaStyles.fonts.secondary }}>
                          <strong>Nombre:</strong> {metadatoAEliminar.nombre}
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
                        <strong>Esta acción eliminará el elemento permanentemente y no se puede deshacer.</strong>
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
                      boxShadow: `0 2px 8px ${atisaStyles.colors.error} 4D`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = 'brightness(0.9)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = `0 4px 12px ${atisaStyles.colors.error} 66`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'none'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = `0 2px 8px ${atisaStyles.colors.error} 4D`
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

        <CustomToast
          show={showToast}
          onClose={() => setShowToast(false)}
          message={toastMessage}
          type={toastType}
        />
      </div>
    </div>
  )
}

export default MetadatosList
