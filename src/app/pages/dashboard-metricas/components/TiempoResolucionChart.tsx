import React, {useEffect, useRef} from 'react'
import ApexCharts, {ApexOptions} from 'apexcharts'
import {ResolucionData} from '../../../api/metricas'

type Props = {
  className: string
  resolucionData: ResolucionData[]
}

const TiempoResolucionChart: React.FC<Props> = ({className, resolucionData}) => {
  const chartRef = useRef<HTMLDivElement | null>(null)
  const {mode} = { mode: "light" }
  
  const refreshMode = () => {
    if (!chartRef.current) {
      return
    }

    const chart = new ApexCharts(chartRef.current, getChartOptions(resolucionData))
    if (chart) {
      chart.render()
    }

    return chart
  }

  useEffect(() => {
    const chart = refreshMode()

    return () => {
      if (chart) {
        chart.destroy()
      }
    }
  }, [chartRef, mode, resolucionData])

  return (
    <div className={`${className}`}>
      <div ref={chartRef} style={{height: '350px'}}></div>
    </div>
  )
}

function getChartOptions(resolucionData: ResolucionData[]): ApexOptions {
  const labelColor = '#64748B'
  const borderColor = '#E2E8F0'
  const baseColor = 'var(--atisa-accent)'
  const lightColor = '#E6F6FB'

  const categories = resolucionData.map(item => item.periodo)
  const data = resolucionData.map(item => item.tiempoMedio)

  return {
    series: [
      {
        name: 'Tiempo Promedio (días)',
        data: data,
      },
    ],
    chart: {
      fontFamily: 'inherit',
      type: 'area',
      height: 350,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {},
    legend: {
      show: false,
    },
    dataLabels: {
      enabled: false,
    },
    fill: {
      type: 'solid',
      opacity: 1,
    },
    stroke: {
      curve: 'smooth',
      show: true,
      width: 3,
      colors: [baseColor],
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
      crosshairs: {
        position: 'front',
        stroke: {
          color: baseColor,
          width: 1,
          dashArray: 3,
        },
      },
      tooltip: {
        enabled: true,
        formatter: undefined,
        offsetY: 0,
        style: {
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
          return val + ' días'
        },
      },
    },
    colors: [lightColor],
    grid: {
      borderColor: borderColor,
      strokeDashArray: 4,
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    markers: {
      strokeColors: baseColor,
      strokeWidth: 3,
    },
  }
}

export {TiempoResolucionChart}