import { FC, useEffect, useState } from 'react'
import { Modal } from 'react-bootstrap'
import { MetadatoArea, deleteMetadatoArea } from '../../../api/metadatosArea'
import { Metadato } from '../../../api/metadatos'
import { Subdepartamento } from '../../../api/subdepartamentos'
import SharedPagination from '../../../components/pagination/SharedPagination'

interface Props {
  show: boolean
  onHide: () => void
  onSave: (metadatoAreas: { id_metadato: number; codSubDepar: string }[]) => void
  metadatos: Metadato[]
  subdepartamentos: Subdepartamento[]
  areasActuales?: MetadatoArea[]
  selectedMetadatoId?: number
}



interface GroupedSubdepartamento {
  departmentName: string
  subdepartamentos: Subdepartamento[]
}

interface GroupHeaderItem {
  type: 'group-header'
  departmentName: string
  count: number
}

type TableItem = GroupHeaderItem

const MetadatoSubdepartamentosModal: FC<Props> = ({
  show,
  onHide,
  onSave,
  metadatos,
  subdepartamentos,
  areasActuales = [],
  selectedMetadatoId = 0
}) => {
  const [selectedSubdepartamentos, setSelectedSubdepartamentos] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8 // Cantidad optimizada para altura

  useEffect(() => {
    if (show) {
      if (selectedMetadatoId) {
        const subdepartamentosDelMetadato = areasActuales
          .filter(area => area.id_metadato === selectedMetadatoId)
          .map(area => area.codSubDepar)
        setSelectedSubdepartamentos(subdepartamentosDelMetadato)
      } else {
        setSelectedSubdepartamentos([])
      }
    } else {
      setSearchTerm('')
      setCurrentPage(1)
    }
  }, [show, selectedMetadatoId, areasActuales])

  const sortSubdepartamentos = (data: Subdepartamento[]) => {
    return [...data].sort((a, b) => {
      const aValue = a.nombre || ''
      const bValue = b.nombre || ''

      return aValue.toLowerCase().localeCompare(bValue.toLowerCase())
    })
  }

  const groupSubdepartamentosByName = (data: Subdepartamento[]): GroupedSubdepartamento[] => {
    // Filtrar solo registros con nombre válido y CECO
    const validData = data.filter(subdep =>
      subdep.nombre &&
      subdep.nombre.trim() !== '' &&
      subdep.codSubDepar &&
      subdep.codSubDepar.trim() !== ''
    )

    const groups = validData.reduce((acc, subdep) => {
      const departmentName = subdep.nombre!.trim()
      if (!acc[departmentName]) {
        acc[departmentName] = []
      }
      acc[departmentName].push(subdep)
      return acc
    }, {} as Record<string, Subdepartamento[]>)

    // Convertir a array y ordenar cada grupo
    return Object.entries(groups)
      .map(([departmentName, subdeps]) => ({
        departmentName,
        subdepartamentos: sortSubdepartamentos(subdeps)
      }))
      .sort((a, b) => a.departmentName.localeCompare(b.departmentName))
  }





  const handleGroupCheckboxChange = (groupName: string, checked: boolean, groupSubdeps: Subdepartamento[]) => {
    const groupCecos = groupSubdeps.map(s => s.codSubDepar).filter(Boolean) as string[]

    if (checked) {
      const newSelected = [...new Set([...selectedSubdepartamentos, ...groupCecos])]
      setSelectedSubdepartamentos(newSelected)
    } else {
      const groupCecosSet = new Set(groupCecos)
      setSelectedSubdepartamentos(selectedSubdepartamentos.filter(ceco => !groupCecosSet.has(ceco)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedMetadatoId && selectedSubdepartamentos.length > 0) {
      try {
        // Primero eliminar todas las áreas actuales del metadato
        const areasABorrar = areasActuales.filter(area => area.id_metadato === selectedMetadatoId)
        await Promise.all(areasABorrar.map(area => deleteMetadatoArea(area.id)))

        // Luego crear las nuevas relaciones (filtrar cecos válidos)
        const newRelations = selectedSubdepartamentos
          .filter(cod => cod && cod.trim() !== '')
          .map(cod => ({
            id_metadato: selectedMetadatoId,
            codSubDepar: cod
          }))
        await onSave(newRelations)
      } catch (error) {
        console.error('Error al actualizar subdepartamentos:', error)
      }
    }
  }

  // Agrupar primero, luego filtrar por nombres de grupo
  const allGroupedSubdepartamentos = groupSubdepartamentosByName(subdepartamentos)

  const filteredGroupedSubdepartamentos = allGroupedSubdepartamentos.filter(group =>
    group.departmentName.toLowerCase().includes(searchTerm.toLowerCase().trim())
  )

  // Solo mostrar headers de grupo
  const flattenedForPagination: TableItem[] = filteredGroupedSubdepartamentos.map((group: GroupedSubdepartamento) => ({
    type: 'group-header' as const,
    departmentName: group.departmentName,
    count: group.subdepartamentos.length
  }))

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = flattenedForPagination.slice(indexOfFirstItem, indexOfLastItem)
  const totalItems = flattenedForPagination.length

  const getMetadatoName = (metadatoId: number) => {
    const metadato = metadatos.find(m => m.id === metadatoId)
    return metadato ? metadato.nombre : `Metadato ${metadatoId}`
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      dialogClassName='modal-dialog modal-dialog-centered modal-lg'
    >
      <Modal.Header>
        <Modal.Title>
          Administrar Departamentos - {getMetadatoName(selectedMetadatoId)}
        </Modal.Title>
        <div className='btn btn-icon btn-sm btn-active-icon-primary' onClick={onHide}>
          <i className="bi bi-x-lg fs-4"></i>
        </div>
      </Modal.Header>

      <Modal.Body>
        <div className='d-flex justify-content-between align-items-center mb-3'>
          <div className='d-flex align-items-center position-relative'>
            <i className='bi bi-search position-absolute ms-3'></i>
            <input
              type='text'
              className='form-control form-control-solid w-250px ps-9'
              placeholder='Buscar departamento...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className='table-responsive'>
          <table className='table align-middle fs-6 gy-2'>
            <thead>
              <tr className='text-start text-muted fw-bold fs-7 text-uppercase gs-0'>
                <th style={{ width: '60px' }} className='text-center py-3'>
                  <div className='form-check form-check-custom form-check-solid d-flex justify-content-center align-items-center'>
                    <input
                      className='form-check-input form-check-input-lg'
                      type='checkbox'
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      checked={filteredGroupedSubdepartamentos.length > 0 && filteredGroupedSubdepartamentos.every(group => group.subdepartamentos.every((s: Subdepartamento) => s.codSubDepar ? selectedSubdepartamentos.includes(s.codSubDepar) : false))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allCecos = filteredGroupedSubdepartamentos.flatMap(group => group.subdepartamentos.map((s: Subdepartamento) => s.codSubDepar).filter(Boolean)) as string[]
                          const newSelected = [...new Set([...selectedSubdepartamentos, ...allCecos])]
                          setSelectedSubdepartamentos(newSelected)
                        } else {
                          const allCecosSet = new Set(filteredGroupedSubdepartamentos.flatMap(group => group.subdepartamentos.map((s: Subdepartamento) => s.codSubDepar).filter(Boolean)))
                          setSelectedSubdepartamentos(selectedSubdepartamentos.filter(ceco => !allCecosSet.has(ceco)))
                        }
                      }}
                    />
                  </div>
                </th>
                <th className='py-3'>Departamento</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item, index) => {
                const group = filteredGroupedSubdepartamentos.find((g: GroupedSubdepartamento) => g.departmentName === item.departmentName)
                const isGroupSelected = group?.subdepartamentos.every((s: Subdepartamento) => s.codSubDepar ? selectedSubdepartamentos.includes(s.codSubDepar) : false)
                const isGroupPartiallySelected = group?.subdepartamentos.some((s: Subdepartamento) => s.codSubDepar ? selectedSubdepartamentos.includes(s.codSubDepar) : false)

                return (
                  <tr key={`group-${item.departmentName}`} className='bg-light-primary border-0'>
                    <td className='py-3 text-center'>
                      <div className='form-check form-check-custom form-check-solid d-flex justify-content-center align-items-center'>
                        <input
                          className='form-check-input-lg'
                          type='checkbox'
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          checked={!!isGroupSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = !!(isGroupPartiallySelected && !isGroupSelected)
                          }}
                          onChange={(e) => {
                            if (group) {
                              handleGroupCheckboxChange(item.departmentName, e.target.checked, group.subdepartamentos)
                            }
                          }}
                        />
                      </div>
                    </td>
                    <td className='py-3'>
                      <div className='d-flex align-items-center'>
                        <i className='bi bi-building text-primary me-2'></i>
                        <span className='fw-bold text-primary'>
                          {item.departmentName || 'Departamento sin nombre'}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <SharedPagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Modal.Body>
      <Modal.Footer>
        <button type='button' className='btn btn-light' onClick={onHide}>
          Cancelar
        </button>
        <button
          type='button'
          className='btn btn-primary'
          onClick={handleSubmit}
          disabled={!selectedMetadatoId || selectedSubdepartamentos.length === 0}
        >
          Guardar
        </button>
      </Modal.Footer>
    </Modal>
  )
}

export default MetadatoSubdepartamentosModal
