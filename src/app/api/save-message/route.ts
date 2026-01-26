import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZW5zeGNwd2FicXBienJnbmd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTAzNjQ3NywiZXhwIjoyMDcwNjEyNDc3fQ.XQBUKRjJUwaadlxQPqxafiS1dssRADeFJqfmvG2618U"
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Payload recebido:', JSON.stringify(body, null, 2))

    // Extrair dados da mensagem
    const { type, data } = body
    
    if (type !== 'message' || !data) {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const message = data
    const phoneNumber = message.from.replace('@s.whatsapp.net', '')
    
    // Buscar instância
    const { data: instance } = await supabase
      .from('instances')
      .select('*')
      .eq('uazapi_instance_id', '2be97e0c-7cb0-47a4-9a3f-69a56660d982')
      .single()

    if (!instance) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 400 })
    }

    // Buscar ou criar contato
    let { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('instance_id', instance.id)
      .single()

    if (!contact) {
      // Criar novo contato
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          instance_id: instance.id,
          phone_number: phoneNumber,
          name: message.senderName || phoneNumber
        })
        .select()
        .single()
      
      contact = newContact
    }

    // Salvar mensagem
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        instance_id: instance.id,
        contact_id: contact.id,
        content: message.text,
        type: 'text',
        direction: 'inbound',
        status: 'delivered',
        external_id: message.id
      })

    if (insertError) {
      console.error('Erro ao salvar mensagem:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log('Mensagem salva com sucesso:', message.text)

    return NextResponse.json({ 
      success: true, 
      message: 'Mensagem salva com sucesso',
      contact: contact.name,
      content: message.text
    })

  } catch (error) {
    console.error('Erro no endpoint:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }, { status: 500 })
  }
}