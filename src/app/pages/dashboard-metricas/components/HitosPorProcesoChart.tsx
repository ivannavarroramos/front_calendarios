import React, {useEffect, useRef} from 'react'
import ApexCharts, {ApexOptions} from 'apexcharts'
import {ProcesoData} from '../../../api/metricas'

type Props = {
  className: string
  procesoData: ProcesoData[]
}

const HitosPorProcesoChart: React.FC<Props> = ({className, procesoData}) => {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const {mode} = { mode: "light" }

  useEffect(() => {
    const chart = refreshChart()

    return () => {
      if (chart) {
        chart.destroy()
      }
    }
  }, [chartRef, mode, procesoData])

  const refreshChart = () => {
    if (!chartRef.current) {
      return
    }

    const height = parseInt(window.getComputedStyle(chartRef.current).height)
    const chart = new ApexCharts(chartRef.current, getChartOptions(height, procesoData))
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

function getChartOptions(height: number, procesoData: ProcesoData[]): ApexOptions {
  const labelColor = '#64748B'
  const borderColor = '#E2E8F0'
  const baseColor = 'var(--atisa-primary)'
  const secondaryColor = '#CBD5E1'

  const categories = procesoData.map(item => item.nombreProceso)
  const completadosData = procesoData.map(item => item.hitosCompletados)
  const pendientesData = procesoData.map(item => item.hitosPendientes)

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
      show: false,
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
          fontSize: '12px',
        },
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

export {HitosPorProcesoChart}