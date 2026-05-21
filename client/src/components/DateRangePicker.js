import React, { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, isValid, parseISO } from 'date-fns';
import './DateRangePicker.css';

const DateRangePicker = ({ startDate, endDate, onDateChange }) => {
  const [activePreset, setActivePreset] = useState('');
  const [isCustomRange, setIsCustomRange] = useState(false);

  useEffect(() => {
    // Determine which preset is active based on current dates
    if (!startDate && !endDate) {
      setActivePreset('all');
    } else {
      setActivePreset('');
      setIsCustomRange(true);
    }
  }, [startDate, endDate]);
  const handlePresetClick = (preset) => {
    const today = new Date();
    let start, end;

    switch (preset) {
      case 'today':
        start = end = today;
        break;
      case 'yesterday':
        start = end = subDays(today, 1);
        break;
      case 'last7days':
        start = subDays(today, 6);
        end = today;
        break;
      case 'last30days':
        start = subDays(today, 29);
        end = today;
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'last3months':
        start = subMonths(today, 3);
        end = today;
        break;
      case 'last6months':
        start = subMonths(today, 6);
        end = today;
        break;
      case 'all':
        start = null;
        end = null;
        break;
      default:
        return;
    }

    setActivePreset(preset);
    setIsCustomRange(false);

    onDateChange({
      startDate: start ? format(start, 'yyyy-MM-dd') : '',
      endDate: end ? format(end, 'yyyy-MM-dd') : ''
    });
  };

  const handleCustomDateChange = (field, value) => {
    setActivePreset('');
    setIsCustomRange(true);
    
    const newRange = {
      startDate: field === 'start' ? value : startDate,
      endDate: field === 'end' ? value : endDate
    };

    // Validate date range
    if (newRange.startDate && newRange.endDate) {
      const start = parseISO(newRange.startDate);
      const end = parseISO(newRange.endDate);
      
      if (isValid(start) && isValid(end) && start > end) {
        // Swap dates if start is after end
        newRange.startDate = format(end, 'yyyy-MM-dd');
        newRange.endDate = format(start, 'yyyy-MM-dd');
      }
    }

    onDateChange(newRange);
  };

  const clearDateRange = () => {
    setActivePreset('all');
    setIsCustomRange(false);
    onDateChange({ startDate: '', endDate: '' });
  };

  const getDateRangeText = () => {
    if (!startDate && !endDate) return 'All time';
    if (startDate && endDate) {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      if (isValid(start) && isValid(end)) {
        return `${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`;
      }
    }
    return 'Custom range';
  };

  return (
    <div className="date-range-picker">
      <div className="date-range-header">
        <h4>📅 Date Range Filter</h4>
        <div className="current-range">
          <span className="range-text">{getDateRangeText()}</span>
          {(startDate || endDate) && (
            <button className="clear-btn" onClick={clearDateRange} title="Clear date range">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="preset-buttons">
        <button 
          onClick={() => handlePresetClick('today')} 
          className={`preset-btn ${activePreset === 'today' ? 'active' : ''}`}
        >
          Today
        </button>
        <button 
          onClick={() => handlePresetClick('yesterday')} 
          className={`preset-btn ${activePreset === 'yesterday' ? 'active' : ''}`}
        >
          Yesterday
        </button>
        <button 
          onClick={() => handlePresetClick('last7days')} 
          className={`preset-btn ${activePreset === 'last7days' ? 'active' : ''}`}
        >
          Last 7 Days
        </button>
        <button 
          onClick={() => handlePresetClick('last30days')} 
          className={`preset-btn ${activePreset === 'last30days' ? 'active' : ''}`}
        >
          Last 30 Days
        </button>
        <button 
          onClick={() => handlePresetClick('thisMonth')} 
          className={`preset-btn ${activePreset === 'thisMonth' ? 'active' : ''}`}
        >
          This Month
        </button>
        <button 
          onClick={() => handlePresetClick('lastMonth')} 
          className={`preset-btn ${activePreset === 'lastMonth' ? 'active' : ''}`}
        >
          Last Month
        </button>
        <button 
          onClick={() => handlePresetClick('last3months')} 
          className={`preset-btn ${activePreset === 'last3months' ? 'active' : ''}`}
        >
          Last 3 Months
        </button>
        <button 
          onClick={() => handlePresetClick('last6months')} 
          className={`preset-btn ${activePreset === 'last6months' ? 'active' : ''}`}
        >
          Last 6 Months
        </button>
        <button 
          onClick={() => handlePresetClick('all')} 
          className={`preset-btn ${activePreset === 'all' ? 'active' : ''}`}
        >
          All Time
        </button>
      </div>
      
      <div className="custom-date-section">
        <div className="section-header">
          <span>Custom Date Range</span>
          {isCustomRange && <span className="custom-indicator">Active</span>}
        </div>
        <div className="custom-date-inputs">
          <div className="date-input-group">
            <label>From:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
              max={endDate || format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div className="date-input-group">
            <label>To:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
              min={startDate}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;