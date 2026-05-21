import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import './AnalyticsCharts.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

const AnalyticsCharts = ({ dashboardData, certificateData, emailData, onRefresh }) => {
  const [selectedChart, setSelectedChart] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const chartRefs = useRef({});

  // Auto-refresh data every 30 seconds for real-time updates
  useEffect(() => {
    if (onRefresh) {
      const interval = setInterval(() => {
        onRefresh();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [onRefresh]);

  const handleChartClick = (chartType) => {
    setSelectedChart(chartType);
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    setSelectedChart(null);
  };
  // Certificate generation by category chart with enhanced interactivity
  const categoryChartData = {
    labels: Object.keys(certificateData?.categoryBreakdown || {}),
    datasets: [
      {
        label: 'Certificates Generated',
        data: Object.values(certificateData?.categoryBreakdown || {}),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        hoverBorderWidth: 3,
      },
    ],
  };

  // Email delivery status chart with enhanced styling
  const emailDeliveryData = {
    labels: ['Delivered', 'Sent', 'Failed', 'Bounced'],
    datasets: [
      {
        data: [
          dashboardData?.emailDeliveryStats?.delivered || 0,
          dashboardData?.emailDeliveryStats?.sent || 0,
          dashboardData?.emailDeliveryStats?.failed || 0,
          dashboardData?.emailDeliveryStats?.bounced || 0,
        ],
        backgroundColor: [
          'rgba(40, 167, 69, 0.8)',
          'rgba(23, 162, 184, 0.8)',
          'rgba(220, 53, 69, 0.8)',
          'rgba(255, 193, 7, 0.8)'
        ],
        borderColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(23, 162, 184, 1)',
          'rgba(220, 53, 69, 1)',
          'rgba(255, 193, 7, 1)'
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(23, 162, 184, 1)',
          'rgba(220, 53, 69, 1)',
          'rgba(255, 193, 7, 1)'
        ],
        hoverBorderWidth: 3,
      },
    ],
  };

  // Certificate generation trend with real data and enhanced styling
  const trendData = {
    labels: dashboardData?.trendData?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Certificates Generated',
        data: dashboardData?.trendData?.certificates || [65, 59, 80, 81, 56, 55],
        fill: true,
        borderColor: 'rgba(0, 123, 255, 1)',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.4,
        pointBackgroundColor: 'rgba(0, 123, 255, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
      {
        label: 'Emails Sent',
        data: dashboardData?.trendData?.emails || [28, 48, 40, 19, 86, 27],
        fill: true,
        borderColor: 'rgba(40, 167, 69, 1)',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        tension: 0.4,
        pointBackgroundColor: 'rgba(40, 167, 69, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ],
  };

  // Email campaign performance
  const campaignPerformanceData = {
    labels: emailData?.campaigns?.slice(0, 5).map(campaign => 
      campaign.subject.length > 20 ? campaign.subject.substring(0, 20) + '...' : campaign.subject
    ) || [],
    datasets: [
      {
        label: 'Delivery Rate (%)',
        data: emailData?.campaigns?.slice(0, 5).map(campaign => campaign.deliveryRate) || [],
        backgroundColor: '#36A2EB',
        borderColor: '#36A2EB',
        borderWidth: 1,
      },
    ],
  };

  // Enhanced chart options with interactivity
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    animation: {
      duration: animationEnabled ? 1000 : 0,
      easing: 'easeInOutQuart',
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        // Handle chart click interactions
        console.log('Chart clicked:', elements[0]);
      }
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      },
    },
    animation: {
      duration: animationEnabled ? 1000 : 0,
      easing: 'easeInOutQuart',
    },
  };

  const lineOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        ticks: {
          callback: function(value) {
            return value.toLocaleString();
          }
        }
      }
    },
    elements: {
      point: {
        hoverRadius: 8,
      },
    },
  };

  return (
    <div className="analytics-charts">
      {/* Chart Controls */}
      <div className="chart-controls">
        <div className="control-group">
          <button
            className={`control-btn ${animationEnabled ? 'active' : ''}`}
            onClick={() => setAnimationEnabled(!animationEnabled)}
            title="Toggle animations"
          >
            🎬 Animations
          </button>
          <button
            className="control-btn refresh-btn"
            onClick={onRefresh}
            title="Refresh data"
          >
            🔄 Refresh
          </button>
        </div>
        <div className="real-time-indicator">
          <span className="indicator-dot"></span>
          Real-time updates every 30s
        </div>
      </div>

      <div className="charts-grid">
        {/* Certificate Categories */}
        <div className="chart-container interactive" onClick={() => handleChartClick('categories')}>
          <div className="chart-header">
            <h3>📊 Certificates by Category</h3>
            <button className="expand-btn" title="Expand chart">⛶</button>
          </div>
          <div className="chart-wrapper">
            <Bar 
              ref={el => chartRefs.current.categories = el}
              data={categoryChartData} 
              options={chartOptions} 
            />
          </div>
          <div className="chart-summary">
            Total: {Object.values(certificateData?.categoryBreakdown || {}).reduce((a, b) => a + b, 0)} certificates
          </div>
        </div>

        {/* Email Delivery Status */}
        <div className="chart-container interactive" onClick={() => handleChartClick('delivery')}>
          <div className="chart-header">
            <h3>📧 Email Delivery Status</h3>
            <button className="expand-btn" title="Expand chart">⛶</button>
          </div>
          <div className="chart-wrapper">
            <Doughnut 
              ref={el => chartRefs.current.delivery = el}
              data={emailDeliveryData} 
              options={doughnutOptions} 
            />
          </div>
          <div className="chart-summary">
            Success Rate: {dashboardData?.emailDeliveryStats ? 
              Math.round((dashboardData.emailDeliveryStats.delivered / 
              (dashboardData.emailDeliveryStats.delivered + dashboardData.emailDeliveryStats.failed)) * 100) : 0}%
          </div>
        </div>

        {/* Generation Trend */}
        <div className="chart-container full-width interactive" onClick={() => handleChartClick('trend')}>
          <div className="chart-header">
            <h3>📈 Generation Trend Over Time</h3>
            <button className="expand-btn" title="Expand chart">⛶</button>
          </div>
          <div className="chart-wrapper">
            <Line 
              ref={el => chartRefs.current.trend = el}
              data={trendData} 
              options={lineOptions} 
            />
          </div>
          <div className="chart-summary">
            Peak: {Math.max(...(dashboardData?.trendData?.certificates || [65, 59, 80, 81, 56, 55]))} certificates
          </div>
        </div>

        {/* Campaign Performance */}
        <div className="chart-container full-width interactive" onClick={() => handleChartClick('campaigns')}>
          <div className="chart-header">
            <h3>🎯 Email Campaign Performance</h3>
            <button className="expand-btn" title="Expand chart">⛶</button>
          </div>
          <div className="chart-wrapper">
            <Bar 
              ref={el => chartRefs.current.campaigns = el}
              data={campaignPerformanceData} 
              options={chartOptions} 
            />
          </div>
          <div className="chart-summary">
            Avg Delivery Rate: {emailData?.campaigns ? 
              Math.round(emailData.campaigns.reduce((acc, camp) => acc + camp.deliveryRate, 0) / emailData.campaigns.length) : 0}%
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && selectedChart && (
        <div className="chart-fullscreen-modal" onClick={closeFullscreen}>
          <div className="fullscreen-content" onClick={e => e.stopPropagation()}>
            <div className="fullscreen-header">
              <h2>
                {selectedChart === 'categories' && '📊 Certificates by Category'}
                {selectedChart === 'delivery' && '📧 Email Delivery Status'}
                {selectedChart === 'trend' && '📈 Generation Trend Over Time'}
                {selectedChart === 'campaigns' && '🎯 Email Campaign Performance'}
              </h2>
              <button className="close-btn" onClick={closeFullscreen}>✕</button>
            </div>
            <div className="fullscreen-chart">
              {selectedChart === 'categories' && <Bar data={categoryChartData} options={chartOptions} />}
              {selectedChart === 'delivery' && <Doughnut data={emailDeliveryData} options={doughnutOptions} />}
              {selectedChart === 'trend' && <Line data={trendData} options={lineOptions} />}
              {selectedChart === 'campaigns' && <Bar data={campaignPerformanceData} options={chartOptions} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsCharts;