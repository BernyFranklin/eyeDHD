import ApexCharts from 'apexcharts';

import React, { useEffect, useState, useRef } from 'react';

import LoadingOverlay from '../LoadingOverlay';
import AlertWindow from '../AlertWindow';
import Button from '../Button';

// #region Sample data
const data = [
  {
    name: 'Page A',
    uv: 400,
    pv: 2400,
    amt: 2400
  },
  {
    name: 'Page B',
    uv: 300,
    pv: 4567,
    amt: 2400
  },
  {
    name: 'Page C',
    uv: 320,
    pv: 1398,
    amt: 2400
  },
  {
    name: 'Page D',
    uv: 200,
    pv: 9800,
    amt: 2400
  },
  {
    name: 'Page E',
    uv: 278,
    pv: 3908,
    amt: 2400
  },
  {
    name: 'Page F',
    uv: 189,
    pv: 4800,
    amt: 2400
  }
];

// #endregion
export const Chart = () => {
  const [error, setError] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHidden, setIsHidden] = useState(true);

  const chartRef = useRef(null);

  const styles = {
    container: {
      textAlign: ' center',
      backgroundColor: '#fff',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'row',
      width: '100%',
      margin: '2rem auto',
      alignItems: 'stretch',
      justifyContent: 'center',
      gap: '2rem'
    },
    buttonContainer: {
      display: 'flex',
      flexDirection: 'row',
      gap: '10px',
      justifyContent: 'center',
      marginTop: '1rem'
    },
    buttonInline: {
      display: 'inline-block'
    },
    singlePane: {
      width: '40%',
      padding: '1rem',
      border: '1px solid #ccc',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  };

  useEffect(() => {
    const chart = new ApexCharts(document.getElementById(id), {
      chart: { type: 'line', height: 350 },
      series: [
        {
          name: 'uv',
          data: data.map((entry) => entry.uv)
        }
      ],
      xaxis: { categories: data.map((entry) => entry.name) }
    });

    chart.render();
  }, []);

  const id = Date.now().toString(); // Generate a unique ID for the chart container

  return (
    <>
      <div
        className="dilation-chart-container"
        style={styles.container as React.CSSProperties}
      >
        {/*Used for when things take awhile to load*/}
        <LoadingOverlay isLoading={isLoading} />
        <h3>Chart Dilation</h3>
        <div id={id} ref={chartRef} />
      </div>
    </>
  );
};
