import type { SelectOption } from '../../types/dashboard';

interface FormSelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  required?: boolean;
  onChange: (value: string) => void;
}

const FormSelect = ({
  label,
  value,
  options,
  required = false,
  onChange,
}: FormSelectProps) => (
  <label className="form-field">
    <span>{label}</span>
    <select value={value} required={required} onChange={(event) => onChange(event.target.value)}>
      <option value="">Select</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>{option.name}</option>
      ))}
    </select>
  </label>
);

export default FormSelect;
