const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://kyensxcpwabqpbzrgngy.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZW5zeGNwd2FicXBienJnbmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzY0NzcsImV4cCI6MjA3MDYxMjQ3N30.EjVUGrCekMGgHTnafavv1sY41QApmU94mYYH5GILpdE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabase() {
  console.log('🔍 Testando conexão com o Supabase...')
  
  try {
    // Testar conexão básica
    const { data, error } = await supabase.from('instances').select('count').single()
    if (error) {
      console.error('❌ Erro na conexão:', error)
      return
    }
    console.log('✅ Conexão com Supabase OK')
    
    // Buscar instância existente ou criar nova
    console.log('\n📝 Buscando/criando instância...')
    let instance
    
    // Tentar buscar instância existente
    const { data: existingInstance, error: searchError } = await supabase
      .from('instances')
      .select('*')
      .eq('uazapi_instance_id', '2be97e0c-7cb0-47a4-9a3f-69a56660d982')
      .single()
    
    if (searchError && searchError.code === 'PGRST116') {
      // Não existe, criar nova
      console.log('Criando nova instância...')
      const instanceData = {
        name: 'Instância Orçamento',
        uazapi_instance_id: '2be97e0c-7cb0-47a4-9a3f-69a56660d982'
      }
      
      const { data: newInstance, error: createError } = await supabase
        .from('instances')
        .insert(instanceData)
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Erro ao criar instância:', createError)
        return
      }
      instance = newInstance
    } else if (searchError) {
      console.error('❌ Erro ao buscar instância:', searchError)
      return
    } else {
      console.log('Usando instância existente...')
      instance = existingInstance
    }
    
    console.log('✅ Instância:', instance.id)
    
    // Buscar contato existente ou criar novo
    console.log('\n👤 Buscando/criando contato...')
    let contact
    
    // Tentar buscar contato existente
    const { data: existingContact, error: contactSearchError } = await supabase
      .from('contacts')
      .select('*')
      .eq('instance_id', instance.id)
      .eq('phone_number', '5531999998888')
      .single()
    
    if (contactSearchError && contactSearchError.code === 'PGRST116') {
      // Não existe, criar novo
      console.log('Criando novo contato...')
      const contactData = {
        name: 'Cliente Teste',
        phone_number: '5531999998888',
        instance_id: instance.id
      }
      
      const { data: newContact, error: createContactError } = await supabase
        .from('contacts')
        .insert(contactData)
        .select(`
          *,
          instance:instances(*)
        `)
        .single()
      
      if (createContactError) {
        console.error('❌ Erro ao criar contato:', createContactError)
        return
      }
      contact = newContact
    } else if (contactSearchError) {
      console.error('❌ Erro ao buscar contato:', contactSearchError)
      return
    } else {
      console.log('Usando contato existente...')
      contact = existingContact
    }
    
    console.log('✅ Contato:', contact.id)
    
    // Testar criação de mensagem (versão mínima)
    console.log('\n💬 Testando criação de mensagem...')
    const messageData = {
      instance_id: instance.id,
      contact_id: contact.id,
      content: 'Mensagem de teste',
      direction: 'inbound'
    }
    
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single()
    
    if (messageError) {
      console.error('❌ Erro ao criar mensagem:', messageError)
      return
    }
    console.log('✅ Mensagem criada:', message.id)
    
    // Testar consulta completa (como usada no Dashboard)
    console.log('\n📋 Testando consulta completa do Dashboard...')
    const { data: contacts, error: fetchError } = await supabase
      .from('contacts')
      .select(`
        *,
        instance:instances(*),
        last_message:messages(
          content,
          created_at,
          direction
        )
      `)
      .order('created_at', { ascending: false })
    
    if (fetchError) {
      console.error('❌ Erro na consulta completa:', fetchError)
      return
    }
    console.log('✅ Consulta completa OK:', contacts.length, 'contatos')
    
    // Testar busca de mensagens do contato
    console.log('\n📨 Testando busca de mensagens do contato...')
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: true })
    
    if (messagesError) {
      console.error('❌ Erro ao buscar mensagens:', messagesError)
      return
    }
    console.log('✅ Mensagens do contato:', messages.length, 'mensagens')
    
    console.log('\n🎉 Todos os testes passaram!')
    console.log('\n📊 Resumo:')
    console.log(`- Instância: ${instance.name} (${instance.phone_number})`)
    console.log(`- Contato: ${contact.name} (${contact.phone_number})`)
    console.log(`- Mensagens: ${messages.length}`)
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

testDatabase()
