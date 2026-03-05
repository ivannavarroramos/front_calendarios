import { FC } from 'react'
import { useIntl } from 'react-intl'
import { atisaStyles } from '../../styles/atisaStyles'
// Removed atisaStyles import - now using Tailwind CSS

const DashboardPage: FC = () => (
  <>
    {/* begin::Row */}
    <div
      className='row g-5 g-xl-10 mb-5 mb-xl-10'
      style={{ fontFamily: atisaStyles.fonts.secondary }}
    >
      {/* begin::Col */}
      <div className='col-md-6 col-lg-6 col-xl-6 col-xxl-3 mb-md-5 mb-xl-10'>
        <div className="card-atisa mb-6 h-50 flex flex-col justify-center items-center text-center animate-fade-in">
          <div className="ideogram-atisa ideogram-atisa-secondary mb-4 shadow-atisa-button">
            <i className="bi bi-folder-check text-3xl text-white"></i>
          </div>
          <h4 className="font-serif text-atisa-primary font-bold text-2xl m-0 mb-2">
            Proyectos Activos
          </h4>
          <p
            className="text-atisa-green-dark font-normal text-sm m-0"
            style={{ fontFamily: atisaStyles.fonts.secondary }}
          >
            Gestión de proyectos en curso
          </p>
        </div>

        <div className="card-atisa h-50 flex flex-col justify-center items-center text-center animate-fade-in">
          <div className="ideogram-atisa ideogram-atisa-accent mb-4 shadow-atisa-button">
            <i className="bi bi-people text-3xl text-white"></i>
          </div>
          <h4 className="font-serif text-atisa-primary font-bold text-2xl m-0 mb-2">
            Profesionales
          </h4>
          <p
            className="text-atisa-green-dark font-normal text-sm m-0"
            style={{ fontFamily: atisaStyles.fonts.secondary }}
          >
            Equipo de trabajo especializado
          </p>
        </div>
      </div>
      {/* end::Col */}

      {/* begin::Col */}
      <div className='col-md-6 col-lg-6 col-xl-6 col-xxl-3 mb-md-5 mb-xl-10'>
        <div className="card-atisa mb-6 h-50 flex flex-col justify-center items-center text-center animate-fade-in">
          <div className="ideogram-atisa ideogram-atisa-primary mb-4 shadow-atisa-button">
            <i className="bi bi-graph-up text-3xl text-white"></i>
          </div>
          <h4 className="font-serif text-atisa-primary font-bold text-2xl m-0 mb-2">
            Métricas
          </h4>
          <p
            className="text-atisa-green-dark font-normal text-sm m-0"
            style={{ fontFamily: atisaStyles.fonts.secondary }}
          >
            Análisis de rendimiento
          </p>
        </div>

        <div className="card-atisa h-50 flex flex-col justify-center items-center text-center animate-fade-in">
          <div className="ideogram-atisa ideogram-atisa-gradient mb-4 shadow-atisa-button">
            <i className="bi bi-list-ul text-3xl text-white"></i>
          </div>
          <h4 className="font-serif text-atisa-primary font-bold text-2xl m-0 mb-2">
            Listas
          </h4>
          <p
            className="text-atisa-green-dark font-normal text-sm m-0"
            style={{ fontFamily: atisaStyles.fonts.secondary }}
          >
            Elementos organizados
          </p>
        </div>
      </div>
      {/* end::Col */}

      {/* begin::Col */}
      <div className='col-xxl-6'>
        <div className="card-atisa p-8 h-96 flex flex-col justify-center items-center text-center animate-slide-up">
          <div className="ideogram-atisa ideogram-atisa-secondary mb-6 shadow-atisa-button-hover">
            <i className="bi bi-calendar-check text-4xl text-white"></i>
          </div>
          <h3 className="font-serif text-atisa-primary font-bold text-3xl m-0 mb-4">
            Sistema de Gestión
          </h3>
          <p
            className="text-atisa-green-dark font-normal text-base m-0 mb-6 leading-relaxed"
            style={{ fontFamily: atisaStyles.fonts.secondary }}
          >
            Plataforma integral para la gestión de calendarios y documentos empresariales
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <span
              className="bg-atisa-green-light text-atisa-primary px-4 py-2 rounded-full text-xs font-semibold"
              style={{ fontFamily: atisaStyles.fonts.secondary }}
            >
              Calendarios
            </span>
            <span
              className="bg-atisa-green-light text-atisa-primary px-4 py-2 rounded-full text-xs font-semibold"
              style={{ fontFamily: atisaStyles.fonts.secondary }}
            >
              Documentos
            </span>
            <span
              className="bg-atisa-green-light text-atisa-primary px-4 py-2 rounded-full text-xs font-semibold"
              style={{ fontFamily: atisaStyles.fonts.secondary }}
            >
              Procesos
            </span>
          </div>
        </div>
      </div>
      {/* end::Col */}
    </div>
    {/* end::Row */}
  
  </>
)

const DashboardWrapper: FC = () => {
  const intl = useIntl()
  return (
    <>
      <DashboardPage />
    </>
  )
}

export { DashboardWrapper }
