import React, { FC, useEffect, useState } from 'react'
import { DocumentalCarpetaCliente, getDocumentalCarpetaClienteByClienteId } from '../../../../api/documentalCarpetaCliente'
import { Cliente, getClienteById } from '../../../../api/clientes'
import DocumentosCategoriaList from './DocumentosCategoriaList'
import CustomToast from '../../../../components/ui/CustomToast'
import { atisaStyles } from '../../../../styles/atisaStyles'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../../../components/ui/PageHeader'

interface Props {
  clienteId: string
}

const GestorDocumental: FC<Props> = ({ clienteId }) => {
  const navigate = useNavigate()
  const [carpetas, setCarpetas] = useState<DocumentalCarpetaCliente[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [showDocumentosModal, setShowDocumentosModal] = useState<boolean>(false)
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState<DocumentalCarpetaCliente | null>(null)

  // Toast state
  const [showToast, setShowToast] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string>('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success')

  useEffect(() => {
    loadCarpetas()
    loadCliente()
  }, [clienteId])

  const loadCliente = async () => {
    try {
      const clienteData = await getClienteById(clienteId)
      setCliente(clienteData)
    } catch (err) {
      console.error('Error al cargar cliente:', err)
    }
  }

  const loadCarpetas = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getDocumentalCarpetaClienteByClienteId(clienteId)
      setCarpetas(response.carpetas || [])
    } catch (err) {
      console.error('Error al cargar carpetas del cliente:', err)
      setError('Error al cargar las carpetas del cliente')
    } finally {
      setLoading(false)
    }
  }



  const handleVerDocumentos = (carpeta: DocumentalCarpetaCliente) => {
    setCarpetaSeleccionada(carpeta)
    setShowDocumentosModal(true)
  }



  const handleCloseDocumentosModal = () => {
    setShowDocumentosModal(false)
    setCarpetaSeleccionada(null)
  }



  const handleVolver = () => {
    navigate(`/clientes-documental-calendario`)
  }

  if (loading) {
    return (
      <div
        style={{
          fontFamily: atisaStyles.fonts.secondary,
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
          border: `1px solid ${atisaStyles.colors.light}`,
          padding: '40px 24px',
          textAlign: 'center'
        }}
      >
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
        <div
          style={{
            fontFamily: atisaStyles.fonts.secondary,
            color: atisaStyles.colors.dark,
            marginTop: '16px',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          Cargando categorías...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          fontFamily: atisaStyles.fonts.secondary,
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
          border: `1px solid ${atisaStyles.colors.light}`,
          padding: '24px'
        }}
      >
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
            boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
            marginBottom: '20px'
          }}
        >
          <i className="bi bi-exclamation-triangle me-3" style={{ fontSize: '20px', color: '#721c24' }}></i>
          <div>
            <h4 style={{ fontFamily: atisaStyles.fonts.primary, fontWeight: 'bold', margin: '0 0 8px 0' }}>Error</h4>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <button
            className="btn"
            onClick={loadCarpetas}
            style={{
              backgroundColor: atisaStyles.colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontFamily: atisaStyles.fonts.secondary,
              fontWeight: '600',
              padding: '10px 20px',
              fontSize: '14px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <i className="bi bi-arrow-clockwise me-2" style={{ fontSize: '14px', color: 'white' }}></i>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="container-fluid"
      style={{
        fontFamily: atisaStyles.fonts.secondary,
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <PageHeader
        title="Gestor Documental"
        subtitle={cliente?.razsoc || clienteId}
        icon="folder2-open"
        backButton={
          <button
            className="btn btn-sm"
            onClick={handleVolver}
            style={{
              backgroundColor: 'white',
              color: atisaStyles.colors.primary,
              border: `1px solid ${atisaStyles.colors.light}`,
              borderRadius: '8px',
              fontWeight: '600',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="bi bi-arrow-left"></i>
            Volver a Clientes
          </button>
        }
      />

      {/* Container principal */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
        <div className="card-body p-4">
          {/* Botón para agregar nueva categoría cuando ya existen categorías - ELIMINADO */}

          {/* Lista de categorías */}
          <div className="d-flex flex-column gap-4">
            {carpetas.map((carpeta, index) => (
              <div key={carpeta.id}>
                {/* Fila de categoría */}
                <div
                  className="d-flex align-items-center justify-content-between py-4 px-4 rounded"
                  style={{
                    backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                    border: `1px solid ${atisaStyles.colors.light}`,
                    borderRadius: '12px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(0, 80, 92, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 80, 92, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f8f9fa'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 80, 92, 0.05)'
                  }}
                >
                  {/* Lado izquierdo: Icono + Nombre */}
                  <div className="d-flex align-items-center">
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: atisaStyles.colors.primary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '16px',
                        boxShadow: '0 4px 12px rgba(0, 80, 92, 0.2)'
                      }}
                    >
                      <i className="bi bi-folder fs-4" style={{ color: 'white' }}></i>
                    </div>
                    <div>
                      <h3
                        style={{
                          fontFamily: atisaStyles.fonts.primary,
                          fontWeight: 'bold',
                          color: atisaStyles.colors.primary,
                          fontSize: '1.2rem',
                          margin: 0
                        }}
                      >
                        {carpeta.nombre_carpeta}
                      </h3>
                    </div>
                  </div>

                  <div className='d-flex gap-3'>
                    <button
                      className="btn"
                      onClick={() => handleVerDocumentos(carpeta)}
                      style={{
                        backgroundColor: atisaStyles.colors.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontFamily: atisaStyles.fonts.secondary,
                        fontWeight: '600',
                        padding: '8px 16px',
                        fontSize: '14px',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0, 161, 222, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = atisaStyles.colors.primary
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 80, 92, 0.4)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 161, 222, 0.3)'
                      }}
                    >
                      <i className="bi bi-folder2-open fs-5" style={{ color: 'white' }}></i>
                      Gestionar Documentos
                    </button>
                  </div>
                </div>

                {/* Separador entre elementos */}
                {index < carpetas.length - 1 && (
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: atisaStyles.colors.light,
                      margin: '20px 0'
                    }}
                  ></div>
                )}
              </div>
            ))}
          </div>

          {/* Mensaje cuando no hay categorías */}
          {carpetas.length === 0 && (
            <div
              className="text-center py-10"
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 80, 92, 0.1)',
                border: `1px solid ${atisaStyles.colors.light}`,
                padding: '40px 24px',
                marginBottom: '2rem'
              }}
            >
              <i
                className="bi bi-folder-x"
                style={{
                  fontSize: '48px',
                  color: atisaStyles.colors.light,
                  marginBottom: '16px'
                }}
              ></i>
              <h3
                style={{
                  fontFamily: atisaStyles.fonts.primary,
                  color: atisaStyles.colors.primary,
                  fontWeight: 'bold',
                  fontSize: '1.5rem',
                  margin: '0 0 16px 0'
                }}
              >
                No hay categorías disponibles
              </h3>
              <p
                style={{
                  fontFamily: atisaStyles.fonts.secondary,
                  color: atisaStyles.colors.dark,
                  fontSize: '16px',
                  margin: '0 0 24px 0'
                }}
              >
                No se encontraron carpetas configuradas para este cliente.
              </p>
              <div className="d-flex gap-3 justify-content-center">
                <button
                  className="btn"
                  onClick={loadCarpetas}
                  style={{
                    backgroundColor: 'transparent',
                    color: atisaStyles.colors.dark,
                    border: `2px solid ${atisaStyles.colors.light}`,
                    borderRadius: '8px',
                    fontFamily: atisaStyles.fonts.secondary,
                    fontWeight: '600',
                    padding: '12px 24px',
                    fontSize: '14px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = atisaStyles.colors.light
                    e.currentTarget.style.color = atisaStyles.colors.primary
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = atisaStyles.colors.dark
                  }}
                >
                  <i className="bi bi-arrow-clockwise fs-6 me-2" style={{ color: atisaStyles.colors.dark }}></i>
                  Actualizar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Modal para mostrar lista de documentos */}
      {carpetaSeleccionada && (
        <DocumentosCategoriaList
          show={showDocumentosModal}
          onHide={handleCloseDocumentosModal}
          carpetaId={carpetaSeleccionada.carpeta_id}
          carpetaNombre={carpetaSeleccionada.nombre_carpeta}
          clienteId={clienteId}
        />
      )}

      <CustomToast
        show={showToast}
        onClose={() => setShowToast(false)}
        message={toastMessage}
        type={toastType}
      />
    </div>
  )
}

export default GestorDocumental
