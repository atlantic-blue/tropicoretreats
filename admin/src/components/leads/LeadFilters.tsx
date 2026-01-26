import { useState, useRef, useEffect } from 'react';
import { Search, X, Calendar, ChevronDown } from 'lucide-react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { useFilters } from '../../hooks/useFilters';
import { useUsers } from '../../hooks/useLeads';
import type { LeadStatus, Temperature } from '../../types/lead';
import 'react-day-picker/style.css';

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUOTED', label: 'Quoted' },
  { value: 'WON', label: 'Won' },
  { value: 'LOST', label: 'Lost' },
];

const TEMPERATURE_OPTIONS: { value: Temperature; label: string }[] = [
  { value: 'HOT', label: 'Hot' },
  { value: 'WARM', label: 'Warm' },
  { value: 'COLD', label: 'Cold' },
];

interface MultiSelectProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}

function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        <span className="text-gray-700">{label}</span>
        {selected.length > 0 && (
          <span className="bg-teal-100 text-teal-800 text-xs font-medium px-2 py-0.5 rounded-full">
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="py-1">
            {options.map(option => (
              <label
                key={option.value}
                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => toggleOption(option.value)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function LeadFilters() {
  const { filters, setFilter, setFilters, clearFilters, hasActiveFilters } = useFilters();
  const { data: users } = useUsers();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dateRange: DateRange | undefined = filters.dateFrom || filters.dateTo
    ? {
        from: filters.dateFrom ? parseISO(filters.dateFrom) : undefined,
        to: filters.dateTo ? parseISO(filters.dateTo) : undefined,
      }
    : undefined;

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    // Use setFilters to update both from and to in a single operation
    // This prevents race conditions where the second setFilter overwrites the first
    setFilters({
      from: range?.from ? format(range.from, 'yyyy-MM-dd') : '',
      to: range?.to ? format(range.to, 'yyyy-MM-dd') : '',
    });
  };

  const formatDateRange = () => {
    if (filters.dateFrom && filters.dateTo) {
      return `${format(parseISO(filters.dateFrom), 'MMM d')} - ${format(parseISO(filters.dateTo), 'MMM d')}`;
    }
    if (filters.dateFrom) {
      return `From ${format(parseISO(filters.dateFrom), 'MMM d')}`;
    }
    if (filters.dateTo) {
      return `Until ${format(parseISO(filters.dateTo), 'MMM d')}`;
    }
    return 'Date range';
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {/* Status multi-select */}
        <MultiSelect
          label="Status"
          options={STATUS_OPTIONS}
          selected={filters.status}
          onChange={values => setFilter('status', values)}
        />

        {/* Temperature multi-select */}
        <MultiSelect
          label="Temperature"
          options={TEMPERATURE_OPTIONS}
          selected={filters.temperature}
          onChange={values => setFilter('temp', values)}
        />

        {/* Assignee dropdown */}
        <div className="relative">
          <select
            value={filters.assignee}
            onChange={e => setFilter('assignee', e.target.value)}
            className="appearance-none px-3 py-2 pr-8 border border-gray-300 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All assignees</option>
            {users?.map(user => (
              <option key={user.id} value={user.id}>
                {user.username || user.email}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Date range picker */}
        <div className="relative" ref={datePickerRef}>
          <button
            type="button"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              filters.dateFrom || filters.dateTo
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{formatDateRange()}</span>
          </button>
          {showDatePicker && (
            <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-2">
              <DayPicker
                mode="range"
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
              />
            </div>
          )}
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <X className="w-4 h-4" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
