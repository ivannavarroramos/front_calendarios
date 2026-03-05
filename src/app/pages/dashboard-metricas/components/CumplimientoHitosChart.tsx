import React, {useEffect, useRef} from 'react'
import ApexCharts, {ApexOptions} from 'apexcharts'

type Props = {
  className?: string
  chartColor: string
  chartHeight: string
  porcentaje: number
}

const CumplimientoHitosChart: React.FC<Props> = ({className, chartColor, chartHeight, porcentaje}) => {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const {mode} = { mode: "light" }

  const refreshChart = () => {
    if (!chartRef.current) {
      return
    }

    const chart = new ApexCharts(chartRef.current, chartOptions(chartColor, chartHeight, porcentaje))
    if (chart) {
      chart.render()
    }

    return chart
  }

  useEffect(() => {
    const chart = refreshChart()

    return () => {
      if (chart) {
        chart.destroy()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartRef, mode, porcentaje])

  return (
    <div className='d-flex flex-column h-100'>
      <div className='d-flex align-items-center justify-content-center flex-grow-1'>
        <div ref={chartRef} className='mixed-widget-4-chart' style={{width: '100%'}}></div>
      </div>
      <div className='text-center mt-3'>
        <div className='d-flex justify-content-center align-items-center'>
          <div className='me-4'>
            <span className='text-muted fs-7'>Porcentaje</span>
            <h3 className='text-primary fw-bold'>{porcentaje}%</h3>
          </div>
          <div>
            <span className='text-muted fs-7'>Estado</span>
            <div className={`badge badge-light-${porcentaje >= 80 ? 'success' : porcentaje >= 60 ? 'warning' : 'danger'} fs-8`}>
              {porcentaje >= 80 ? 'Excelente' : porcentaje >= 60 ? 'Bueno' : 'Mejorar'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const chartOptions = (chartColor: string, chartHeight: string, porcentaje: number): ApexOptions => {
  const baseColor = 'var(--atisa-' + (chartColor === "primary" ? "primary" : chartColor === "success" ? "secondary" : chartColor === "danger" ? "danger" : "accent") + ')'
  const lightColor = 'var(--atisa-bg-body)'
  const labelColor = '#475569'

  return {
    series: [porcentaje],
    chart: {
      fontFamily: 'inherit',
      height: chartHeight,
      type: 'radialBar',
    },
    plotOptions: {
      radialBar: {
        hollow: {
          margin: 0,
          size: '65%',
        },
        dataLabels: {
          name: {
            show: false,
            fontWeight: '700',
          },
          value: {
            color: labelColor,
            fontSize: '30px',
            fontWeight: '700',
            offsetY: 12,
            show: true,
            formatter: function (val) {
              return val + '%'
            },
          },
        },
        track: {
          background: lightColor,
          strokeWidth: '100%',
        },
      },
    },
    colors: [baseColor],
    stroke: {
      lineCap: 'round',
    },
    labels: ['Cumplimiento'],
  }
}

export {CumplimientoHitosChart}
