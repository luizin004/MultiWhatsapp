const { EventSource } = require('eventsource');

const token = '2be97e0c-7cb0-47a4-9a3f-69a56660d982';
const url = `https://oralaligner.uazapi.com/sse?token=${token}&events=messages`;

console.log('Conectando ao SSE da UAZAPI...');
console.log('URL:', url);

const eventSource = new EventSource(url);

eventSource.onopen = function() {
  console.log('Conexão SSE aberta!');
};

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Evento recebido:', JSON.stringify(data, null, 2));
  
  // Aqui podemos salvar no Supabase
  if (data.type === 'message' && data.data) {
    console.log('Mensagem recebida:', data.data);
  }
};

eventSource.onerror = function(error) {
  console.error('Erro na conexão SSE:', error);
  console.error('Detalhes:', error.message);
};

// Mantém rodando
process.on('SIGINT', () => {
  console.log('Fechando conexão SSE...');
  eventSource.close();
  process.exit(0);
});
