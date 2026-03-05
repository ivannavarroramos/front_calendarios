import React, {useEffect, useRef} from 'react'
import ApexCharts, {ApexOptions} from 'apexcharts'
import {ClienteData} from '../../../api/metricas'

type Props = {
  className: string
  clientesData: ClienteData[]
}

const HitosPorClienteChart: React.FC<Props> = ({className, clientesData}) => {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const {mode} = { mode: "light" }

  useEffect(() => {
    const chart = refreshChart()

    return () => {
      if (chart) {
        chart.destroy()
      }
    }
  }, [chartRef, mode, clientesData])

  const refreshChart = () => {
    if (!chartRef.current) {
      return
    }

    const height = parseInt(window.getComputedStyle(chartRef.current).height)
    const chart = new ApexCharts(chartRef.current, getChartOptions(height, clientesData))
    if (chart) {
      chart.render()
    }

    return chart
  }

  return (
    <div className={`${className}`}>
      <div ref={chartRef} style={{height: '350px'}} />
    </div>
  )
}

function getChartOptions(height: number, clientesData: ClienteData[]): ApexOptions {
  const labelColor = '#64748B'
  const borderColor = '#E2E8F0'
  const baseColor = 'var(--atisa-primary)'
  const secondaryColor = '#E2E8F0'

  // Truncar nombres de clientes si son muy largos
  const categories = clientesData.map(item => {
    const nombre = item.clienteNombre.trim()
    return nombre.length > 25 ? nombre.substring(0, 22) + '...' : nombre
  })

  const completadosData = clientesData.map(item => item.hitosCompletados || 0)
  const pendientesData = clientesData.map(item => item.hitosPendientes || 0)

  return {
    series: [
      {
        name: 'Completados',
        data: completadosData,
      },
      {
        name: 'Pendientes',
        data: pendientesData,
      },
    ],
    chart: {
      fontFamily: 'inherit',
      type: 'bar',
      height: height,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '30%',
        borderRadius: 5,
      },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent'],
    },
    xaxis: {
      categories: categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: labelColor,
          fontSize: '11px',
        },
        rotate: -45,
        rotateAlways: true,
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: labelColor,
          fontSize: '12px',
        },
      },
    },
    fill: {
      opacity: 1,
    },
    states: {
      normal: {
        filter: {
          type: 'none',
          value: 0,
        },
      },
      hover: {
        filter: {
          type: 'none',
          value: 0,
        },
      },
      active: {
        allowMultipleDataPointsSelection: false,
        filter: {
          type: 'none',
          value: 0,
        },
      },
    },
    tooltip: {
      style: {
        fontSize: '12px',
      },
      y: {
        formatter: function (val) {
          return val + ' hitos'
        },
      },
    },
    colors: [baseColor, secondaryColor],
    grid: {
      borderColor: borderColor,
      strokeDashArray: 4,
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
  }
}

export {HitosPorClienteChart}
