import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const BUCKET_NAME = process.env.NEXT_PUBLIC_SUPABASE_INSTANCE_AVATAR_BUCKET || 'instance-avatars'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada.')
}

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no ambiente do servidor.')
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const instanceId = formData.get('instanceId')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo inválido' }, { status: 400 })
    }

    if (typeof instanceId !== 'string') {
      return NextResponse.json({ error: 'instanceId é obrigatório' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : ''
    const objectPath = `instances/${instanceId}/avatar-${Date.now()}${extension}`

    const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET_NAME).upload(objectPath, fileBuffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true
    })

    if (uploadError) {
      console.error('Falha ao subir avatar no Supabase Storage:', uploadError)
      return NextResponse.json({ error: uploadError.message || 'Upload não pôde ser concluído' }, { status: 500 })
    }

    const {
      data: { publicUrl }
    } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(objectPath)

    return NextResponse.json({
      url: publicUrl,
      mimeType: file.type || 'application/octet-stream',
      fileName: file.name
    })
  } catch (error) {
    console.error('Erro no upload de avatar:', error)
    const message = error instanceof Error ? error.message : 'Falha ao processar upload'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
