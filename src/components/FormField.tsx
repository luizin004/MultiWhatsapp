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
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
      />
      {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
    </div>
  )
}
