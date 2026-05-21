import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import DateRangePicker from '../components/DateRangePicker';
import AnalyticsCharts from '../components/AnalyticsCharts';
import ExportButton from '../components/ExportButton';
import { LoadingSpinner, MaterialTable, EmptyState } from '../components';
import api from '../services/api';
import './Reports.css';

const Reports = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [certificateData, setCertificateData] = useState(null);
  const [emailData, setEmailData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [filters, setFilters] = useState({
    eventCategories: [],
    page: 1,
    limit: 20
  });

  useEffect(() => {
    loadAllData();
  }, [dateRange]);

  useEffect(() => {
    if (activeTab === 'certificates') {
      loadCertificateData();
    } else if (activeTab === 'emails') {
      loadEmailData();
    }
  }, [activeTab, filters]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadDashboardData(),
        loadCertificateData(),
        loadEmailData()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const params = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      const response = await api.get('/reports/dashboard', { params });
      if (response.data.success) setDashboardData(response.data.data);
    } catch (error) {
      console.error('Dashboard data error:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  const loadCertificateData = async () => {
    try {
      const params = { page: filters.page, limit: filters.limit };
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      if (filters.eventCategories.length > 0) params.eventCategories = filters.eventCategories.join(',');
      const response = await api.get('/reports/certificates', { params });
      if (response.data.success) setCertificateData(response.data.data);
    } catch (error) {
      console.error('Certificate data error:', error);
      toast.error('Failed to load certificate data');
    }
  };

  const loadEmailData = async () => {
    try {
      const params = { page: filters.page, limit: filters.limit };
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      const response = await api.get('/reports/emails', { params });
      if (response.data.success) setEmailData(response.data.data);
    } catch (error) {
      console.error('Email data error:', error);
      toast.error('Failed to load email data');
    }
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const handleCategoryFilter = (category) => {
    setFilters(prev => ({
      ...prev,
      eventCategories: prev.eventCategories.includes(category)
        ? prev.eventCategories.filter(c => c !== category)
        : [...prev.eventCategories, category],
      page: 1
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Transform backend summary data into table-compatible rows
  const certTableRows = Object.entries(certificateData?.byBatch || {}).map(([id, batch]) => ({
    id,
    name: batch.batch_name,
    certificateId: `${batch.total_certificates || 0} generated`,
    batchName: batch.batch_name,
    eventCategories: [],
    templateName: '-',
    createdAt: new Date().toISOString()
  }));

  const emailTableRows = Object.entries(emailData?.by_campaign || {}).map(([id, campaign]) => ({
    id,
    subject: campaign.subject || '(No subject)',
    batchName: '-',
    totalRecipients: campaign.recipient_count || 0,
    emailsSent: campaign.sent_count || 0,
    emailsDelivered: Math.max(0, (campaign.sent_count || 0) - (campaign.failed_count || 0)),
    emailsFailed: campaign.failed_count || 0,
    deliveryRate: (campaign.recipient_count || 0) > 0
      ? Math.round(((campaign.sent_count || 0) / campaign.recipient_count) * 100)
      : 0,
    status: campaign.status || 'unknown',
    createdAt: campaign.created_at || new Date().toISOString()
  }));

  if (loading && !dashboardData) {
    return (
      <div className="reports-loading">
        <LoadingSpinner 
          size="large" 
          color="primary" 
          message="Loading analytics dashboard..." 
        />
      </div>
    );
  }

  return (
    <div className="reports">
      <div className="container">
        <div className="reports-header">
          <h1>Analytics & Reports Dashboard</h1>
          <div className="header-actions">
            <ExportButton
              reportType="dashboard"
              filters={dateRange}
              label="Export Dashboard"
            />
          </div>
        </div>

        {/* Date Range Picker */}
        <DateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onDateChange={handleDateRangeChange}
        />

        {/* Dashboard Summary */}
        {dashboardData && (
          <div className="dashboard-summary">
            <h2>Summary Statistics</h2>
            <div className="summary-grid">
              <div className="summary-card certificates">
                <div className="card-icon">⊞</div>
                <div className="card-content">
                  <h3>Total Certificates</h3>
                  <div className="card-number">{dashboardData.summary.totalCertificates}</div>
                  <div className="card-subtitle">{dashboardData.summary.totalBatches} batches</div>
                </div>
              </div>

              <div className="summary-card emails">
                <div className="card-icon">⧄</div>
                <div className="card-content">
                  <h3>Mass Mailer</h3>
                  <div className="card-number">{dashboardData.summary.totalEmailCampaigns}</div>
                  <div className="card-subtitle">{dashboardData.summary.totalEmailsSent} emails sent</div>
                </div>
              </div>

              <div className="summary-card delivery">
                <div className="card-icon">⧇</div>
                <div className="card-content">
                  <h3>Delivery Rate</h3>
                  <div className="card-number">{dashboardData.summary.deliveryRate}%</div>
                  <div className="card-subtitle">Email delivery success</div>
                </div>
              </div>

              <div className="summary-card activity">
                <div className="card-icon">✦</div>
                <div className="card-content">
                  <h3>Recent Activity</h3>
                  <div className="card-number">{dashboardData.recentActivity.recentCertificates}</div>
                  <div className="card-subtitle">Certificates this week</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Charts */}
        <AnalyticsCharts
          dashboardData={dashboardData}
          certificateData={certificateData}
          emailData={emailData}
          onRefresh={loadAllData}
        />

        {/* Detailed Reports Tabs */}
        <div className="reports-tabs">
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`tab-button ${activeTab === 'certificates' ? 'active' : ''}`}
              onClick={() => setActiveTab('certificates')}
            >
              Certificates
            </button>
            <button
              className={`tab-button ${activeTab === 'emails' ? 'active' : ''}`}
              onClick={() => setActiveTab('emails')}
            >
              Mass Mailer
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'certificates' && certificateData && (
              <div className="certificates-report">
                <div className="report-header">
                  <h3>Certificate Generation Report</h3>
                  <div className="report-actions">
                    <ExportButton
                      reportType="certificates"
                      filters={{ ...dateRange, eventCategories: filters.eventCategories }}
                      label="Export Certificates"
                    />
                  </div>
                </div>

                {/* Category Filters */}
                <div className="category-filters">
                  <h4>Filter by Event Categories:</h4>
                  <div className="category-buttons">
                    {['Technical', 'Non-technical', 'Spiritual', 'Administrative', 'Humanitarian', 'STEM'].map(category => (
                      <button
                        key={category}
                        className={`category-filter-btn ${filters.eventCategories.includes(category) ? 'active' : ''}`}
                        onClick={() => handleCategoryFilter(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Certificates Table */}
                <MaterialTable
                  columns={[
                    {
                      key: 'name',
                      title: 'Name',
                      width: '200px'
                    },
                    {
                      key: 'certificateId',
                      title: 'Certificate ID',
                      width: '180px',
                      render: (value) => (
                        <span className="certificate-id">{value}</span>
                      )
                    },
                    {
                      key: 'batchName',
                      title: 'Batch',
                      width: '150px'
                    },
                    {
                      key: 'eventCategories',
                      title: 'Categories',
                      sortable: false,
                      render: (categories) => (
                        <div className="categories">
                          {categories?.map(cat => (
                            <span key={cat} className="category-tag">{cat}</span>
                          ))}
                        </div>
                      )
                    },
                    {
                      key: 'templateName',
                      title: 'Template',
                      width: '150px'
                    },
                    {
                      key: 'createdAt',
                      title: 'Created',
                      width: '120px',
                      render: (value) => new Date(value).toLocaleDateString()
                    }
                  ]}
                  data={certTableRows}
                  hoverable={true}
                  sortable={true}
                  emptyState={
                    <EmptyState
                      icon=""
                      title="No certificates found"
                      description="No certificates match your current filters. Try adjusting the date range or category filters."
                    />
                  }
                  className="elevation-2"
                />

                {/* Pagination */}
                {certificateData?.pagination?.totalPages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={() => handlePageChange((certificateData?.pagination?.page || 1) - 1)}
                      disabled={(certificateData?.pagination?.page || 1) <= 1}
                      className="btn btn-secondary"
                    >
                      Previous
                    </button>
                    
                    <span className="page-info">
                      Page {certificateData?.pagination?.page || 1} of {certificateData?.pagination?.totalPages || 1}
                      ({certificateData?.pagination?.total || 0} total certificates)
                    </span>
                    
                    <button
                      onClick={() => handlePageChange((certificateData?.pagination?.page || 1) + 1)}
                      disabled={(certificateData?.pagination?.page || 1) >= (certificateData?.pagination?.totalPages || 1)}
                      className="btn btn-secondary"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'emails' && emailData && (
              <div className="emails-report">
                <div className="report-header">
                  <h3>Email Campaign Analytics</h3>
                  <div className="report-actions">
                    <ExportButton
                      reportType="emails"
                      filters={dateRange}
                      label="Export Email Data"
                    />
                  </div>
                </div>

                {/* Mass Mailer Table */}
                <MaterialTable
                  columns={[
                    {
                      key: 'subject',
                      title: 'Subject',
                      width: '200px',
                      render: (value) => (
                        <span className="campaign-subject" title={value}>{value}</span>
                      )
                    },
                    {
                      key: 'batchName',
                      title: 'Batch',
                      width: '150px'
                    },
                    {
                      key: 'totalRecipients',
                      title: 'Recipients',
                      width: '100px',
                      align: 'center'
                    },
                    {
                      key: 'emailsSent',
                      title: 'Sent',
                      width: '80px',
                      align: 'center'
                    },
                    {
                      key: 'emailsDelivered',
                      title: 'Delivered',
                      width: '100px',
                      align: 'center'
                    },
                    {
                      key: 'emailsFailed',
                      title: 'Failed',
                      width: '80px',
                      align: 'center'
                    },
                    {
                      key: 'deliveryRate',
                      title: 'Delivery Rate',
                      width: '120px',
                      align: 'center',
                      render: (value) => (
                        <span className={`delivery-rate ${value >= 90 ? 'excellent' : value >= 70 ? 'good' : 'poor'}`}>
                          {value}%
                        </span>
                      )
                    },
                    {
                      key: 'status',
                      title: 'Status',
                      width: '100px',
                      align: 'center',
                      render: (value) => (
                        <span className={`status-badge ${value}`}>
                          {value}
                        </span>
                      )
                    },
                    {
                      key: 'createdAt',
                      title: 'Created',
                      width: '120px',
                      render: (value) => new Date(value).toLocaleDateString()
                    }
                  ]}
                  data={emailTableRows}
                  hoverable={true}
                  sortable={true}
                  emptyState={
                    <EmptyState
                      icon=""
                      title="No email campaigns found"
                      description="No email campaigns match your current filters. Try adjusting the date range."
                    />
                  }
                  className="elevation-2"
                />

                {/* Email Pagination */}
                {emailData?.pagination?.totalPages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={() => handlePageChange((emailData?.pagination?.page || 1) - 1)}
                      disabled={(emailData?.pagination?.page || 1) <= 1}
                      className="btn btn-secondary"
                    >
                      Previous
                    </button>
                    
                    <span className="page-info">
                      Page {emailData?.pagination?.page || 1} of {emailData?.pagination?.totalPages || 1}
                      ({emailData?.pagination?.total || 0} total campaigns)
                    </span>
                    
                    <button
                      onClick={() => handlePageChange((emailData?.pagination?.page || 1) + 1)}
                      disabled={(emailData?.pagination?.page || 1) >= (emailData?.pagination?.totalPages || 1)}
                      className="btn btn-secondary"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;