import React from 'react';
import './SegmentedControl.css';

export interface SegmentedControlOption {
  key: string;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

/**
 * SegmentedControl - Generic segmented control for multiple choice selection
 * Used for category selection in point entry form
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  disabled = false,
  className = '',
  ariaLabel
}: SegmentedControlProps) {
  return (
    <div
      className={`segmented-control ${className}`}
      role="radiogroup"
      aria-label={ariaLabel || 'Select option'}
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={value === option.key}
          className={`segment-btn ${value === option.key ? 'active' : ''}`}
          onClick={() => onChange(option.key)}
          disabled={disabled || option.disabled}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
