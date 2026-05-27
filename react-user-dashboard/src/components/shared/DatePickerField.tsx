import React from 'react';
import { formatDate, formatShortDate } from '../../utils/formatters';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const DatePickerField = ({
  label,
  value,
  onChange,
  required = false,
}: DatePickerFieldProps) => {
  const [open, setOpen] = React.useState(false);
  const today = startOfDay(new Date());
  const selectedDate = value ? new Date(value) : null;
  const [viewDate, setViewDate] = React.useState(selectedDate || today);
  const monthDays = calendarDays(viewDate);
  const quickDates = [
    { label: 'Today', hint: formatWeekday(today), value: toDateValue(today), icon: '\u25A1' },
    { label: 'Tomorrow', hint: formatWeekday(addDays(today, 1)), value: toDateValue(addDays(today, 1)), icon: '\u263C' },
    { label: 'Next week', hint: formatShortDate(addDays(today, 7).toISOString()), value: toDateValue(addDays(today, 7)), icon: '\u2197' },
    { label: 'Next weekend', hint: formatShortDate(nextWeekend(today).toISOString()), value: toDateValue(nextWeekend(today)), icon: '\u21BB' },
  ];

  const selectDate = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <label className="form-field date-picker-field">
      <span>{label}</span>
      <button type="button" className="date-trigger" onClick={() => setOpen(!open)}>
        {value ? formatDate(value) : 'Select date'}
      </button>
      <input className="sr-only" value={value} required={required} onChange={() => undefined} />
      {open && (
        <div className="date-popover">
          <div className="quick-date-list">
            {quickDates.map((item) => (
              <button key={item.label} type="button" onClick={() => selectDate(item.value)}>
                <span>{item.icon}</span>
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </button>
            ))}
            {!required && (
              <button type="button" onClick={() => selectDate('')}>
                <span>{'\u25CB'}</span>
                <strong>No Date</strong>
                <small>Clear</small>
              </button>
            )}
          </div>
          <div className="mini-calendar">
            <div className="calendar-head">
              <strong>{new Intl.DateTimeFormat('en-SG', { month: 'short', year: 'numeric' }).format(viewDate)}</strong>
              <span>
                <button type="button" onClick={() => setViewDate(addMonths(viewDate, -1))}>{'\u2039'}</button>
                <button type="button" onClick={() => setViewDate(addMonths(viewDate, 1))}>{'\u203A'}</button>
              </span>
            </div>
            <div className="calendar-grid weekday-row">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
            </div>
            <div className="calendar-grid">
              {monthDays.map((day) => {
                const dayValue = toDateValue(day);
                const isPast = day < today;
                return (
                  <button
                    key={dayValue}
                    type="button"
                    disabled={isPast}
                    className={[
                      day.getMonth() !== viewDate.getMonth() ? 'muted-day' : '',
                      value === dayValue ? 'selected-day' : '',
                      isPast ? 'past-day' : '',
                    ].join(' ')}
                    onClick={() => selectDate(dayValue)}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </label>
  );
};

const startOfDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return startOfDay(nextDate);
};

const addMonths = (date: Date, months: number) => {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return startOfDay(nextDate);
};

const toDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatWeekday = (date: Date) => new Intl.DateTimeFormat('en-SG', { weekday: 'short' }).format(date);

const nextWeekend = (date: Date) => {
  const day = date.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  return addDays(date, daysUntilSaturday);
};

const calendarDays = (date: Date) => {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const startDate = addDays(firstOfMonth, -mondayOffset);
  return Array.from({ length: 42 }, (_, index) => addDays(startDate, index));
};

export { addDays, addMonths, calendarDays, nextWeekend, startOfDay, toDateValue };
export default DatePickerField;
