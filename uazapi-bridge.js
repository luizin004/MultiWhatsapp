const { EventSource } = require('eventsource');
const fetch = require('node-fetch');

// Configurações
const UAZAPI_TOKEN = '2be97e0c-7cb0-47a4-9a3f-69a56660d982';
const UAZAPI_URL = 'https://oralaligner.uazapi.com';
const DASHBOARD_URL = 'http://localhost:3000/api/save-message';

console.log('🚀 Iniciando ponte UAZAPI -> Dashboard...');
console.log(`📡 Conectando ao SSE da UAZAPI: ${UAZAPI_URL}`);
console.log(`🎯 Enviando mensagens para: ${DASHBOARD_URL}`);

// Criar conexão SSE
const eventSource = new EventSource(`${UAZAPI_URL}/sse?token=${UAZAPI_TOKEN}&events=messages,chats,history`);

eventSource.onopen = () => {
  console.log('✅ Conectado ao SSE da UAZAPI');
};

eventSource.onmessage = async (event) => {
  try {
    const data = JSON.parse(event.data);
    console.log('📨 Evento recebido:', data.type);
    
    // Se for mensagem, reenviar para o dashboard
    if (data.type === 'message' && data.data) {
      const message = data.data;
      
      // Ignorar mensagens enviadas por nós (via API)
      if (message.wasSentByApi) {
        console.log('🔄 Ignorando mensagem enviada pela API');
        return;
      }
      
      console.log(`💬 Mensagem recebida: "${message.text}" de ${message.senderName || message.from}`);
      
      // Reenviar para o dashboard
      try {
        const response = await fetch(DASHBOARD_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'message',
            data: message,
            token: UAZAPI_TOKEN
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Mensagem salva no dashboard:', result.message);
        } else {
          const error = await response.text();
          console.error('❌ Erro ao salvar mensagem:', error);
        }
      } catch (fetchError) {
        console.error('❌ Erro na requisição:', fetchError.message);
      }
    } else {
      console.log(`ℹ️ Outro evento: ${data.type}`);
    }
  } catch (parseError) {
    console.error('❌ Erro ao parsear evento:', parseError.message);
    console.log('Raw data:', event.data);
  }
};

eventSource.onerror = (error) => {
  console.error('❌ Erro na conexão SSE:', error);
  console.log('🔄 Tentando reconectar em 5 segundos...');
  setTimeout(() => {
    console.log('🔄 Reconectando...');
  }, 5000);
};

// Tratamento de encerramento
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando ponte UAZAPI...');
  eventSource.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando ponte UAZAPI...');
  eventSource.close();
  process.exit(0);
});

console.log('🎉 Ponte ativa! Aguardando mensagens...');
