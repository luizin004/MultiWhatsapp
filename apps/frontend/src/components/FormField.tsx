interface FormFieldProps {
  label: string
  value: string
  placeholder?: string
  type?: 'text' | 'tel'
  required?: boolean
  helper?: string
  onChange: (value: string) => void
}

export default function FormField({
  label,
  value,
  placeholder,
  type = 'text',
  required,
  helper,
  onChange
}: FormFieldProps) {
  return (
    <div>
      <label className="text-sm font-medium text-[#E9EDEF]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-xl border border-white/10 bg-[#202C33] px-3 py-2 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:border-[#25D366] focus:outline-none"
      />
      {helper && <p className="mt-1 text-xs text-[#8696A0]">{helper}</p>}
    </div>
  )
}
