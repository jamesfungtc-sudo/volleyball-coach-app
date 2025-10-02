import React from 'react';
import './ConditionalDropdown.css';

interface ConditionalDropdownProps {
  label: string;
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
  show: boolean;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

/**
 * ConditionalDropdown - Dropdown that shows/hides based on condition
 * Used for subcategory and location/tempo selection
 */
export function ConditionalDropdown({
  label,
  options,
  value,
  onChange,
  show,
  required = false,
  placeholder = 'Select...',
  disabled = false,
  error
}: ConditionalDropdownProps) {
  if (!show) return null;

  return (
    <div className="conditional-dropdown">
      <label htmlFor={`dropdown-${label}`} className="dropdown-label">
        {label}
        {required && <span className="required-indicator">*</span>}
      </label>
      <select
        id={`dropdown-${label}`}
        className={`dropdown-select ${error ? 'error' : ''}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}
