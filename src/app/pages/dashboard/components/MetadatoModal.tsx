import { FC, useEffect, useState } from 'react'
import { Modal } from 'react-bootstrap'
import { Metadato } from '../../../api/metadatos'
import { atisaStyles } from '../../../styles/atisaStyles'

interface Props {
  show: boolean
  onHide: () => void
  onSave: (metadato: Omit<Metadato, 'id'>) => void
  metadato: Metadato | null
}

const MetadatoModal: FC<Props> = ({ show, onHide, onSave, metadato }) => {
  const [formData, setFormData] = useState<Omit<Metadato, 'id'>>({
    nombre: '',
    descripcion: '',
    tipo_generacion: 'manual',
    global_: 0,
    activo: 1
  })

  useEffect(() => {
    if (metadato) {
      setFormData({
        nombre: metadato.nombre,
        descripcion: metadato.descripcion || '',
        tipo_generacion: metadato.tipo_generacion,
        global_: metadato.global_,
        activo: metadato.activo
      })
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        tipo_generacion: 'manual',
        global_: 0,
        activo: 1
      })
    }
  }, [metadato, show])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Si se está marcando como global y existe el metadato, eliminar relaciones
    // if (formData.global_ && metadato?.id && !metadato?.global_) {
    //   await deleteMetadatoAreaByMetadato(metadato.id)
    // }

    onSave({
      ...formData,
      descripcion: formData.descripcion || undefined
    })
  }

  const handleGlobalChange = (checked: boolean) => {
    setFormData({ ...formData, global_: checked ? 1 : 0 })
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      aria-labelledby='kt_modal_1'
      dialogClassName='modal-dialog modal-dialog-centered mw-650px'
      style={{
        fontFamily: atisaStyles.fonts.secondary
      }}
    >
      <form onSubmit={handleSubmit} id='kt_modal_add_metadato_form' className='form'>
        <Modal.Header
          className='modal-header'
          style={{
            backgroundColor: atisaStyles.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: '12px 12px 0 0'
          }}
        >
          <Modal.Title
            className='fw-bolder'
            style={{
              fontFamily: atisaStyles.fonts.primary,
              fontWeight: 'bold',
              color: 'white',
              fontSize: '1.5rem'
            }}
          >
            <i className="bi bi-tag-fill me-2"></i>
            {metadato ? 'Editar' : 'Nuevo'} Metadato
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
          className='modal-body scroll-y mx-5 mx-xl-15 my-7'
          style={{
            backgroundColor: 'white',
            padding: '24px'
          }}
        >
          {metadato && formData.tipo_generacion === 'automatico' && (
            <div className='alert alert-info mb-7' style={{
              backgroundColor: 'rgba(0, 161, 222, 0.1)',
              border: `1px solid ${atisaStyles.colors.accent}`,
              color: atisaStyles.colors.primary
            }}>
              <div className='alert-text' style={{ fontFamily: atisaStyles.fonts.secondary }}>
                <i className="bi bi-info-circle-fill me-2"></i>
                <strong>Metadato Automático:</strong> Solo se pueden editar la descripción, global y activo.
              </div>
            </div>
          )}

          <div className='d-flex flex-column scroll-y me-n7 pe-7'>
            <div className='fv-row mb-4'>
              <label className='required fw-bold fs-6 mb-2' style={{
                fontFamily: atisaStyles.fonts.primary,
                color: atisaStyles.colors.primary,
                fontSize: '16px'
              }}>
                <i className="bi bi-input-cursor-text me-2"></i>Nombre
              </label>
              <input
                type='text'
                className={`form-control form-control-solid ${formData.tipo_generacion === 'automatico' ? 'bg-light' : ''}`}
                placeholder='Nombre del metadato'
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
                maxLength={255}
                disabled={formData.tipo_generacion === 'automatico'}
                style={{
                  border: `2px solid ${atisaStyles.colors.light}`,
                  borderRadius: '8px',
                  fontFamily: atisaStyles.fonts.secondary,
                  fontSize: '14px',
                  height: '48px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  if (formData.tipo_generacion !== 'automatico') {
                    e.target.style.borderColor = atisaStyles.colors.accent
                    e.target.style.boxShadow = `0 0 0 3px rgba(0, 161, 222, 0.1)`
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = atisaStyles.colors.light
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div className='fv-row mb-4'>
              <label className='fw-bold fs-6 mb-2' style={{
                fontFamily: atisaStyles.fonts.primary,
                color: atisaStyles.colors.primary,
                fontSize: '16px'
              }}>
                <i className="bi bi-chat-text me-2"></i>Descripción
              </label>
              <textarea
                className='form-control form-control-solid'
                placeholder='Descripción del metadato'
                rows={3}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                maxLength={500}
                style={{
                  border: `2px solid ${atisaStyles.colors.light}`,
                  borderRadius: '8px',
                  fontFamily: atisaStyles.fonts.secondary,
                  fontSize: '14px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = atisaStyles.colors.accent
                  e.target.style.boxShadow = `0 0 0 3px rgba(0, 161, 222, 0.1)`
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = atisaStyles.colors.light
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            <div className='fv-row mb-4'>
              <label className='fw-bold fs-6 mb-2' style={{
                fontFamily: atisaStyles.fonts.primary,
                color: atisaStyles.colors.primary,
                fontSize: '16px'
              }}>
                <i className="bi bi-gear me-2"></i>Tipo de Generación
              </label>
              <input
                type='text'
                className='form-control form-control-solid bg-light'
                value={formData.tipo_generacion}
                readOnly
                style={{
                  border: `2px solid ${atisaStyles.colors.light}`,
                  borderRadius: '8px',
                  fontFamily: atisaStyles.fonts.secondary,
                  fontSize: '14px',
                  height: '48px',
                  textTransform: 'capitalize'
                }}
              />
            </div>

            <div className='fv-row mb-4 mt-3'>
              <div className='d-flex align-items-center gap-5'>
                <div className='form-check form-switch d-flex align-items-center' style={{ gap: '10px' }}>
                  <input
                    className='form-check-input'
                    type='checkbox'
                    checked={!!formData.global_}
                    onChange={(e) => handleGlobalChange(e.target.checked)}
                    id='global'
                    style={{ height: '25px', width: '45px', cursor: 'pointer' }}
                  />
                  <label className='form-check-label mb-0 fw-bold fs-6' htmlFor='global' style={{
                    fontFamily: atisaStyles.fonts.secondary,
                    color: atisaStyles.colors.dark,
                    cursor: 'pointer'
                  }}>
                    Global
                  </label>
                </div>

                <div className='form-check form-switch d-flex align-items-center' style={{ gap: '10px' }}>
                  <input
                    className='form-check-input'
                    type='checkbox'
                    checked={!!formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked ? 1 : 0 })}
                    id='activo'
                    style={{ height: '25px', width: '45px', cursor: 'pointer' }}
                  />
                  <label className='form-check-label mb-0 fw-bold fs-6' htmlFor='activo' style={{
                    fontFamily: atisaStyles.fonts.secondary,
                    color: atisaStyles.colors.dark,
                    cursor: 'pointer'
                  }}>
                    Activo
                  </label>
                </div>
              </div>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer
          className='modal-footer'
          style={{
            backgroundColor: '#f8f9fa',
            border: 'none',
            borderRadius: '0 0 12px 12px',
            padding: '20px 24px'
          }}
        >
          <button
            type='button'
            className='btn'
            onClick={onHide}
            style={{
              backgroundColor: 'transparent',
              color: atisaStyles.colors.dark,
              border: `2px solid ${atisaStyles.colors.light}`,
              borderRadius: '8px',
              fontFamily: atisaStyles.fonts.secondary,
              fontWeight: '600',
              padding: '10px 20px',
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
            <i className="bi bi-x-circle me-2"></i>
            Cancelar
          </button>
          <button
            type='submit'
            className='btn'
            style={{
              backgroundColor: atisaStyles.colors.secondary,
              border: `2px solid ${atisaStyles.colors.secondary}`,
              color: 'white',
              fontFamily: atisaStyles.fonts.secondary,
              fontWeight: '600',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              marginLeft: '12px',
              boxShadow: '0 4px 15px rgba(156, 186, 57, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.accent
              e.currentTarget.style.borderColor = atisaStyles.colors.accent
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 161, 222, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = atisaStyles.colors.secondary
              e.currentTarget.style.borderColor = atisaStyles.colors.secondary
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(156, 186, 57, 0.3)'
            }}
          >
            <i className="bi bi-check-circle me-2"></i>
            <span className='indicator-label'>{metadato ? 'Actualizar' : 'Crear'}</span>
          </button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}

export default MetadatoModal
