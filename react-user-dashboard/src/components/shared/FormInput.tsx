interface FormInputProps {
  label: string;
  type?: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}

const FormInput = ({
  label,
  type = 'text',
  value,
  required = false,
  onChange,
}: FormInputProps) => (
  <label className="form-field">
    <span>{label}</span>
    <input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
  </label>
);

export default FormInput;
