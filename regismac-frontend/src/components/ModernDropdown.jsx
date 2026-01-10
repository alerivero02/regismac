import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

export default function ModernDropdown({
  value,
  onChange,
  options,
  placeholder = "Seleziona...",
  className = "",
  disabled = false,
  size = "default" // "default" | "small"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full ${size === 'small' ? 'px-2 py-1.5 rounded-lg text-xs' : 'px-4 py-3 rounded-xl'} border transition-all duration-200
          ${disabled 
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
            : 'bg-white border-gray-200 hover:border-primary-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent'
          }
          ${isOpen ? 'border-primary-500 shadow-md ring-2 ring-primary-500' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {selectedOption?.icon && (
              <span className={`${size === 'small' ? 'text-sm' : 'text-lg'} ${selectedOption.iconColor || 'text-gray-400'}`}>
                {selectedOption.icon}
              </span>
            )}
            <span className={`${size === 'small' ? 'text-xs' : ''} font-medium ${selectedOption ? 'text-gray-900' : 'text-gray-400'}`}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            {selectedOption?.badge && size !== 'small' && (
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${selectedOption.badgeColor || 'bg-gray-100 text-gray-600'}`}>
                {selectedOption.badge}
              </span>
            )}
          </div>
          <FiChevronDown 
            className={`${size === 'small' ? 'w-3 h-3' : 'w-5 h-5'} text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-full mt-2 bg-white border border-gray-200 ${size === 'small' ? 'rounded-lg' : 'rounded-xl'} shadow-lg overflow-hidden animate-slide-down`}>
          <div className="max-h-64 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                className={`
                  w-full ${size === 'small' ? 'px-2 py-1.5 text-xs' : 'px-4 py-3'} text-left flex items-center gap-2 transition-all duration-150
                  ${value === option.value 
                    ? 'bg-primary-50 text-primary-700 font-semibold' 
                    : 'hover:bg-gray-50 text-gray-700'
                  }
                `}
              >
                {option.icon && (
                  <span className={`${size === 'small' ? 'text-sm' : 'text-lg'} ${option.iconColor || 'text-gray-400'}`}>
                    {option.icon}
                  </span>
                )}
                <span className="flex-1">{option.label}</span>
                {value === option.value && (
                  <FiCheck className={`${size === 'small' ? 'w-3 h-3' : 'w-5 h-5'} text-primary-600`} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

