import React, { useState } from 'react';
import './MaterialTable.css';

const MaterialTable = ({
  columns = [],
  data = [],
  sortable = true,
  hoverable = true,
  selectable = false,
  emptyState = null,
  onRowSelect = null,
  onSort = null,
  className = '',
  ...props
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedRows, setSelectedRows] = useState(new Set());

  const handleSort = (columnKey) => {
    if (!sortable || !columnKey) return;

    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    const newSortConfig = { key: columnKey, direction };
    setSortConfig(newSortConfig);

    if (onSort) {
      onSort(newSortConfig);
    }
  };

  const handleRowSelect = (rowIndex, isSelected) => {
    const newSelectedRows = new Set(selectedRows);
    
    if (isSelected) {
      newSelectedRows.add(rowIndex);
    } else {
      newSelectedRows.delete(rowIndex);
    }
    
    setSelectedRows(newSelectedRows);
    
    if (onRowSelect) {
      onRowSelect(Array.from(newSelectedRows));
    }
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      const allRows = new Set(data.map((_, index) => index));
      setSelectedRows(allRows);
      if (onRowSelect) {
        onRowSelect(Array.from(allRows));
      }
    } else {
      setSelectedRows(new Set());
      if (onRowSelect) {
        onRowSelect([]);
      }
    }
  };

  const getSortIcon = (columnKey) => {
    if (!sortable || sortConfig.key !== columnKey) {
      return <span className="sort-icon inactive">↕️</span>;
    }
    return (
      <span className="sort-icon active">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const renderCellContent = (column, row, rowIndex) => {
    if (column.render) {
      return column.render(row[column.key], row, rowIndex);
    }
    return row[column.key];
  };

  if (data.length === 0 && emptyState) {
    return (
      <div className={`material-table-container ${className}`} {...props}>
        <div className="material-table-empty">
          {emptyState}
        </div>
      </div>
    );
  }

  return (
    <div className={`material-table-container ${className}`} {...props}>
      <div className="material-table-wrapper">
        <table className="material-table">
          <thead>
            <tr>
              {selectable && (
                <th className="material-table-checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="material-checkbox"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`material-table-header ${
                    sortable && column.sortable !== false ? 'sortable' : ''
                  } ${column.align ? `align-${column.align}` : ''}`}
                  onClick={() => sortable && column.sortable !== false && handleSort(column.key)}
                  style={{ width: column.width }}
                >
                  <div className="header-content">
                    <span className="header-text">{column.title}</span>
                    {sortable && column.sortable !== false && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                className={`material-table-row ${
                  hoverable ? 'hoverable' : ''
                } ${selectedRows.has(rowIndex) ? 'selected' : ''}`}
              >
                {selectable && (
                  <td className="material-table-checkbox-column">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(rowIndex)}
                      onChange={(e) => handleRowSelect(rowIndex, e.target.checked)}
                      className="material-checkbox"
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`material-table-cell ${
                      column.align ? `align-${column.align}` : ''
                    }`}
                  >
                    {renderCellContent(column, row, rowIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaterialTable;