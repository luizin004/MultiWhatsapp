export interface FormState {
  instanceName: string
  instancePhone: string
  instanceToken: string
}

export interface FieldConfig {
  key: keyof FormState
  label: string
  placeholder: string
  required?: boolean
  helper?: string
}

export const initialForm: FormState = {
  instanceName: '',
  instancePhone: '',
  instanceToken: ''
}

export const instanceFields: FieldConfig[] = [
  { key: 'instanceName', label: 'Nome da instância', placeholder: 'Ex: Atendimentos Norte', required: true },
  {
    key: 'instancePhone',
    label: 'Número do WhatsApp *',
    placeholder: 'Ex: 5511988887777',
    required: true,
    helper: 'Digite apenas números com DDI + DDD'
  },
  { key: 'instanceToken', label: 'Token da instância *', placeholder: 'Cole o token da Uazapi', required: true }
]
