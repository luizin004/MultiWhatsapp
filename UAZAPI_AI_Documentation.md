O DOMÍNIO É https://oralaligner.uazapi.com

Cria uma nova instância do WhatsApp. Para criar uma instância você precisa:
1. Ter um admintoken válido
2. Enviar pelo menos o nome da instância
3. A instância será criada desconectada
4. Será gerado um token único para autenticação
Após criar a instância, guarde o token retornado pois ele será necessário para todas as
outras operações.
Estados possíveis da instância:
● disconnected: Desconectado do WhatsApp
● connecting: Em processo de conexão
● connected: Conectado e autenticado
Campos administrativos (adminField01/adminField02) são opcionais e podem ser usados
para armazenar metadados personalizados. OS valores desses campos são vísiveis para o
dono da instancia via token, porém apenas o administrador da api (via admin token) pode
editá-los.
Request
Body
namestringrequired
Nome da instância
Example: "minha-instancia"
systemNamestring
Nome do sistema (opcional, padrão 'uazapiGO' se não informado)
Example: "apilocal"
adminField01string
Campo administrativo 1 para metadados personalizados (opcional)
Example: "custom-metadata-1"
adminField02string
Campo administrativo 2 para metadados personalizados (opcional)
Example: "custom-metadata-2"
fingerprintProfilestring
Perfil de fingerprint para emulação de navegador (opcional)
Example: "chrome"
browserstring
Tipo de navegador para emulação (opcional)
curl --request POST \
--url https://free.uazapi.com/instance/init \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"name": "minha-instancia",
"systemName": "apilocal",
"adminField01": "custom-metadata-1",
"adminField02": "custom-metadata-2",
"fingerprintProfile": "chrome",
"browser": "chrome"
}'
Retorna uma lista completa de todas as instâncias do sistema, incluindo:
● ID e nome de cada instância
● Status atual (disconnected, connecting, connected)
● Data de criação
● Última desconexão e motivo
● Informações de perfil (se conectado)
Requer permissões de administrador.
curl --request GET \
--url https://free.uazapi.com/instance/all \
--header 'Accept: application/json'
Atualiza os campos administrativos (adminField01/adminField02) de uma instância.
Campos administrativos são opcionais e podem ser usados para armazenar metadados
personalizados. Estes campos são persistidos no banco de dados e podem ser utilizados
para integrações com outros sistemas ou para armazenamento de informações internas. OS
valores desses campos são vísiveis para o dono da instancia via token, porém apenas o
administrador da api (via admin token) pode editá-los.
Request
Body
idstringrequired
ID da instância
Example: "inst_123456"
adminField01string
Campo administrativo 1
Example: "clientId_456"
adminField02string
Campo administrativo 2
Example: "integration_xyz"
curl --request POST \
--url https://free.uazapi.com/instance/updateAdminFields \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": "inst_123456",
"adminField01": "clientId_456",
"adminField02": "integration_xyz"
}'
Retorna a configuração atual do webhook global, incluindo:
● URL configurada
● Eventos ativos
● Filtros aplicados
● Configurações adicionais
Exemplo de resposta:
{
"enabled": true,
"url": "https://example.com/webhook",
"events": ["messages", "messages_update"],
"excludeMessages": ["wasSentByApi", "isGroupNo"],
"addUrlEvents": true,
"addUrlTypesMessages": true
}
curl --request GET \
--url https://free.uazapi.com/globalwebhook \
--header 'Accept: application/json'
🚀 Configuração Simples (Recomendada)
Para a maioria dos casos de uso:
● Configure apenas URL e eventos desejados
● Modo simples por padrão (sem complexidade)
● Recomendado: Sempre use "excludeMessages": ["wasSentByApi"] para
evitar loops
● Exemplo: {"url": "https://webhook.cool/global", "events":
["messages", "connection"], "excludeMessages":
["wasSentByApi"]}
🧪 Sites para Testes (ordenados por qualidade)
Para testar webhooks durante desenvolvimento:
1. https://webhook.cool/ - ⭐ Melhor opção (sem rate limit, interface limpa)
2. https://rbaskets.in/ - ⭐ Boa alternativa (confiável, baixo rate limit)
3. https://webhook.site/ - ⚠ Evitar se possível (rate limit agressivo)
Funcionalidades Principais:
● Configuração de URL para recebimento de eventos
● Seleção granular de tipos de eventos
● Filtragem avançada de mensagens
● Parâmetros adicionais na URL
Eventos Disponíveis:
● connection: Alterações no estado da conexão
● history: Recebimento de histórico de mensagens
● messages: Novas mensagens recebidas
● messages_update: Atualizações em mensagens existentes
● call: Eventos de chamadas VoIP
● contacts: Atualizações na agenda de contatos
● presence: Alterações no status de presença
● groups: Modificações em grupos
● labels: Gerenciamento de etiquetas
● chats: Eventos de conversas
● chat_labels: Alterações em etiquetas de conversas
● blocks: Bloqueios/desbloqueios
● leads: Atualizações de leads
● sender: Atualizações de campanhas, quando inicia, e quando completa
Remover mensagens com base nos filtros:
● wasSentByApi: Mensagens originadas pela API ⚠ IMPORTANTE: Use sempre
este filtro para evitar loops em automações
● wasNotSentByApi: Mensagens não originadas pela API
● fromMeYes: Mensagens enviadas pelo usuário
● fromMeNo: Mensagens recebidas de terceiros
● isGroupYes: Mensagens em grupos
● isGroupNo: Mensagens em conversas individuais
💡 Prevenção de Loops Globais: O webhook global recebe eventos de TODAS as
instâncias. Se você tem automações que enviam mensagens via API, sempre inclua
"excludeMessages": ["wasSentByApi"]. Caso prefira receber esses eventos,
certifique-se de que sua automação detecta mensagens enviadas pela própria API para não
criar loops infinitos em múltiplas instâncias.
Parâmetros de URL:
● addUrlEvents (boolean): Quando ativo, adiciona o tipo do evento como path
parameter na URL. Exemplo: https://api.example.com/webhook/{evento}
● addUrlTypesMessages (boolean): Quando ativo, adiciona o tipo da mensagem
como path parameter na URL. Exemplo:
https://api.example.com/webhook/{tipo_mensagem}
Combinações de Parâmetros:
● Ambos ativos:
https://api.example.com/webhook/{evento}/{tipo_mensagem} Exemplo
real: https://api.example.com/webhook/message/conversation
● Apenas eventos: https://api.example.com/webhook/message
● Apenas tipos: https://api.example.com/webhook/conversation
Notas Técnicas:
1. Os parâmetros são adicionados na ordem: evento → tipo mensagem
2. A URL deve ser configurada para aceitar esses parâmetros dinâmicos
3. Funciona com qualquer combinação de eventos/mensagens
Request
Body
urlstringrequired
URL para receber os eventos
Example: "https://webhook.cool/global"
eventsarrayrequired
Lista de eventos monitorados
Example: ["messages","connection"]
excludeMessagesarray
Filtros para excluir tipos de mensagens
Example: ["wasSentByApi"]
addUrlEventsboolean
Adiciona o tipo do evento como parâmetro na URL.
● false (padrão): URL normal
● true: Adiciona evento na URL (ex: /webhook/message)
addUrlTypesMessagesboolean
Adiciona o tipo da mensagem como parâmetro na URL.
● false (padrão): URL normal
● true: Adiciona tipo da mensagem (ex: /webhook/conversation)
curl --request POST \
--url https://free.uazapi.com/globalwebhook \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"url": "https://webhook.cool/global",
"events": [
"messages",
"connection"
],
"excludeMessages": [
"wasSentByApi"
]
}'
Inicia o processo de conexão de uma instância ao WhatsApp. Este endpoint:
1. Requer o token de autenticação da instância
2. Recebe o número de telefone associado à conta WhatsApp
3. Gera um QR code caso não passe o campo phone
4. Ou Gera código de pareamento se passar o o campo phone
5. Atualiza o status da instância para "connecting"
O processo de conexão permanece pendente até que:
● O QR code seja escaneado no WhatsApp do celular, ou
● O código de pareamento seja usado no WhatsApp
● Timeout de 2 minutos para QRCode seja atingido ou 5 minutos para o código de
pareamento
Use o endpoint /instance/status para monitorar o progresso da conexão.
Estados possíveis da instância:
● disconnected: Desconectado do WhatsApp
● connecting: Em processo de conexão
● connected: Conectado e autenticado
Exemplo de requisição:
{
"phone": "5511999999999"
}
Request
Body
phonestring
Número de telefone no formato internacional (ex: 5511999999999). Se informado, gera
código de pareamento. Se omitido, gera QR code.
Example: "5511999999999"
curl --request POST \
--url https://free.uazapi.com/instance/connect \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"phone": "5511999999999"
}'
Desconecta a instância do WhatsApp, encerrando a sessão atual. Esta operação:
● Encerra a conexão ativa
● Requer novo QR code para reconectar
Diferenças entre desconectar e hibernar:
● Desconectar: Encerra completamente a sessão, exigindo novo login
● Hibernar: Mantém a sessão ativa, apenas pausa a conexão
Use este endpoint para:
1. Encerrar completamente uma sessão
2. Forçar uma nova autenticação
3. Limpar credenciais de uma instância
4. Reiniciar o processo de conexão
Estados possíveis após desconectar:
● disconnected: Desconectado do WhatsApp
● connecting: Em processo de reconexão (após usar /instance/connect)
curl --request POST \
--url https://free.uazapi.com/instance/disconnect \
--header 'Accept: application/json'
Retorna o status atual de uma instância, incluindo:
● Estado da conexão (disconnected, connecting, connected)
● QR code atualizado (se em processo de conexão)
● Código de pareamento (se disponível)
● Informações da última desconexão
● Detalhes completos da instância
Este endpoint é particularmente útil para:
1. Monitorar o progresso da conexão
2. Obter QR codes atualizados durante o processo de conexão
3. Verificar o estado atual da instância
4. Identificar problemas de conexão
Estados possíveis:
● disconnected: Desconectado do WhatsApp
● connecting: Em processo de conexão (aguardando QR code ou código de
pareamento)
● connected: Conectado e autenticado com sucesso
curl --request GET \
--url https://free.uazapi.com/instance/status \
--header 'Accept: application/json'
Atualiza o nome de uma instância WhatsApp existente. O nome não precisa ser único.
Request
Body
namestringrequired
Novo nome para a instância
Example: "Minha Nova Instância 2024!@#"
curl --request POST \
--url https://free.uazapi.com/instance/updateInstanceName \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"name": "Minha Nova Instância 2024!@#"
}'
Remove a instância do sistema.
curl --request DELETE \
--url https://free.uazapi.com/instance \
--header 'Accept: application/json'
Busca as configurações de privacidade atuais da instância do WhatsApp.
Importante - Diferença entre Status e Broadcast:
● Status: Refere-se ao recado personalizado que aparece embaixo do nome do
usuário (ex: "Disponível", "Ocupado", texto personalizado)
● Broadcast: Refere-se ao envio de "stories/reels" (fotos/vídeos temporários)
Limitação: As configurações de privacidade do broadcast (stories/reels) não estão
disponíveis para alteração via API.
Retorna todas as configurações de privacidade como quem pode:
● Adicionar aos grupos
● Ver visto por último
● Ver status (recado embaixo do nome)
● Ver foto de perfil
● Receber confirmação de leitura
● Ver status online
● Fazer chamadas
curl --request GET \
--url https://free.uazapi.com/instance/privacy \
--header 'Accept: application/json'
Altera uma ou múltiplas configurações de privacidade da instância do WhatsApp de forma
otimizada.
Importante - Diferença entre Status e Broadcast:
● Status: Refere-se ao recado personalizado que aparece embaixo do nome do
usuário (ex: "Disponível", "Ocupado", texto personalizado)
● Broadcast: Refere-se ao envio de "stories/reels" (fotos/vídeos temporários)
Limitação: As configurações de privacidade do broadcast (stories/reels) não estão
disponíveis para alteração via API.
Características:
● ✅ Eficiência: Altera apenas configurações que realmente mudaram
● ✅ Flexibilidade: Pode alterar uma ou múltiplas configurações na mesma requisição
● ✅ Feedback completo: Retorna todas as configurações atualizadas
Formato de entrada:
{
"groupadd": "contacts",
"last": "none",
"status": "contacts"
}
Tipos de privacidade disponíveis:
● groupadd: Quem pode adicionar aos grupos
● last: Quem pode ver visto por último
● status: Quem pode ver status (recado embaixo do nome)
● profile: Quem pode ver foto de perfil
● readreceipts: Confirmação de leitura
● online: Quem pode ver status online
● calladd: Quem pode fazer chamadas
Valores possíveis:
● all: Todos
● contacts: Apenas contatos
● contact_blacklist: Contatos exceto bloqueados
● none: Ninguém
● match_last_seen: Corresponder ao visto por último (apenas para online)
● known: Números conhecidos (apenas para calladd)
Request
Body
groupaddstring
Quem pode adicionar aos grupos. Valores - all, contacts, contact_blacklist, none
Valores possíveis: all, contacts, contact_blacklist, none
laststring
Quem pode ver visto por último. Valores - all, contacts, contact_blacklist, none
Valores possíveis: all, contacts, contact_blacklist, none
statusstring
Quem pode ver status (recado embaixo do nome). Valores - all, contacts, contact_blacklist,
none
Valores possíveis: all, contacts, contact_blacklist, none
profilestring
Quem pode ver foto de perfil. Valores - all, contacts, contact_blacklist, none
Valores possíveis: all, contacts, contact_blacklist, none
readreceiptsstring
Confirmação de leitura. Valores - all, none
Valores possíveis: all, none
onlinestring
Quem pode ver status online. Valores - all, match_last_seen
Valores possíveis: all, match_last_seen
calladdstring
Quem pode fazer chamadas. Valores - all, known
Valores possíveis: all, known
curl --request POST \
--url https://free.uazapi.com/instance/privacy \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"groupadd": "contacts"
}'
Atualiza o status de presença global da instância do WhatsApp. Este endpoint permite:
1. Definir se a instância está disponível (Aparece "online") ou indisponível
2. Controlar o status de presença para todos os contatos
3. Salvar o estado atual da presença na instância
Tipos de presença suportados:
● available: Marca a instância como disponível/online
● unavailable: Marca a instância como indisponível/offline
Atenção:
● O status de presença pode ser temporariamente alterado para "available" (online)
em algumas situações internas da API, e com isso o visto por último também pode
ser atualizado.
● Caso isso for um problema, considere alterar suas configurações de privacidade no
WhatsApp para não mostrar o visto por último e/ou quem pode ver seu status
"online".
⚠ Importante - Limitação do Presence "unavailable":
● Quando a API é o único dispositivo ativo: Confirmações de entrega/leitura (ticks
cinzas/azuis) não são enviadas nem recebidas
● Impacto: Eventos message_update com status de entrega podem não ser
recebidos
● Solução: Se precisar das confirmações, mantenha WhatsApp Web ou aplicativo
móvel ativo ou use presence "available"
Exemplo de requisição:
{
"presence": "available"
}
Exemplo de resposta:
{
"response": "Presence updated successfully"
}
Erros comuns:
● 401: Token inválido ou expirado
● 400: Valor de presença inválido
● 500: Erro ao atualizar presença
Request
Body
presencestringrequired
Status de presença da instância
Valores possíveis: available, unavailable
Example: "available"
curl --request POST \
--url https://free.uazapi.com/instance/presence \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"presence": "available"
}'
A uazapiGO opera com um proxy interno como padrão. Observação: nossos IPs são
brasileiros. Se você atende clientes internacionais, considere usar um proxy do país/região
do seu cliente (via proxy_url). Você pode: (1) continuar no proxy interno padrão; (2) usar
um proxy próprio informando proxy_url. Se nada for definido, seguimos no proxy interno;
ou (3) usar seu celular android como proxy instalando o aplicativo disponibilizado pela
uazapi em https://github.com/uazapi/silver_proxy_apk (APK direto:
https://github.com/uazapi/silver_proxy_apk/raw/refs/heads/main/silver_proxy.apk).
A resposta desse endpoint traz o estado atual do proxy e o último teste de conectividade.
curl --request GET \
--url https://free.uazapi.com/instance/proxy \
--header 'Accept: application/json'
Permite habilitar ou trocar para:
● Um proxy próprio (proxy_url), usando sua infraestrutura ou o aplicativo de celular
para proxy próprio.
● O proxy interno padrão (nenhum proxy_url enviado).
Se nada for enviado, seguimos no proxy interno. A URL é validada antes de salvar. A
conexão pode ser reiniciada automaticamente para aplicar a mudança.
Opcional: você pode usar seu celular android como proxy instalando o aplicativo
disponibilizado pela uazapi em https://github.com/uazapi/silver_proxy_apk (APK direto:
https://github.com/uazapi/silver_proxy_apk/raw/refs/heads/main/silver_proxy.apk).
Request
Body
enablebooleanrequired
Define se o proxy deve ser habilitado; se false, remove o proxy atual
proxy_urlstring
URL do proxy a ser usado (obrigatória se enable=true e quiser usar um proxy próprio)
Example: "http://usuario:senha@ip:porta"
curl --request POST \
--url https://free.uazapi.com/instance/proxy \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"enable": false,
"proxy_url": "http://usuario:senha@ip:porta"
}'
Desativa e apaga o proxy personalizado, voltando ao comportamento padrão (proxy
interno). Pode reiniciar a conexão para aplicar a remoção.
curl --request DELETE \
--url https://free.uazapi.com/instance/proxy \
--header 'Accept: application/json'
Altera o nome de exibição do perfil da instância do WhatsApp.
O endpoint realiza:
● Atualiza o nome do perfil usando o WhatsApp AppState
● Sincroniza a mudança com o servidor do WhatsApp
● Retorna confirmação da alteração
Importante:
● A instância deve estar conectada ao WhatsApp
● O nome será visível para todos os contatos
● Pode haver um limite de alterações por período (conforme WhatsApp)
Request
Body
namestringrequired
Novo nome do perfil do WhatsApp
Example: "Minha Empresa - Atendimento"
curl --request POST \
--url https://free.uazapi.com/profile/name \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"name": "Minha Empresa - Atendimento"
}'
Altera a imagem de perfil da instância do WhatsApp.
O endpoint realiza:
● Atualiza a imagem do perfil usando
● Processa a imagem (URL, base64 ou comando de remoção)
● Sincroniza a mudança com o servidor do WhatsApp
● Retorna confirmação da alteração
Importante:
● A instância deve estar conectada ao WhatsApp
● A imagem será visível para todos os contatos
● A imagem deve estar em formato JPEG e tamanho 640x640 pixels
Request
Body
imagestringrequired
Imagem do perfil. Pode ser:
● URL da imagem (http/https)
● String base64 da imagem
● "remove" ou "delete" para remover a imagem atual
Example: "https://picsum.photos/640/640.jpg"
curl --request POST \
--url https://free.uazapi.com/profile/image \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"image": "https://picsum.photos/640/640.jpg"
}'
Retorna o perfil comercial da instância do WhatsApp.
Request
Body
jidstring
JID do perfil comercial a consultar
Example: "5511999999999@s.whatsapp.net"
curl --request POST \
--url https://free.uazapi.com/business/get/profile \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"jid": "5511999999999@s.whatsapp.net"
}'
Retorna as categorias de negócios disponíveis.
curl --request GET \
--url https://free.uazapi.com/business/get/categories \
--header 'Accept: application/json'
Atualiza os dados do perfil comercial da instância do WhatsApp. Todos os campos são
opcionais; apenas os enviados serão atualizados.
Request
Body
descriptionstring
Nova descrição do perfil comercial.
Example: "Loja de eletrônicos e acessórios"
addressstring
Novo endereço do perfil comercial.
Example: "Rua das Flores, 123 - Centro"
emailstring
Novo email do perfil comercial.
Example: "contato@empresa.com"
curl --request POST \
--url https://free.uazapi.com/business/update/profile \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"description": "Loja de eletrônicos e acessórios",
"address": "Rua das Flores, 123 - Centro",
"email": "contato@empresa.com"
}'
Lista os produtos do catálogo da instância do WhatsApp.
curl --request POST \
--url https://free.uazapi.com/business/catalog/list \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"jid": "5511999999999@s.whatsapp.net"
}'
Retorna as informações de um produto específico do catálogo.
Request
Body
jidstringrequired
JID do catálogo a consultar
Example: "5511999999999@s.whatsapp.net"
idstringrequired
O ID do produto.
curl --request POST \
--url https://free.uazapi.com/business/catalog/info \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"jid": "5511999999999@s.whatsapp.net",
"id": "string"
}'
Deleta um produto específico do catálogo.
Request
Body
idstringrequired
O ID do produto.
curl --request POST \
--url https://free.uazapi.com/business/catalog/delete \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": "string"
}'
Mostra um produto específico do catálogo.
Request
Body
idstringrequired
O ID do produto.
curl --request POST \
--url https://free.uazapi.com/business/catalog/show \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": "string"
}'
Oculta um produto específico do catálogo.
Request
Body
idstringrequired
O ID do produto.
curl --request POST \
--url https://free.uazapi.com/business/catalog/hide \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": "string"
}'
Inicia uma chamada de voz para um contato específico. Este endpoint permite:
1. Iniciar chamadas de voz para contatos
2. Funciona apenas com números válidos do WhatsApp
3. O contato receberá uma chamada de voz
Nota: O telefone do contato tocará normalmente, mas ao contato atender, ele não ouvirá
nada, e você também não ouvirá nada. Este endpoint apenas inicia a chamada, não
estabelece uma comunicação de voz real.
Exemplo de requisição:
{
"number": "5511999999999"
}
Exemplo de resposta:
{
"response": "Call successful"
}
Erros comuns:
● 401: Token inválido ou expirado
● 400: Número inválido ou ausente
● 500: Erro ao iniciar chamada
Request
Body
numberstringrequired
Número do contato no formato internacional (ex: 5511999999999)
Example: "5511999999999"
curl --request POST \
--url https://free.uazapi.com/call/make \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999"
}'
Rejeita uma chamada recebida do WhatsApp.
O body pode ser enviado vazio {}. Os campos number e id são opcionais e podem ser
usados para especificar uma chamada específica.
Exemplo de requisição (recomendado):
{}
Exemplo de requisição com campos opcionais:
{
"number": "5511999999999",
"id": "ABEiGmo8oqkAcAKrBYQAAAAA_1"
}
Exemplo de resposta:
{
"response": "Call rejected"
}
Erros comuns:
● 401: Token inválido ou expirado
● 400: Número inválido
● 500: Erro ao rejeitar chamada
Request
Body
numberstring
(Opcional) Número do contato no formato internacional (ex: 5511999999999)
idstring
(Opcional) ID único da chamada a ser rejeitada
curl --request POST \
--url https://free.uazapi.com/call/reject \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{}'
Retorna a configuração atual do webhook da instância, incluindo:
● URL configurada
● Eventos ativos
● Filtros aplicados
● Configurações adicionais
Exemplo de resposta:
[
{
"id": "123e4567-e89b-12d3-a456-426614174000",
"enabled": true,
"url": "https://example.com/webhook",
"events": ["messages", "messages_update"],
"excludeMessages": ["wasSentByApi", "isGroupNo"],
"addUrlEvents": true,
"addUrlTypesMessages": true
},
{
"id": "987fcdeb-51k3-09j8-x543-864297539100",
"enabled": true,
"url": "https://outro-endpoint.com/webhook",
"events": ["connection", "presence"],
"excludeMessages": [],
"addUrlEvents": false,
"addUrlTypesMessages": false
}
]
A resposta é sempre um array, mesmo quando há apenas um webhook configurado.
curl --request GET \
--url https://free.uazapi.com/webhook \
--header 'Accept: application/json'
Gerencia a configuração de webhooks para receber eventos em tempo real da instância.
Permite gerenciar múltiplos webhooks por instância através do campo ID e action.
🚀 Modo Simples (Recomendado)
Uso mais fácil - sem complexidade de IDs:
● Não inclua action nem id no payload
● Gerencia automaticamente um único webhook por instância
● Cria novo ou atualiza o existente automaticamente
● Recomendado: Sempre use "excludeMessages": ["wasSentByApi"] para
evitar loops
● Exemplo: {"url": "https://meusite.com/webhook", "events":
["messages"], "excludeMessages": ["wasSentByApi"]}
🧪 Sites para Testes (ordenados por qualidade)
Para testar webhooks durante desenvolvimento:
1. https://webhook.cool/ - ⭐ Melhor opção (sem rate limit, interface limpa)
2. https://rbaskets.in/ - ⭐ Boa alternativa (confiável, baixo rate limit)
3. https://webhook.site/ - ⚠ Evitar se possível (rate limit agressivo)
⚙ Modo Avançado (Para múltiplos webhooks)
Para usuários que precisam de múltiplos webhooks por instância:
💡 Dica: Mesmo precisando de múltiplos webhooks, considere usar addUrlEvents no
modo simples. Um único webhook pode receber diferentes tipos de eventos em URLs
específicas (ex: /webhook/message, /webhook/connection), eliminando a
necessidade de múltiplos webhooks.
1. Criar Novo Webhook:
○ Use action: "add"
○ Não inclua id no payload
○ O sistema gera ID automaticamente
2. Atualizar Webhook Existente:
○ Use action: "update"
○ Inclua o id do webhook no payload
○ Todos os campos serão atualizados
3. Remover Webhook:
○ Use action: "delete"
○ Inclua apenas o id do webhook
○ Outros campos são ignorados
Eventos Disponíveis
● connection: Alterações no estado da conexão
● history: Recebimento de histórico de mensagens
● messages: Novas mensagens recebidas
● messages_update: Atualizações em mensagens existentes
● call: Eventos de chamadas VoIP
● contacts: Atualizações na agenda de contatos
● presence: Alterações no status de presença
● groups: Modificações em grupos
● labels: Gerenciamento de etiquetas
● chats: Eventos de conversas
● chat_labels: Alterações em etiquetas de conversas
● blocks: Bloqueios/desbloqueios
● leads: Atualizações de leads
● sender: Atualizações de campanhas, quando inicia, e quando completa
Remover mensagens com base nos filtros:
● wasSentByApi: Mensagens originadas pela API ⚠ IMPORTANTE: Use sempre
este filtro para evitar loops em automações
● wasNotSentByApi: Mensagens não originadas pela API
● fromMeYes: Mensagens enviadas pelo usuário
● fromMeNo: Mensagens recebidas de terceiros
● isGroupYes: Mensagens em grupos
● isGroupNo: Mensagens em conversas individuais
💡 Prevenção de Loops: Se você tem automações que enviam mensagens via API,
sempre inclua "excludeMessages": ["wasSentByApi"] no seu webhook. Caso
prefira receber esses eventos, certifique-se de que sua automação detecta mensagens
enviadas pela própria API para não criar loops infinitos.
Ações Suportadas:
● add: Registrar novo webhook
● delete: Remover webhook existente
Parâmetros de URL:
● addUrlEvents (boolean): Quando ativo, adiciona o tipo do evento como path
parameter na URL. Exemplo: https://api.example.com/webhook/{evento}
● addUrlTypesMessages (boolean): Quando ativo, adiciona o tipo da mensagem
como path parameter na URL. Exemplo:
https://api.example.com/webhook/{tipo_mensagem}
Combinações de Parâmetros:
● Ambos ativos:
https://api.example.com/webhook/{evento}/{tipo_mensagem} Exemplo
real: https://api.example.com/webhook/message/conversation
● Apenas eventos: https://api.example.com/webhook/message
● Apenas tipos: https://api.example.com/webhook/conversation
Notas Técnicas:
1. Os parâmetros são adicionados na ordem: evento → tipo mensagem
2. A URL deve ser configurada para aceitar esses parâmetros dinâmicos
3. Funciona com qualquer combinação de eventos/mensagens
Request
Body
idstring
ID único do webhook (necessário para update/delete)
Example: "123e4567-e89b-12d3-a456-426614174000"
enabledboolean
Habilita/desabilita o webhook
Example: true
urlstringrequired
URL para receber os eventos
Example: "https://example.com/webhook"
eventsarray
Lista de eventos monitorados
excludeMessagesarray
Filtros para excluir tipos de mensagens
addUrlEventsboolean
Adiciona o tipo do evento como parâmetro na URL.
● false (padrão): URL normal
● true: Adiciona evento na URL (ex: /webhook/message)
addUrlTypesMessagesboolean
Adiciona o tipo da mensagem como parâmetro na URL.
● false (padrão): URL normal
● true: Adiciona tipo da mensagem (ex: /webhook/conversation)
actionstring
Ação a ser executada:
● add: criar novo webhook
● update: atualizar webhook existente (requer id)
● delete: remover webhook (requer apenas id) Se não informado, opera no modo
simples (único webhook)
Valores possíveis: add, update, delete
curl --request POST \
--url https://free.uazapi.com/webhook \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"enabled": true,
"url": "https://webhook.cool/example",
"events": [
"messages",
"connection"
],
"excludeMessages": [
"wasSentByApi"
]
}'
Receber eventos em tempo real via Server-Sent Events (SSE)
Funcionalidades Principais:
● Configuração de URL para recebimento de eventos
● Seleção granular de tipos de eventos
● Filtragem avançada de mensagens
● Parâmetros adicionais na URL
● Gerenciamento múltiplo de webhooks
Eventos Disponíveis:
● connection: Alterações no estado da conexão
● history: Recebimento de histórico de mensagens
● messages: Novas mensagens recebidas
● messages_update: Atualizações em mensagens existentes
● call: Eventos de chamadas VoIP
● contacts: Atualizações na agenda de contatos
● presence: Alterações no status de presença
● groups: Modificações em grupos
● labels: Gerenciamento de etiquetas
● chats: Eventos de conversas
● chat_labels: Alterações em etiquetas de conversas
● blocks: Bloqueios/desbloqueios
● leads: Atualizações de leads
Estabelece uma conexão persistente para receber eventos em tempo real. Este endpoint:
1. Requer autenticação via token
2. Mantém uma conexão HTTP aberta com o cliente
3. Envia eventos conforme ocorrem no servidor
4. Suporta diferentes tipos de eventos
Exemplo de uso:
const eventSource = new
EventSource('/sse?token=SEU_TOKEN&events=chats,messages');
eventSource.onmessage = function(event) {
const data = JSON.parse(event.data);
console.log('Novo evento:', data);
};
eventSource.onerror = function(error) {
console.error('Erro na conexão SSE:', error);
};
Estrutura de um evento:
{
"type": "message",
"data": {
"id": "3EB0538DA65A59F6D8A251",
"from": "5511999999999@s.whatsapp.net",
"to": "5511888888888@s.whatsapp.net",
"text": "Olá!",
"timestamp": 1672531200000
}
}
Parameters
Query Parameters
token
stringrequired
Token de autenticação da instância
events
stringrequired
Tipos de eventos a serem recebidos. Suporta dois formatos:
● Separados por vírgula: ?events=chats,messages
● Parâmetros repetidos: ?events=chats&events=messages
excludeMessages
string
Tipos de mensagens a serem excluídas do evento messages. Suporta dois formatos:
● Separados por vírgula: ?excludeMessages=poll,reaction
● Parâmetros repetidos: ?excludeMessages=poll&excludeMessages=reaction
curl --request GET \
--url https://free.uazapi.com/sse \
--header 'Accept: application/json'
Envia uma mensagem de texto para um contato ou grupo.
Recursos Específicos
● Preview de links com suporte a personalização automática ou customizada
● Formatação básica do texto
● Substituição automática de placeholders dinâmicos
Campos Comuns
Este endpoint suporta todos os campos opcionais comuns documentados na tag "Enviar
Mensagem", incluindo: delay, readchat, readmessages, replyid, mentions,
forward, track_source, track_id, placeholders e envio para grupos.
Preview de Links
Preview Automático
{
"number": "5511999999999",
"text": "Confira: https://exemplo.com",
"linkPreview": true
}
Preview Personalizado
{
"number": "5511999999999",
"text": "Confira nosso site! https://exemplo.com",
"linkPreview": true,
"linkPreviewTitle": "Título Personalizado",
"linkPreviewDescription": "Uma descrição personalizada do link",
"linkPreviewImage": "https://exemplo.com/imagem.jpg",
"linkPreviewLarge": true
}
Request
Body
numberstringrequired
ID do chat para o qual a mensagem será enviada. Pode ser um número de telefone em
formato internacional, um ID de grupo (@g.us), um ID de usuário (com @s.whatsapp.net
ou @lid).
Example: "5511999999999"
textstringrequired
Texto da mensagem (aceita placeholders)
Example: "Olá {{name}}! Como posso ajudar?"
linkPreviewboolean
Ativa/desativa preview de links. Se true, procura automaticamente um link no texto para
gerar preview.
Comportamento:
● Se apenas linkPreview=true: gera preview automático do primeiro link encontrado no
texto
● Se fornecidos campos personalizados (title, description, image): usa os valores
fornecidos
● Se campos personalizados parciais: combina com dados automáticos do link como
fallback
Example: true
linkPreviewTitlestring
Define um título personalizado para o preview do link
Example: "Título Personalizado"
linkPreviewDescriptionstring
Define uma descrição personalizada para o preview do link
Example: "Descrição personalizada do link"
linkPreviewImagestring
URL ou Base64 da imagem para usar no preview do link
Example: "https://exemplo.com/imagem.jpg"
linkPreviewLargeboolean
Se true, gera um preview grande com upload da imagem. Se false, gera um preview
pequeno sem upload
Example: true
replyidstring
ID da mensagem para responder
Example: "3EB0538DA65A59F6D8A251"
mentionsstring
Números para mencionar (separados por vírgula)
Example: "5511999999999,5511888888888"
readchatboolean
Marca conversa como lida após envio
Example: true
readmessagesboolean
Marca últimas mensagens recebidas como lidas
Example: true
delayinteger
Atraso em milissegundos antes do envio, durante o atraso apacerá 'Digitando...'
Example: 1000
forwardboolean
Marca a mensagem como encaminhada no WhatsApp
Example: true
track_sourcestring
Origem do rastreamento da mensagem
Example: "chatwoot"
track_idstring
ID para rastreamento da mensagem (aceita valores duplicados)
Example: "msg_123456789"
asyncboolean
Se true, envia a mensagem de forma assíncrona via fila interna. Útil para alto volume de
mensagens.
curl --request POST \
--url https://free.uazapi.com/send/text \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"text": "Olá! Como posso ajudar?"
}'
Envia diferentes tipos de mídia para um contato ou grupo. Suporta URLs ou arquivos
base64.
Tipos de Mídia Suportados
● image: Imagens (JPG preferencialmente)
● video: Vídeos (apenas MP4)
● document: Documentos (PDF, DOCX, XLSX, etc)
● audio: Áudio comum (MP3 ou OGG)
● myaudio: Mensagem de voz (alternativa ao PTT)
● ptt: Mensagem de voz (Push-to-Talk)
● ptv: Mensagem de vídeo (Push-to-Video)
● sticker: Figurinha/Sticker
Recursos Específicos
● Upload por URL ou base64
● Caption/legenda opcional com suporte a placeholders
● Nome personalizado para documentos (docName)
● Geração automática de thumbnails
● Compressão otimizada conforme o tipo
Campos Comuns
Este endpoint suporta todos os campos opcionais comuns documentados na tag "Enviar
Mensagem", incluindo: delay, readchat, readmessages, replyid, mentions,
forward, track_source, track_id, placeholders e envio para grupos.
Exemplos Básicos
Imagem Simples
{
"number": "5511999999999",
"type": "image",
"file": "https://exemplo.com/foto.jpg"
}
Documento com Nome
{
"number": "5511999999999",
"type": "document",
"file": "https://exemplo.com/contrato.pdf",
"docName": "Contrato.pdf",
"text": "Segue o documento solicitado"
}
Request
Body
numberstringrequired
ID do chat para o qual a mensagem será enviada. Pode ser um número de telefone em
formato internacional, um ID de grupo (@g.us), um ID de usuário (com @s.whatsapp.net
ou @lid).
Example: "5511999999999"
typestringrequired
Tipo de mídia (image, video, document, audio, myaudio, ptt, ptv, sticker)
Valores possíveis: image, video, document, audio, myaudio, ptt, ptv, sticker
Example: "image"
filestringrequired
URL ou base64 do arquivo
Example: "https://exemplo.com/imagem.jpg"
textstring
Texto descritivo (caption) - aceita placeholders
Example: "Veja esta foto!"
docNamestring
Nome do arquivo (apenas para documents)
Example: "relatorio.pdf"
thumbnailstring
URL ou base64 de thumbnail personalizado para vídeos e documentos
Example: "https://exemplo.com/thumb.jpg"
mimetypestring
MIME type do arquivo (opcional, detectado automaticamente)
Example: "application/pdf"
replyidstring
ID da mensagem para responder
Example: "3EB0538DA65A59F6D8A251"
mentionsstring
Números para mencionar (separados por vírgula)
Example: "5511999999999,5511888888888"
readchatboolean
Marca conversa como lida após envio
Example: true
readmessagesboolean
Marca últimas mensagens recebidas como lidas
Example: true
delayinteger
Atraso em milissegundos antes do envio, durante o atraso apacerá 'Digitando...' ou
'Gravando áudio...'
Example: 1000
forwardboolean
Marca a mensagem como encaminhada no WhatsApp
Example: true
track_sourcestring
Origem do rastreamento da mensagem
Example: "chatwoot"
track_idstring
ID para rastreamento da mensagem (aceita valores duplicados)
Example: "msg_123456789"
asyncboolean
Se true, envia a mensagem de forma assíncrona via fila interna
curl --request POST \
--url https://free.uazapi.com/send/media \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"type": "image",
"file": "https://exemplo.com/foto.jpg"
}'
Envia um cartão de contato (vCard) para um contato ou grupo.
Recursos Específicos
● vCard completo com nome, telefones, organização, email e URL
● Múltiplos números de telefone (separados por vírgula)
● Cartão clicável no WhatsApp para salvar na agenda
● Informações profissionais (organização/empresa)
Campos Comuns
Este endpoint suporta todos os campos opcionais comuns documentados na tag "Enviar
Mensagem", incluindo: delay, readchat, readmessages, replyid, mentions,
forward, track_source, track_id, placeholders e envio para grupos.
Exemplo Básico
{
"number": "5511999999999",
"fullName": "João Silva",
"phoneNumber": "5511999999999,5511888888888",
"organization": "Empresa XYZ",
"email": "joao.silva@empresa.com",
"url": "https://empresa.com/joao"
}
Request
Body
numberstringrequired
ID do chat para o qual a mensagem será enviada. Pode ser um número de telefone em
formato internacional, um ID de grupo (@g.us), um ID de usuário (com @s.whatsapp.net
ou @lid).
Example: "5511999999999"
fullNamestringrequired
Nome completo do contato
Example: "João Silva"
phoneNumberstringrequired
Números de telefone (separados por vírgula)
Example: "5511999999999,5511888888888"
organizationstring
Nome da organização/empresa
Example: "Empresa XYZ"
emailstring
Endereço de email
Example: "joao@empresa.com"
urlstring
URL pessoal ou da empresa
Example: "https://empresa.com/joao"
replyidstring
ID da mensagem para responder
Example: "3EB0538DA65A59F6D8A251"
mentionsstring
Números para mencionar (separados por vírgula)
Example: "5511999999999,5511888888888"
readchatboolean
Marca conversa como lida após envio
Example: true
readmessagesboolean
Marca últimas mensagens recebidas como lidas
Example: true
delayinteger
Atraso em milissegundos antes do envio, durante o atraso apacerá 'Digitando...'
Example: 1000
forwardboolean
Marca a mensagem como encaminhada no WhatsApp
Example: true
track_sourcestring
Origem do rastreamento da mensagem
Example: "chatwoot"
track_idstring
ID para rastreamento da mensagem (aceita valores duplicados)
Example: "msg_123456789"
asyncboolean
Se true, envia a mensagem de forma assíncrona via fila interna
curl --request POST \
--url https://free.uazapi.com/send/contact \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"fullName": "João Silva",
"phoneNumber": "5511999999999,5511888888888",
"organization": "Empresa XYZ",
"email": "joao@empresa.com",
"url": "https://empresa.com/joao",
"replyid": "3EB0538DA65A59F6D8A251",
"mentions": "5511999999999,5511888888888",
"readchat": true,
"readmessages": true,
"delay": 1000,
"forward": true,
"track_source": "chatwoot",
"track_id": "msg_123456789",
"async": false
}'
Envia uma localização geográfica para um contato ou grupo.
Recursos Específicos
● Coordenadas precisas (latitude e longitude obrigatórias)
● Nome do local para identificação
● Endereço completo para exibição detalhada
● Mapa interativo no WhatsApp para navegação
● Pin personalizado com nome do local
Campos Comuns
Este endpoint suporta todos os campos opcionais comuns documentados na tag "Enviar
Mensagem", incluindo: delay, readchat, readmessages, replyid, mentions,
forward, track_source, track_id, placeholders e envio para grupos.
Exemplo Básico
{
"number": "5511999999999",
"name": "Maracanã",
"address": "Av. Pres. Castelo Branco - Maracanã, Rio de Janeiro - RJ",
"latitude": -22.912982815767986,
"longitude": -43.23028153499254
}
Request
Body
numberstringrequired
ID do chat para o qual a mensagem será enviada. Pode ser um número de telefone em
formato internacional, um ID de grupo (@g.us), um ID de usuário (com @s.whatsapp.net
ou @lid).
Example: "5511999999999"
namestring
Nome do local
Example: "MASP"
addressstring
Endereço do local
Example: "Av. Paulista, 1578 - Bela Vista, São Paulo - SP"
latitudenumberrequired
Latitude (-90 a 90)
Example: -23.5616
longitudenumberrequired
Longitude (-180 a 180)
Example: -46.6562
replyidstring
ID da mensagem para responder
Example: "3EB0538DA65A59F6D8A251"
mentionsstring
Números para mencionar (separados por vírgula)
Example: "5511999999999,5511888888888"
readchatboolean
Marca conversa como lida após envio
Example: true
readmessagesboolean
Marca últimas mensagens recebidas como lidas
Example: true
delayinteger
Atraso em milissegundos antes do envio, durante o atraso apacerá 'Digitando...'
Example: 1000
forwardboolean
Marca a mensagem como encaminhada no WhatsApp
Example: true
track_sourcestring
Origem do rastreamento da mensagem
Example: "chatwoot"
track_idstring
ID para rastreamento da mensagem (aceita valores duplicados)
Example: "msg_123456789"
asyncboolean
Se true, envia a mensagem de forma assíncrona via fila interna
curl --request POST \
--url https://free.uazapi.com/send/location \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"name": "MASP",
"address": "Av. Paulista, 1578 - Bela Vista, São Paulo - SP",
"latitude": -23.5616,
"longitude": -46.6562,
"replyid": "3EB0538DA65A59F6D8A251",
"mentions": "5511999999999,5511888888888",
"readchat": true,
"readmessages": true,
"delay": 1000,
"forward": true,
"track_source": "chatwoot",
"track_id": "msg_123456789",
"async": false
}'
Envia uma atualização de presença para um contato ou grupo de forma assíncrona.
🔄 Comportamento Assíncrono:
● Execução independente: A presença é gerenciada em background, não bloqueia o
retorno da API
● Limite máximo: 5 minutos de duração (300 segundos)
● Tick de atualização: Reenvia a presença a cada 10 segundos
● Cancelamento automático: Presença é cancelada automaticamente ao enviar uma
mensagem para o mesmo chat
📱 Tipos de presença suportados:
● composing: Indica que você está digitando uma mensagem
● recording: Indica que você está gravando um áudio
● paused: Remove/cancela a indicação de presença atual
⏱ Controle de duração:
● Sem delay: Usa limite padrão de 5 minutos
● Com delay: Usa o valor especificado (máximo 5 minutos)
● Cancelamento: Envio de mensagem cancela presença automaticamente
📋 Exemplos de uso:
Digitar por 30 segundos:
{
"number": "5511999999999",
"presence": "composing",
"delay": 30000
}
Gravar áudio por 1 minuto:
{
"number": "5511999999999",
"presence": "recording",
"delay": 60000
}
Cancelar presença atual:
{
"number": "5511999999999",
"presence": "paused"
}
Usar limite máximo (5 minutos):
{
"number": "5511999999999",
"presence": "composing"
}
Request
Body
numberstringrequired
Número do destinatário no formato internacional (ex: 5511999999999)
Example: "5511999999999"
presencestringrequired
Tipo de presença a ser enviada
Valores possíveis: composing, recording, paused
Example: "composing"
delayinteger
Duração em milissegundos que a presença ficará ativa (máximo 5 minutos = 300000ms). Se
não informado ou valor maior que 5 minutos, usa o limite padrão de 5 minutos. A presença é
reenviada a cada 10 segundos durante este período.
Example: 30000
curl --request POST \
--url https://free.uazapi.com/message/presence \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"presence": "composing",
"delay": 30000
}'
Envia um story (status) com suporte para texto, imagem, vídeo e áudio.
Suporte a campos de rastreamento: Este endpoint também suporta track_source e
track_id documentados na tag "Enviar Mensagem".
Tipos de Status
● text: Texto com estilo e cor de fundo
● image: Imagens com legenda opcional
● video: Vídeos com thumbnail e legenda
● audio: Áudio normal ou mensagem de voz (PTT)
Cores de Fundo
● 1-3: Tons de amarelo
● 4-6: Tons de verde
● 7-9: Tons de azul
● 10-12: Tons de lilás
● 13: Magenta
● 14-15: Tons de rosa
● 16: Marrom claro
● 17-19: Tons de cinza (19 é o padrão)
Fontes (para texto)
● 0: Padrão
● 1-8: Estilos alternativos
Limites
● Texto: Máximo 656 caracteres
● Imagem: JPG, PNG, GIF
● Vídeo: MP4, MOV
● Áudio: MP3, OGG, WAV (convertido para OGG/OPUS)
Exemplo
{
"type": "text",
"text": "Novidades chegando!",
"background_color": 7,
"font": 1
}
Request
Body
typestringrequired
Tipo do status
Valores possíveis: text, image, video, audio, myaudio, ptt
Example: "text"
textstring
Texto principal ou legenda
Example: "Novidades chegando!"
background_colorinteger
Código da cor de fundo
Example: 7
fontinteger
Estilo da fonte (apenas para type=text)
Example: 1
filestring
URL ou Base64 do arquivo de mídia
Example: "https://example.com/video.mp4"
thumbnailstring
URL ou Base64 da miniatura (opcional para vídeos)
Example: "https://example.com/thumb.jpg"
mimetypestring
MIME type do arquivo (opcional)
Example: "video/mp4"
replyidstring
ID da mensagem para responder
Example: "3EB0538DA65A59F6D8A251"
mentionsstring
Números para mencionar (separados por vírgula)
Example: "5511999999999,5511888888888"
readchatboolean
Marca conversa como lida após envio
Example: true
readmessagesboolean
Marca últimas mensagens recebidas como lidas
Example: true
delayinteger
Atraso em milissegundos antes do envio
Example: 1000
forwardboolean
Marca a mensagem como encaminhada no WhatsApp
asyncboolean
Se true, envia a mensagem de forma assíncrona via fila interna
track_sourcestring
Origem do rastreamento da mensagem
Example: "chatwoot"
track_idstring
ID para rastreamento da mensagem (aceita valores duplicados)
Example: "msg_123456789"
curl --request POST \
--url https://free.uazapi.com/send/status \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"type": "text",
"text": "Novidades chegando!",
"background_color": 7,
"font": 1,
"file": "https://example.com/video.mp4",
"thumbnail": "https://example.com/thumb.jpg",
"mimetype": "video/mp4",
"replyid": "3EB0538DA65A59F6D8A251",
"mentions": "5511999999999,5511888888888",
"readchat": true,
"readmessages": true,
"delay": 1000,
"forward": false,
"async": false,
"track_source": "chatwoot",
"track_id": "msg_123456789"
}'
Este endpoint oferece uma interface unificada para envio de quatro tipos principais de
mensagens interativas:
● Botões: Para ações rápidas e diretas
● Carrosel de Botões: Para uma lista horizontal de botões com imagens
● Listas: Para menus organizados em seções
● Enquetes: Para coleta de opiniões e votações
Suporte a campos de rastreamento: Este endpoint também suporta track_source e
track_id documentados na tag "Enviar Mensagem".
Estrutura Base do Payload
Todas as requisições seguem esta estrutura base:
{
"number": "5511999999999",
"type": "button|list|poll|carousel",
"text": "Texto principal da mensagem",
"choices": ["opções baseadas no tipo escolhido"],
"footerText": "Texto do rodapé (opcional para botões e listas)",
"listButton": "Texto do botão (para listas)",
"selectableCount": "Número de opções selecionáveis (apenas para enquetes)"
}
Tipos de Mensagens Interativas
1. Botões (type: "button")
Cria botões interativos com diferentes funcionalidades de ação.
Campos Específicos
● footerText: Texto opcional exibido abaixo da mensagem principal
● choices: Array de opções que serão convertidas em botões
Formatos de Botões
Cada botão pode ser configurado usando | (pipe) ou \n (quebra de linha) como
separadores:
● Botão de Resposta:
○ "texto|id" ou
○ "texto\nid" ou
○ "texto" (ID será igual ao texto)
● Botão de Cópia:
○ "texto|copy:código" ou
○ "texto\ncopy:código"
● Botão de Chamada:
○ "texto|call:+5511999999999" ou
○ "texto\ncall:+5511999999999"
● Botão de URL:
○ "texto|https://exemplo.com" ou
○ "texto|url:https://exemplo.com"
Botões com Imagem
Para adicionar uma imagem aos botões, use o campo imageButton no payload:
Exemplo com Imagem
{
"number": "5511999999999",
"type": "button",
"text": "Escolha um produto:",
"imageButton": "https://exemplo.com/produto1.jpg",
"choices": [
"Produto A|prod_a",
"Mais Info|https://exemplo.com/produto-a",
"Produto B|prod_b",
"Ligar|call:+5511999999999"
],
"footerText": "Produtos em destaque"
}
Suporte: O campo imageButton aceita URLs ou imagens em base64.
Exemplo Completo
{
"number": "5511999999999",
"type": "button",
"text": "Como podemos ajudar?",
"choices": [
"Suporte Técnico|suporte",
"Fazer Pedido|pedido",
"Nosso Site|https://exemplo.com",
"Falar Conosco|call:+5511999999999"
],
"footerText": "Escolha uma das opções abaixo"
}
Limitações e Compatibilidade
Importante: Ao combinar botões de resposta com outros tipos (call, url, copy)
na mesma mensagem, será exibido o aviso: "Não é possível exibir esta
mensagem no WhatsApp Web. Abra o WhatsApp no seu celular para
visualizá-la."
2. Listas (type: "list")
Cria menus organizados em seções com itens selecionáveis.
Campos Específicos
● listButton: Texto do botão que abre a lista
● footerText: Texto opcional do rodapé
● choices: Array com seções e itens da lista
Formato das Choices
● "[Título da Seção]": Inicia uma nova seção
● "texto|id|descrição": Item da lista com:
○ texto: Label do item
○ id: Identificador único, opcional
○ descrição: Texto descritivo adicional e opcional
Exemplo Completo
{
"number": "5511999999999",
"type": "list",
"text": "Catálogo de Produtos",
"choices": [
"[Eletrônicos]",
"Smartphones|phones|Últimos lançamentos",
"Notebooks|notes|Modelos 2024",
"[Acessórios]",
"Fones|fones|Bluetooth e com fio",
"Capas|cases|Proteção para seu device"
],
"listButton": "Ver Catálogo",
"footerText": "Preços sujeitos a alteração"
}
3. Enquetes (type: "poll")
Cria enquetes interativas para votação.
Campos Específicos
● selectableCount: Número de opções que podem ser selecionadas (padrão: 1)
● choices: Array simples com as opções de voto
Exemplo Completo
{
"number": "5511999999999",
"type": "poll",
"text": "Qual horário prefere para atendimento?",
"choices": [
"Manhã (8h-12h)",
"Tarde (13h-17h)",
"Noite (18h-22h)"
],
"selectableCount": 1
}
4. Carousel (type: "carousel")
Cria um carrossel de cartões com imagens e botões interativos.
Campos Específicos
● choices: Array com elementos do carrossel na seguinte ordem:
○ [Texto do cartão]: Texto do cartão entre colchetes
○ {URL ou base64 da imagem}: Imagem entre chaves
○ Botões do cartão (um por linha):
■ "texto|copy:código" para botão de copiar
■ "texto|https://url" para botão de link
■ "texto|call:+número" para botão de ligação
Exemplo Completo
{
"number": "5511999999999",
"type": "carousel",
"text": "Conheça nossos produtos",
"choices": [
"[Smartphone XYZ\nO mais avançado smartphone da linha]",
"{https://exemplo.com/produto1.jpg}",
"Copiar Código|copy:PROD123",
"Ver no Site|https://exemplo.com/xyz",
"Fale Conosco|call:+5511999999999",
"[Notebook ABC\nO notebook ideal para profissionais]",
"{https://exemplo.com/produto2.jpg}",
"Copiar Código|copy:NOTE456",
"Comprar Online|https://exemplo.com/abc",
"Suporte|call:+5511988888888"
]
}
Nota: Criamos outro endpoint para carrossel: /send/carousel, funciona da
mesma forma, mas com outro formato de payload. Veja o que é mais fácil para
você.
Termos de uso
Os recursos de botões interativos e listas podem ser descontinuados a qualquer momento
sem aviso prévio. Não nos responsabilizamos por quaisquer alterações ou indisponibilidade
destes recursos.
Alternativas e Compatibilidade
Considerando a natureza dinâmica destes recursos, nosso endpoint foi projetado para
facilitar a migração entre diferentes tipos de mensagens (botões, listas e enquetes).
Recomendamos criar seus fluxos de forma flexível, preparados para alternar entre os
diferentes tipos.
Em caso de descontinuidade de algum recurso, você poderá facilmente migrar para outro
tipo de mensagem apenas alterando o campo "type" no payload, mantendo a mesma
estrutura de choices.
Request
Body
numberstringrequired
ID do chat para o qual a mensagem será enviada. Pode ser um número de telefone em
formato internacional, um ID de grupo (@g.us), um ID de usuário (com @s.whatsapp.net
ou @lid).
Example: "5511999999999"
typestringrequired
Tipo do menu (button, list, poll, carousel)
Valores possíveis: button, list, poll, carousel
Example: "list"
textstringrequired
Texto principal (aceita placeholders)
Example: "Escolha uma opção:"
footerTextstring
Texto do rodapé (opcional)
Example: "Menu de serviços"
listButtonstring
Texto do botão principal
Example: "Ver opções"
selectableCountinteger
Número máximo de opções selecionáveis (para enquetes)
Example: 1
choicesarrayrequired
Lista de opções. Use [Título] para seções em listas
Example: ["[Eletrônicos]","Smartphones|phones|Últimos
lançamentos","Notebooks|notes|Modelos 2024","[Acessórios]","Fones|fones|Bluetooth e
com fio","Capas|cases|Proteção para seu device"]
imageButtonstring
URL da imagem para botões (recomendado para type: button)
Example: "https://exemplo.com/imagem-botao.jpg"
replyidstring
ID da mensagem para responder
Example: "3EB0538DA65A59F6D8A251"
mentionsstring
Números para mencionar (separados por vírgula)
Example: "5511999999999,5511888888888"
readchatboolean
Marca conversa como lida após envio
Example: true
readmessagesboolean
Marca últimas mensagens recebidas como lidas
Example: true
delayinteger
Atraso em milissegundos antes do envio, durante o atraso apacerá 'Digitando...'
Example: 1000
track_sourcestring
Origem do rastreamento da mensagem
Example: "chatwoot"
track_idstring
ID para rastreamento da mensagem (aceita valores duplicados)
Example: "msg_123456789"
asyncboolean
Se true, envia a mensagem de forma assíncrona via fila interna
curl --request POST \
--url https://free.uazapi.com/send/menu \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"type": "list",
"text": "Escolha uma opção:",
"footerText": "Menu de serviços",
"listButton": "Ver opções",
"selectableCount": 1,
"choices": [
"[Eletrônicos]",
"Smartphones|phones|Últimos lançamentos",
"Notebooks|notes|Modelos 2024",
"[Acessórios]",
"Fones|fones|Bluetooth e com fio",
"Capas|cases|Proteção para seu device"
],
"imageButton": "https://exemplo.com/imagem-botao.jpg",
"replyid": "3EB0538DA65A59F6D8A251",
"mentions": "5511999999999,5511888888888",
"readchat": true,
"readmessages": true,
"delay": 1000,
"track_source": "chatwoot",
"track_id": "msg_123456789",
"async": false
}'
Enviar carrossel de mídia com botões
Este endpoint permite enviar um carrossel com imagens e botões interativos. Funciona de
maneira igual ao endpoint /send/menu com type: carousel, porém usando outro formato de
payload.
Campos Comuns
Este endpoint suporta todos os campos opcionais comuns documentados na tag "Enviar
Mensagem", incluindo: delay, readchat, readmessages, replyid, mentions,
forward, track_source, track_id, placeholders e envio para grupos.
Estrutura do Payload
{
"number": "5511999999999",
"text": "Texto principal",
"carousel": [
{
"text": "Texto do cartão",
"image": "URL da imagem",
"buttons": [
{
"id": "resposta1",
"text": "Texto do botão",
"type": "REPLY"
}
]
}
],
"delay": 1000,
"readchat": true
}
Tipos de Botões
● REPLY: Botão de resposta rápida
○ Quando clicado, envia o valor do id como resposta ao chat
○ O id será o texto enviado como resposta
● URL: Botão com link
○ Quando clicado, abre a URL especificada
○ O id deve conter a URL completa (ex: https://exemplo.com)
● COPY: Botão para copiar texto
○ Quando clicado, copia o texto para a área de transferência
○ O id será o texto que será copiado
● CALL: Botão para realizar chamada
○ Quando clicado, inicia uma chamada telefônica
○ O id deve conter o número de telefone
Exemplo de Botões
{
"buttons": [
{
"id": "Sim, quero comprar!",
"text": "Confirmar Compra",
"type": "REPLY"
},
{
"id": "https://exemplo.com/produto",
"text": "Ver Produto",
"type": "URL"
},
{
"id": "CUPOM20",
"text": "Copiar Cupom",
"type": "COPY"
},
{
"id": "5511999999999",
"text": "Falar com Vendedor",
"type": "CALL"
}
]
}
Exemplo Completo de Carrossel
{
"number": "5511999999999",
"text": "Nossos Produtos em Destaque",
"carousel": [
{
"text": "Smartphone XYZ\nO mais avançado smartphone da linha",
"image": "https://exemplo.com/produto1.jpg",
"buttons": [
{
"id": "SIM_COMPRAR_XYZ",
"text": "Comprar Agora",
"type": "REPLY"
},
{
"id": "https://exemplo.com/xyz",
"text": "Ver Detalhes",
"type": "URL"
}
]
},
{
"text": "Cupom de Desconto\nGanhe 20% OFF em qualquer produto",
"image": "https://exemplo.com/cupom.jpg",
"buttons": [
{
"id": "DESCONTO20",
"text": "Copiar Cupom",
"type": "COPY"
},
{
"id": "5511999999999",
"text": "Falar com Vendedor",
"type": "CALL"
}
]
}
],
"delay": 0,
"readchat": true
}
Request
Body
numberstringrequired
ID do chat para o qual a mensagem será enviada. Pode ser um número de telefone em
formato internacional, um ID de grupo (@g.us), um ID de usuário (com @s.whatsapp.net
ou @lid).
Example: "5511999999999"
textstringrequired
Texto principal da mensagem
Example: "Nossos Produtos em Destaque"
carouselarrayrequired
Array de cartões do carrossel
delayinteger
Atraso em milissegundos antes do envio
Example: 1000
readchatboolean
Marca conversa como lida após envio
Example: true
readmessagesboolean
Marca últimas mensagens recebidas como lidas
Example: true
replyidstring
ID da mensagem para responder
Example: "3EB0538DA65A59F6D8A251"
mentionsstring
Números para mencionar (separados por vírgula)
Example: "5511999999999,5511888888888"
forwardboolean
Marca a mensagem como encaminhada no WhatsApp
asyncboolean
Se true, envia a mensagem de forma assíncrona via fila interna
track_sourcestring
Origem do rastreamento da mensagem
Example: "chatwoot"
track_idstring
ID para rastreamento da mensagem (aceita valores duplicados)
Example: "msg_123456789"
curl --request POST \
--url https://free.uazapi.com/send/carousel \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"text": "Nossos Produtos em Destaque",
"carousel": [
{
"text": "Smartphone XYZ\nO mais avançado smartphone da linha",
"image": "https://exemplo.com/produto1.jpg",
"video": "https://exemplo.com/produto1.mp4",
"document": "https://exemplo.com/catalogo.pdf",
"filename": "Catalogo.pdf",
"buttons": [
{
"id": "buy_xyz",
"text": "Comprar Agora",
"type": "REPLY"
}
]
}
],
"delay": 1000,
"readchat": true,
"readmessages": true,
"replyid": "3EB0538DA65A59F6D8A251",
"mentions": "5511999999999,5511888888888",
"forward": false,
"async": false,
"track_source": "chatwoot",
"track_id": "msg_123456789"
}'
Este endpoint envia uma mensagem com um botão que solicita a localização do usuário.
Quando o usuário clica no botão, o WhatsApp abre a interface para compartilhar a
localização atual.
Campos Comuns
Este endpoint suporta todos os campos opcionais comuns documentados na tag "Enviar
Mensagem", incluindo: delay, readchat, readmessages, replyid, mentions,
forward, track_source, track_id, placeholders e envio para grupos.
Estrutura do Payload
{
"number": "5511999999999",
"text": "Por favor, compartilhe sua localização",
"delay": 0,
"readchat": true
}
Exemplo de Uso
{
"number": "5511999999999",
"text": "Para continuar o atendimento, clique no botão abaixo e compartilhe sua
localização"
}
Nota: O botão de localização é adicionado automaticamente à mensagem
Request
Body
numberstringrequired
ID do chat para o qual a mensagem será enviada. Pode ser um número de telefone em
formato internacional, um ID de grupo (@g.us), um ID de usuário (com @s.whatsapp.net
ou @lid).
Example: "5511999999999"
textstringrequired
Texto da mensagem que será exibida
Example: "Por favor, compartilhe sua localização"
delayinteger
Atraso em milissegundos antes do envio
0
readchatboolean
Se deve marcar a conversa como lida após envio
Example: true
readmessagesboolean
Marca últimas mensagens recebidas como lidas
Example: true
replyidstring
ID da mensagem para responder
Example: "3EB0538DA65A59F6D8A251"
mentionsstring
Números para mencionar (separados por vírgula)
Example: "5511999999999,5511888888888"
asyncboolean
Se true, envia a mensagem de forma assíncrona via fila interna
track_sourcestring
Origem do rastreamento da mensagem
Example: "chatwoot"
track_idstring
ID para rastreamento da mensagem (aceita valores duplicados)
Example: "msg_123456789"
curl --request POST \
--url https://free.uazapi.com/send/location-button \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"text": "Por favor, compartilhe sua localização",
"delay": 0,
"readchat": true,
"readmessages": true,
"replyid": "3EB0538DA65A59F6D8A251",
"mentions": "5511999999999,5511888888888",
"async": false,
"track_source": "chatwoot",
"track_id": "msg_123456789"
}'
Envia uma solicitação de pagamento com o botão nativo "Revisar e pagar" do WhatsApp.
O fluxo suporta PIX (estático, dinâmico ou desabilitado), boleto, link de pagamento e cartão,
combinando tudo em uma única mensagem interativa.
Como funciona
● Define o valor em amount (BRL por padrão) e opcionalmente personaliza título,
texto e nota adicional.
● Por padrão exige pixKey.
● O arquivo apontado por fileUrl é anexado como documento (boleto ou fatura em
PDF, por exemplo).
● paymentLink habilita o botão externo.
Campos comuns
Este endpoint também suporta os campos padrão: delay, readchat, readmessages,
replyid, mentions, track_source, track_id e async.
Request
Body
numberstringrequired
ID do chat para o qual a mensagem será enviada. Pode ser um número de telefone em
formato internacional, um ID de grupo (@g.us), um ID de usuário (com @s.whatsapp.net
ou @lid).
Example: "5511999999999"
titlestring
Título que aparece no cabeçalho do fluxo
Example: "Detalhes do pedido"
textstring
Mensagem exibida no corpo do fluxo
Example: "Pedido #123 pronto para pagamento"
footerstring
Texto do rodapé da mensagem
Example: "Loja Exemplo"
itemNamestring
Nome do item principal listado no fluxo
Example: "Assinatura Plano Ouro"
invoiceNumberstring
Identificador ou número da fatura
Example: "PED-123"
amountnumberrequired
Valor da cobrança (em BRL por padrão)
Example: 199.9
pixKeystring
Chave PIX estático (CPF/CNPJ/telefone/email/EVP)
Example: "123e4567-e89b-12d3-a456-426614174000"
pixTypestring
Tipo da chave PIX (CPF, CNPJ, PHONE, EMAIL, EVP). Padrão EVP
Example: "EVP"
pixNamestring
Nome do recebedor exibido no fluxo (padrão usa o nome do perfil da instância)
Example: "Loja Exemplo"
paymentLinkstring
URL externa para checkout (somente dominios homologados; veja lista acima)
Example: "https://pagamentos.exemplo.com/checkout/abc"
fileUrlstring
URL ou caminho (base64) do documento a ser anexado (ex.: boleto PDF)
Example: "https://cdn.exemplo.com/boleto-123.pdf"
fileNamestring
Nome do arquivo exibido no WhatsApp ao anexar fileUrl
Example: "boleto-123.pdf"
boletoCodestring
Linha digitável do boleto (habilita o método boleto automaticamente)
Example: "34191.79001 01043.510047 91020.150008 5 91070026000"
replyidstring
ID da mensagem que será respondida
mentionsstring
Números mencionados separados por vírgula
delayinteger
Atraso em milissegundos antes do envio (exibe "digitando..." no WhatsApp)
readchatboolean
Marca o chat como lido após enviar a mensagem
readmessagesboolean
Marca mensagens recentes como lidas após o envio
asyncboolean
Enfileira o envio para processamento assíncrono
track_sourcestring
Origem de rastreamento (ex.: chatwoot, crm-interno)
track_idstring
Identificador de rastreamento (aceita valores duplicados)
curl --request POST \
--url https://free.uazapi.com/send/request-payment \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"amount": 199.9,
"text": "Pedido #123 pronto para pagamento",
"pixKey": "123e4567-e89b-12d3-a456-426614174000",
"pixType": "EVP"
}'
Envia um botão nativo do WhatsApp que abre para pagamento PIX com a chave informada.
O usuário visualiza o detalhe do recebedor, nome e chave.
Regras principais
● pixType aceita: CPF, CNPJ, PHONE, EMAIL, EVP (case insensitive)
● pixName padrão: "Pix" quando não informado - nome de quem recebe o
pagamento
Campos comuns
Este endpoint herda os campos opcionais padronizados da tag "Enviar Mensagem":
delay, readchat, readmessages, replyid, mentions, track_source, track_id e
async.
Exemplo de payload
{
"number": "5511999999999",
"pixType": "EVP",
"pixKey": "123e4567-e89b-12d3-a456-426614174000",
"pixName": "Loja Exemplo"
}
Request
Body
numberstringrequired
ID do chat para o qual a mensagem será enviada. Pode ser um número de telefone em
formato internacional, um ID de grupo (@g.us), um ID de usuário (com @s.whatsapp.net
ou @lid).
Example: "5511999999999"
pixTypestringrequired
Tipo da chave PIX. Valores aceitos: CPF, CNPJ, PHONE, EMAIL ou EVP
Example: "EVP"
pixKeystringrequired
Valor da chave PIX (CPF/CNPJ/telefone/email/EVP)
Example: "123e4567-e89b-12d3-a456-426614174000"
pixNamestring
Nome exibido como recebedor do PIX (padrão "Pix" se vazio)
Example: "Loja Exemplo"
asyncboolean
Enfileira o envio para processamento assíncrono
delayinteger
Atraso em milissegundos antes do envio (exibe "digitando..." no WhatsApp)
readchatboolean
Marca o chat como lido após enviar a mensagem
readmessagesboolean
Marca mensagens recentes como lidas após o envio
replyidstring
ID da mensagem que será respondida
mentionsstring
Lista de números mencionados separados por vírgula
track_sourcestring
Origem de rastreamento (ex.: chatwoot, crm-interno)
track_idstring
Identificador de rastreamento (aceita valores duplicados)
curl --request POST \
--url https://free.uazapi.com/send/pix-button \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"pixType": "EVP",
"pixKey": "123e4567-e89b-12d3-a456-426614174000",
"pixName": "Loja Exemplo"
}'
Baixa o arquivo associado a uma mensagem de mídia (imagem, vídeo, áudio, documento
ou sticker).
Parâmetros
● id (string, obrigatório): ID da mensagem
● return_base64 (boolean, default: false): Retorna arquivo em base64
● generate_mp3 (boolean, default: true): Para áudios, define formato de retorno
○ true: Retorna MP3
○ false: Retorna OGG
● return_link (boolean, default: true): Retorna URL pública do arquivo
● transcribe (boolean, default: false): Transcreve áudios para texto
● openai_apikey (string, opcional): Chave OpenAI para transcrição
○ Se não informada, usa a chave salva na instância
○ Se informada, atualiza e salva na instância para próximas chamadas
● download_quoted (boolean, default: false): Baixa mídia da mensagem citada
○ Útil para baixar conteúdo original de status do WhatsApp
○ Quando uma mensagem é resposta a um status, permite baixar a mídia do
status original
○ Contextualização: Ao baixar a mídia citada, você identifica o contexto da
conversa
■ Exemplo: Se alguém responde a uma promoção, baixando a mídia
você saberá que a pergunta é sobre aquela promoção específica
Exemplos
Baixar áudio como MP3:
{
"id": "7EB0F01D7244B421048F0706368376E0",
"generate_mp3": true
}
Transcrever áudio:
{
"id": "7EB0F01D7244B421048F0706368376E0",
"transcribe": true
}
Apenas base64 (sem salvar):
{
"id": "7EB0F01D7244B421048F0706368376E0",
"return_base64": true,
"return_link": false
}
Baixar mídia de status (mensagem citada):
{
"id": "7EB0F01D7244B421048F0706368376E0",
"download_quoted": true
}
Útil quando o cliente responde a uma promoção/status - você baixa a mídia original para
entender sobre qual produto/oferta ele está perguntando.
Resposta
{
"fileURL": "https://api.exemplo.com/files/arquivo.mp3",
"mimetype": "audio/mpeg",
"base64Data": "UklGRkj...",
"transcription": "Texto transcrito"
}
Nota:
● Por padrão, se não definido o contrário:
1. áudios são retornados como MP3.
2. E todos os pedidos de download são retornados com URL pública.
● Transcrição requer chave OpenAI válida. A chave pode ser configurada uma vez na
instância e será reutilizada automaticamente.
Request
Body
idstringrequired
ID da mensagem contendo o arquivo
Example: "7EB0F01D7244B421048F0706368376E0"
return_base64boolean
Se verdadeiro, retorna o conteúdo em base64
generate_mp3boolean
Para áudios, define formato de retorno (true=MP3, false=OGG)
return_linkboolean
Salva e retorna URL pública do arquivo
transcribeboolean
Se verdadeiro, transcreve áudios para texto
openai_apikeystring
Chave da API OpenAI para transcrição (opcional)
Example: "sk-..."
download_quotedboolean
Se verdadeiro, baixa mídia da mensagem citada ao invés da mensagem principal
curl --request POST \
--url https://free.uazapi.com/message/download \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": "7EB0F01D7244B421048F0706368376E0",
"return_base64": false,
"generate_mp3": false,
"return_link": false,
"transcribe": false,
"openai_apikey": "sk-...",
"download_quoted": false
}'
Busca mensagens com múltiplos filtros disponíveis. Este endpoint permite:
1. Busca por ID específico: Use id para encontrar uma mensagem exata
2. Filtrar por chat: Use chatid para mensagens de uma conversa específica
3. Filtrar por rastreamento: Use track_source e track_id para mensagens com
dados de tracking
4. Limitar resultados: Use limit para controlar quantas mensagens retornar
5. Ordenação: Resultados ordenados por data (mais recentes primeiro)
Request
Body
idstring
ID específico da mensagem para busca exata
Example: "user123:r3EB0538"
chatidstring
ID do chat no formato internacional
Example: "5511999999999@s.whatsapp.net"
track_sourcestring
Origem do rastreamento para filtrar mensagens
Example: "chatwoot"
track_idstring
ID de rastreamento para filtrar mensagens
Example: "msg_123456789"
limitinteger
Numero maximo de mensagens a retornar (padrao 100)
Example: 20
offsetinteger
Deslocamento para paginacao (0 retorna as mensagens mais recentes)
curl --request POST \
--url https://free.uazapi.com/message/find \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"chatid": "5511999999999@s.whatsapp.net",
"limit": 20,
"offset": 0
}'
Marca uma ou mais mensagens como lidas. Este endpoint permite:
1. Marcar múltiplas mensagens como lidas de uma vez
2. Atualizar o status de leitura no WhatsApp
3. Sincronizar o status de leitura entre dispositivos
Exemplo de requisição básica:
{
"id": [
"62AD1AD844E518180227BF68DA7ED710",
"ECB9DE48EB41F77BFA8491BFA8D6EF9B"
]
}
Exemplo de resposta:
{
"success": true,
"message": "Messages marked as read",
"markedMessages": [
{
"id": "62AD1AD844E518180227BF68DA7ED710",
"timestamp": 1672531200000
},
{
"id": "ECB9DE48EB41F77BFA8491BFA8D6EF9B",
"timestamp": 1672531300000
}
]
}
Parâmetros disponíveis:
● id: Lista de IDs das mensagens a serem marcadas como lidas
Erros comuns:
● 401: Token inválido ou expirado
● 400: Lista de IDs vazia ou inválida
● 404: Uma ou mais mensagens não encontradas
● 500: Erro ao marcar mensagens como lidas
Request
Body
idarrayrequired
Lista de IDs das mensagens a serem marcadas como lidas
Example:
["62AD1AD844E518180227BF68DA7ED710","ECB9DE48EB41F77BFA8491BFA8D6EF9B"
]
curl --request POST \
--url https://free.uazapi.com/message/markread \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": [
"62AD1AD844E518180227BF68DA7ED710",
"ECB9DE48EB41F77BFA8491BFA8D6EF9B"
]
}'
Envia uma reação (emoji) a uma mensagem específica. Este endpoint permite:
1. Adicionar ou remover reações em mensagens
2. Usar qualquer emoji Unicode válido
3. Reagir a mensagens em chats individuais ou grupos
4. Remover reações existentes
5. Verificar o status da reação enviada
Tipos de reações suportados:
● Qualquer emoji Unicode válido (👍, ❤, 😂, etc)
● String vazia para remover reação
Exemplo de requisição básica:
{
"number": "5511999999999@s.whatsapp.net",
"text": "👍",
"id": "3EB0538DA65A59F6D8A251"
}
Exemplo de requisição para remover reação:
{
"number": "5511999999999@s.whatsapp.net",
"text": "",
"id": "3EB0538DA65A59F6D8A251"
}
Exemplo de resposta:
{
"success": true,
"message": "Reaction sent",
"reaction": {
"id": "3EB0538DA65A59F6D8A251",
"emoji": "👍",
"timestamp": 1672531200000,
"status": "sent"
}
}
Exemplo de resposta ao remover reação:
{
"success": true,
"message": "Reaction removed",
"reaction": {
"id": "3EB0538DA65A59F6D8A251",
"emoji": null,
"timestamp": 1672531200000,
"status": "removed"
}
}
Parâmetros disponíveis:
● number: Número do chat no formato internacional (ex:
5511999999999@s.whatsapp.net)
● text: Emoji Unicode da reação (ou string vazia para remover reação)
● id: ID da mensagem que receberá a reação
Erros comuns:
● 401: Token inválido ou expirado
● 400: Número inválido ou emoji não suportado
● 404: Mensagem não encontrada
● 500: Erro ao enviar reação
Limitações:
● Só é possível reagir a mensagens enviadas por outros usuários
● Não é possível reagir a mensagens antigas (mais de 7 dias)
● O mesmo usuário só pode ter uma reação ativa por mensagem
Request
Body
numberstringrequired
Número do chat no formato internacional
Example: "5511999999999@s.whatsapp.net"
textstringrequired
Emoji Unicode da reação (ou string vazia para remover reação)
Example: "👍"
idstringrequired
ID da mensagem que receberá a reação
Example: "3EB0538DA65A59F6D8A251"
curl --request POST \
--url https://free.uazapi.com/message/react \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999@s.whatsapp.net",
"text": "👍",
"id": "3EB0538DA65A59F6D8A251"
}'
Apaga uma mensagem para todos os participantes da conversa.
Funcionalidades:
● Apaga mensagens em conversas individuais ou grupos
● Funciona com mensagens enviadas pelo usuário ou recebidas
● Atualiza o status no banco de dados
● Envia webhook de atualização
Notas Técnicas:
1. O ID da mensagem pode ser fornecido em dois formatos:
○ ID completo (contém ":"): usado diretamente
○ ID curto: concatenado com o owner para busca
2. Gera evento webhook do tipo "messages_update"
3. Atualiza o status da mensagem para "Deleted"
Request
Body
idstringrequired
ID da mensagem a ser apagada
curl --request POST \
--url https://free.uazapi.com/message/delete \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": "string"
}'
Edita o conteúdo de uma mensagem já enviada usando a funcionalidade nativa do
WhatsApp.
O endpoint realiza:
● Busca a mensagem original no banco de dados usando o ID fornecido
● Edita o conteúdo da mensagem para o novo texto no WhatsApp
● Gera um novo ID para a mensagem editada
● Retorna objeto de mensagem completo seguindo o padrão da API
● Dispara eventos SSE/Webhook automaticamente
Importante:
● Só é possível editar mensagens enviadas pela própria instância
● A mensagem deve existir no banco de dados
● O ID pode ser fornecido no formato completo (owner:messageid) ou apenas
messageid
● A mensagem deve estar dentro do prazo permitido pelo WhatsApp para edição
Request
Body
idstringrequired
ID único da mensagem que será editada (formato owner:messageid ou apenas messageid)
Example: "3A12345678901234567890123456789012"
textstringrequired
Novo conteúdo de texto da mensagem
Example: "Texto editado da mensagem"
curl --request POST \
--url https://free.uazapi.com/message/edit \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": "3A12345678901234567890123456789012",
"text": "Texto editado da mensagem"
}'
Deleta um chat e/ou suas mensagens do WhatsApp e/ou banco de dados. Você pode
escolher deletar:
● Apenas do WhatsApp
● Apenas do banco de dados
● Apenas as mensagens do banco de dados
● Qualquer combinação das opções acima
Request
Body
numberstringrequired
Número do chat no formato internacional. Para grupos use o ID completo do grupo.
Example: "5511999999999"
deleteChatDBboolean
Se true, deleta o chat do banco de dados
Example: true
deleteMessagesDBboolean
Se true, deleta todas as mensagens do chat do banco de dados
Example: true
deleteChatWhatsAppboolean
Se true, deleta o chat do WhatsApp
Example: true
curl --request POST \
--url https://free.uazapi.com/chat/delete \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"deleteChatDB": true,
"deleteMessagesDB": true,
"deleteChatWhatsApp": true
}'
Altera o estado de arquivamento de um chat do WhatsApp.
● Quando arquivado, o chat é movido para a seção de arquivados no WhatsApp
● A ação é sincronizada entre todos os dispositivos conectados
● Não afeta as mensagens ou o conteúdo do chat
Request
Body
numberstringrequired
Número do telefone (formato E.164) ou ID do grupo
Example: "5511999999999"
archivebooleanrequired
true para arquivar, false para desarquivar
Example: true
curl --request POST \
--url https://free.uazapi.com/chat/archive \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"archive": true
}'
Atualiza o status de leitura de um chat no WhatsApp.
Quando um chat é marcado como lido:
● O contador de mensagens não lidas é zerado
● O indicador visual de mensagens não lidas é removido
● O remetente recebe confirmação de leitura (se ativado)
Quando marcado como não lido:
● O chat aparece como pendente de leitura
● Não afeta as confirmações de leitura já enviadas
Request
Body
numberstringrequired
Identificador do chat no formato:
● Para usuários: [número]@s.whatsapp.net (ex: 5511999999999@s.whatsapp.net)
● Para grupos: [id-grupo]@g.us (ex: 123456789-987654321@g.us)
Example: "5511999999999@s.whatsapp.net"
readbooleanrequired
● true: marca o chat como lido
● false: marca o chat como não lido
curl --request POST \
--url https://free.uazapi.com/chat/read \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999@s.whatsapp.net",
"read": false
}'
Request
Body
numberstringrequired
ID do chat no formato 123456789@s.whatsapp.net ou 123456789-123456@g.us
Example: "5511999999999@s.whatsapp.net"
muteEndTimeintegerrequired
Duração do silenciamento:
● 0 = Remove silenciamento
● 8 = Silencia por 8 horas
● 168 = Silencia por 1 semana
● -1 = Silencia permanentemente
Valores possíveis: 0, 8, 168, -1
Example: 8
curl --request POST \
--url https://free.uazapi.com/chat/mute \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999@s.whatsapp.net",
"muteEndTime": 8
}'
Fixa ou desafixa um chat no topo da lista de conversas. Chats fixados permanecem no topo
mesmo quando novas mensagens são recebidas em outros chats.
Request
Body
numberstringrequired
Número do chat no formato internacional completo (ex: "5511999999999") ou ID do grupo
(ex: "123456789-123456@g.us")
Example: "5511999999999"
pinbooleanrequired
Define se o chat deve ser fixado (true) ou desafixado (false)
Example: true
curl --request POST \
--url https://free.uazapi.com/chat/pin \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"pin": true
}'
Busca chats com diversos filtros e ordenação. Suporta filtros em todos os campos do chat,
paginação e ordenação customizada.
Operadores de filtro:
● ~ : LIKE (contém)
● !~ : NOT LIKE (não contém)
● != : diferente
● >= : maior ou igual
● > : maior que
● <= : menor ou igual
● < : menor que
● Sem operador: LIKE (contém)
Request
Body
operatorstring
Operador lógico entre os filtros
Valores possíveis: AND, OR
sortstring
Campo para ordenação (+/-campo). Ex -wa_lastMsgTimestamp
limitinteger
Quantidade máxima de resultados a retornar
offsetinteger
Número de registros a pular (para paginação)
wa_fastidstring
wa_chatidstring
wa_archivedboolean
wa_contactNamestring
wa_namestring
namestring
wa_isBlockedboolean
wa_isGroupboolean
wa_isGroup_adminboolean
wa_isGroup_announceboolean
wa_isGroup_memberboolean
wa_isPinnedboolean
wa_labelstring
lead_tagsstring
lead_isTicketOpenboolean
lead_assignedAttendant_idstring
lead_statusstring
curl --request POST \
--url https://free.uazapi.com/chat/find \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"operator": "AND",
"sort": "-wa_lastMsgTimestamp",
"limit": 50,
"offset": 0,
"wa_isGroup": true,
"lead_status": "~novo",
"wa_label": "~importante"
}'
Retorna a lista de contatos salvos na agenda do celular e que estão no WhatsApp.
O endpoint realiza:
● Busca todos os contatos armazenados
● Retorna dados formatados incluindo JID e informações de nome
curl --request GET \
--url https://free.uazapi.com/contacts \
--header 'Accept: application/json'
Retorna uma lista paginada de contatos da instancia do WhatsApp. Use este endpoint
(POST) para controlar pagina, tamanho e offset via corpo da requisicao. A rota GET
/contacts continua disponivel para quem prefere a lista completa sem paginacao.
Request
Body
pageinteger
Numero da pagina para paginacao (padrao 1)
pageSizeinteger
Quantidade de resultados por pagina (padrao 100, maximo 1000)
limitinteger
Alias opcional para pageSize
offsetinteger
Deslocamento base zero para paginacao; se informado recalcula a pagina
curl --request POST \
--url https://free.uazapi.com/contacts/list \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"page": 0,
"pageSize": 0,
"limit": 0,
"offset": 0
}'
Adiciona um contato à agenda
Adiciona um novo contato à agenda do celular.
O endpoint realiza:
● Adiciona o contato à agenda usando o WhatsApp
● Usa o campo 'name' tanto para o nome completo quanto para o primeiro nome
● Salva as informações do contato na agenda do WhatsApp
● Retorna informações do contato adicionado
Request
Body
phonestringrequired
Número de telefone no formato internacional com código do país obrigatório. Para Brasil,
deve começar com 55. Aceita variações com/sem símbolo +, com/sem parênteses,
com/sem hífen e com/sem espaços. Também aceita formato JID do WhatsApp
(@s.whatsapp.net). Não aceita contatos comerciais (@lid) nem grupos (@g.us).
namestringrequired
Nome completo do contato (será usado como primeiro nome e nome completo)
Example: "João Silva"
curl --request POST \
--url https://free.uazapi.com/contact/add \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"phone": "string",
"name": "João Silva"
}'
Remove um contato da agenda do celular.
O endpoint realiza:
● Remove o contato da agenda usando o WhatsApp AppState
● Atualiza a lista de contatos sincronizada
● Retorna confirmação da remoção
Request
Body
phonestringrequired
Número de telefone no formato internacional com código do país obrigatório. Para Brasil,
deve começar com 55. Aceita variações com/sem símbolo +, com/sem parênteses,
com/sem hífen e com/sem espaços. Também aceita formato JID do WhatsApp
(@s.whatsapp.net). Não aceita contatos comerciais (@lid) nem grupos (@g.us).
curl --request POST \
--url https://free.uazapi.com/contact/remove \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"phone": "string"
}'
Retorna informações completas sobre um contato ou chat, incluindo todos os campos
disponíveis do modelo Chat.
Funcionalidades:
● Retorna chat completo: Todos os campos do modelo Chat (mais de 60 campos)
● Busca informações para contatos individuais e grupos
● URLs de imagem em dois tamanhos: preview (menor) ou full (original)
● Combina informações de diferentes fontes: WhatsApp, contatos salvos, leads
● Atualiza automaticamente dados desatualizados no banco
Campos Retornados:
● Informações básicas: id, wa_fastid, wa_chatid, owner, name, phone
● Dados do WhatsApp: wa_name, wa_contactName, wa_archived, wa_isBlocked,
etc.
● Dados de lead/CRM: lead_name, lead_email, lead_status, lead_field01-20, etc.
● Informações de grupo: wa_isGroup, wa_isGroup_admin, wa_isGroup_announce,
etc.
● Chatbot: chatbot_summary, chatbot_lastTrigger_id, chatbot_disableUntil, etc.
● Configurações: wa_muteEndTime, wa_isPinned, wa_unreadCount, etc.
Comportamento:
● Para contatos individuais:
○ Busca nome verificado do WhatsApp
○ Verifica nome salvo nos contatos
○ Formata número internacional
○ Calcula grupos em comum
● Para grupos:
○ Busca nome do grupo
○ Verifica status de comunidade
Request
Body
numberstringrequired
Número do telefone ou ID do grupo
Example: "5511999999999"
previewboolean
Controla o tamanho da imagem de perfil retornada:
● true: Retorna imagem em tamanho preview (menor, otimizada para listagens)
● false (padrão): Retorna imagem em tamanho full (resolução original, maior
qualidade)
curl --request POST \
--url https://free.uazapi.com/chat/details \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"preview": false
}'
Verifica se números fornecidos estão registrados no WhatsApp e retorna informações
detalhadas.
Funcionalidades:
● Verifica múltiplos números simultaneamente
● Suporta números individuais e IDs de grupo
● Retorna nome verificado quando disponível
● Identifica grupos e comunidades
● Verifica subgrupos de comunidades
Comportamento específico:
● Para números individuais:
○ Verifica registro no WhatsApp
○ Retorna nome verificado se disponível
○ Normaliza formato do número
● Para grupos:
○ Verifica existência
○ Retorna nome do grupo
○ Retorna id do grupo de anúncios se buscado por id de comunidade
Request
Body
numbersarray
Lista de números ou IDs de grupo para verificar
Example: ["5511999999999","123456789@g.us"]
curl --request POST \
--url https://free.uazapi.com/chat/check \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"numbers": [
"5511999999999",
"123456789@g.us"
]
}'
Bloqueia ou desbloqueia um contato do WhatsApp. Contatos bloqueados não podem enviar
mensagens para a instância e a instância não pode enviar mensagens para eles.
Request
Body
numberstringrequired
Número do WhatsApp no formato internacional (ex. 5511999999999)
Example: "5511999999999"
blockbooleanrequired
True para bloquear, False para desbloquear
Example: true
curl --request POST \
--url https://free.uazapi.com/chat/block \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"block": true
}'
Retorna a lista completa de contatos que foram bloqueados pela instância. Esta lista é
atualizada em tempo real conforme contatos são bloqueados/desbloqueados.
curl --request GET \
--url https://free.uazapi.com/chat/blocklist \
--header 'Accept: application/json'
Atualiza as labels associadas a um chat específico. Este endpoint oferece três modos de
operação:
1. Definir todas as labels (labelids): Define o conjunto completo de labels para o chat,
substituindo labels existentes
2. Adicionar uma label (add_labelid): Adiciona uma única label ao chat sem afetar as
existentes
3. Remover uma label (remove_labelid): Remove uma única label do chat sem afetar
as outras
Importante: Use apenas um dos três parâmetros por requisição. Labels inexistentes serão
rejeitadas.
As labels devem ser fornecidas no formato id ou labelid encontradas na função get labels.
Request
Body
numberstringrequired
Número do chat ou grupo
Example: "5511999999999"
labelidsarray
Lista de IDs das labels a serem aplicadas ao chat (define todas as labels)
Example: ["10","20"]
add_labelidstring
ID da label a ser adicionada ao chat
Example: "10"
remove_labelidstring
ID da label a ser removida do chat
Example: "20"
curl --request POST \
--url https://free.uazapi.com/chat/labels \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"labelids": [
"10",
"20",
"30"
]
}'
curl --request POST \
--url https://free.uazapi.com/chat/labels \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"number": "5511999999999",
"labelids": [
"10",
"20",
"30"
]
}'
curl --request POST \
--url https://free.uazapi.com/label/edit \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"labelid": "25",
"name": "responder editado",
"color": 2,
"delete": false
}'
Retorna a lista completa de etiquetas da instância.
curl --request GET \
--url https://free.uazapi.com/labels \
--header 'Accept: application/json'
Cria um novo grupo no WhatsApp com participantes iniciais.
Detalhes
● Requer autenticação via token da instância
● Os números devem ser fornecidos sem formatação (apenas dígitos)
Limitações
● Mínimo de 1 participante além do criador
Comportamento
● Retorna informações detalhadas do grupo criado
● Inclui lista de participantes adicionados com sucesso/falha
Request
Body
namestringrequired
Nome do grupo
Example: "uazapiGO grupo"
participantsarrayrequired
Lista de números de telefone dos participantes iniciais
Example: ["5521987905995","5511912345678"]
curl --request POST \
--url https://free.uazapi.com/group/create \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"name": "Meu Novo Grupo",
"participants": [
"5521987905995"
]
}'
Recupera informações completas de um grupo do WhatsApp, incluindo:
● Detalhes do grupo
● Participantes
● Configurações
● Link de convite (opcional)
Request
Body
groupjidstringrequired
Identificador único do grupo (JID)
Example: "120363153742561022@g.us"
getInviteLinkboolean
Recuperar link de convite do grupo
Example: true
getRequestsParticipantsboolean
Recuperar lista de solicitações pendentes de participação
forceboolean
Forçar atualização, ignorando cache
curl --request POST \
--url https://free.uazapi.com/group/info \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"groupjid": "120363153742561022@g.us",
"getInviteLink": true,
"getRequestsParticipants": false,
"force": false
}'
Retorna informações detalhadas de um grupo usando um código de convite ou URL
completo do WhatsApp.
Esta rota permite:
● Recuperar informações básicas sobre um grupo antes de entrar
● Validar um link de convite
● Obter detalhes como nome do grupo, número de participantes e restrições de
entrada
Request
Body
invitecodestringrequired
Código de convite ou URL completo do grupo. Pode ser um código curto ou a URL completa
do WhatsApp.
curl --request POST \
--url https://free.uazapi.com/group/inviteInfo \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"invitecode": "string"
}'
Permite entrar em um grupo do WhatsApp usando um código de convite ou URL completo.
Características:
● Suporta código de convite ou URL completo
● Valida o código antes de tentar entrar no grupo
● Retorna informações básicas do grupo após entrada bem-sucedida
● Trata possíveis erros como convite inválido ou expirado
Request
Body
invitecodestringrequired
Código de convite ou URL completo do grupo. Formatos aceitos:
● Código completo: "IYnl5Zg9bUcJD32rJrDzO7"
● URL completa: "https://chat.whatsapp.com/IYnl5Zg9bUcJD32rJrDzO7"
curl --request POST \
--url https://free.uazapi.com/group/join \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"invitecode": "https://chat.whatsapp.com/IYnl5Zg9bUcJD32rJrDzO7"
}'
Remove o usuário atual de um grupo específico do WhatsApp.
Requisitos:
● O usuário deve estar conectado a uma instância válida
● O usuário deve ser um membro do grupo
Comportamentos:
● Se o usuário for o último administrador, o grupo será dissolvido
● Se o usuário for um membro comum, será removido do grupo
Request
Body
groupjidstringrequired
Identificador único do grupo (JID)
● Formato: número@g.us
● Exemplo válido: 120363324255083289@g.us
Example: "120363324255083289@g.us"
curl --request POST \
--url https://free.uazapi.com/group/leave \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"groupjid": "120363324255083289@g.us"
}'
Retorna uma lista com todos os grupos disponíveis para a instância atual do WhatsApp.
Recursos adicionais:
● Suporta atualização forçada do cache de grupos
● Recupera informações detalhadas de grupos conectados
Parameters
Query Parameters
force
boolean
Se definido como true, força a atualização do cache de grupos. Útil para garantir que as
informações mais recentes sejam recuperadas.
Comportamentos:
● false (padrão): Usa informações em cache
● true: Busca dados atualizados diretamente do WhatsApp
noparticipants
boolean
Se definido como true, retorna a lista de grupos sem incluir os participantes. Útil para
otimizar a resposta quando não há necessidade dos dados dos participantes.
Comportamentos:
● false (padrão): Retorna grupos com lista completa de participantes
● true: Retorna grupos sem incluir os participantes
curl --request GET \
--url https://free.uazapi.com/group/list \
--header 'Accept: application/json'
Retorna uma lista com todos os grupos disponiveis para a instancia atual do WhatsApp,
com opcoes de filtros e paginacao via corpo (POST). A rota GET continua para quem
prefere a listagem direta sem paginacao.
Request
Body
pageinteger
Numero da pagina para paginacao (padrao 1)
pageSizeinteger
Quantidade de resultados por pagina (padrao 50, maximo 1000)
limitinteger
Alias opcional para pageSize
offsetinteger
Deslocamento base zero; se informado recalcula a pagina
searchstring
Texto para filtrar grupos por nome/JID
forceboolean
Se definido como true, forca a atualizacao do cache de grupos. Util para garantir que as
informacoes mais recentes sejam recuperadas.
noParticipantsboolean
Se definido como true, retorna a lista de grupos sem incluir os participantes. Util para
otimizar a resposta quando nao ha necessidade dos dados dos participantes.
curl --request POST \
--url https://free.uazapi.com/group/list \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"page": 0,
"pageSize": 0,
"limit": 0,
"offset": 0,
"search": "string",
"force": false,
"noParticipants": false
}'
Gera um novo código de convite para o grupo, invalidando o código de convite anterior.
Somente administradores do grupo podem realizar esta ação.
Principais características:
● Invalida o link de convite antigo
● Cria um novo link único
● Retorna as informações atualizadas do grupo
Request
Body
groupjidstringrequired
Identificador único do grupo (JID)
Example: "120363308883996631@g.us"
curl --request POST \
--url https://free.uazapi.com/group/resetInviteCode \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"groupjid": "120363308883996631@g.us"
}'
Define as permissões de envio de mensagens no grupo, permitindo restringir o envio
apenas para administradores.
Quando ativado (announce=true):
● Apenas administradores podem enviar mensagens
● Outros participantes podem apenas ler
● Útil para anúncios importantes ou controle de spam
Quando desativado (announce=false):
● Todos os participantes podem enviar mensagens
● Configuração padrão para grupos normais
Requer que o usuário seja administrador do grupo para fazer alterações.
Request
Body
groupjidstringrequired
Identificador único do grupo no formato xxxx@g.us
Example: "120363339858396166@g.us"
announcebooleanrequired
Controla quem pode enviar mensagens no grupo
Example: true
curl --request POST \
--url https://free.uazapi.com/group/updateAnnounce \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"groupjid": "120363339858396166@g.us",
"announce": true
}'
Altera a descrição (tópico) do grupo WhatsApp especificado. Requer que o usuário seja
administrador do grupo. A descrição aparece na tela de informações do grupo e pode ser
visualizada por todos os participantes.
Request
Body
groupjidstringrequired
JID (ID) do grupo no formato xxxxx@g.us
Example: "120363339858396166@g.us"
descriptionstringrequired
Nova descrição/tópico do grupo
Example: "Grupo oficial de suporte"
curl --request POST \
--url https://free.uazapi.com/group/updateDescription \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"groupjid": "120363339858396166@g.us",
"description": "Grupo oficial de suporte"
}'
Altera a imagem do grupo especificado. A imagem pode ser enviada como URL ou como
string base64.
Requisitos da imagem:
● Formato: JPEG
● Resolução máxima: 640x640 pixels
● Imagens maiores ou diferente de JPEG não são aceitas pelo WhatsApp
Para remover a imagem atual, envie "remove" ou "delete" no campo image.
Request
Body
groupjidstringrequired
JID do grupo
Example: "120363308883996631@g.us"
imagestringrequired
URL da imagem, string base64 ou "remove"/"delete" para remover. A imagem deve estar em
formato JPEG e ter resolução máxima de 640x640.
curl --request POST \
--url https://free.uazapi.com/group/updateImage \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"groupjid": "120363308883996631@g.us",
"image": "string"
}'
Define se apenas administradores podem editar as informações do grupo. Quando
bloqueado (locked=true), apenas administradores podem alterar nome, descrição, imagem e
outras configurações do grupo. Quando desbloqueado (locked=false), qualquer participante
pode editar as informações.
Importante:
● Requer que o usuário seja administrador do grupo
● Afeta edições de nome, descrição, imagem e outras informações do grupo
● Não controla permissões de adição de membros
Request
Body
groupjidstringrequired
Identificador único do grupo (JID)
Example: "120363308883996631@g.us"
lockedbooleanrequired
Define permissões de edição:
● true = apenas admins podem editar infos do grupo
● false = qualquer participante pode editar infos do grupo
Example: true
curl --request POST \
--url https://free.uazapi.com/group/updateLocked \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"groupjid": "120363308883996631@g.us",
"locked": true
}'
Altera o nome de um grupo do WhatsApp. Apenas administradores do grupo podem realizar
esta operação. O nome do grupo deve seguir as diretrizes do WhatsApp e ter entre 1 e 25
caracteres.
Request
Body
groupjidstringrequired
Identificador único do grupo no formato JID
Example: "120363339858396166@g.us"
namestringrequired
Novo nome para o grupo
Example: "Grupo de Suporte"
curl --request POST \
--url https://free.uazapi.com/group/updateName \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"groupjid": "120363339858396166@g.us",
"name": "Grupo de Suporte"
}'
Gerencia participantes do grupo através de diferentes ações:
● Adicionar ou remover participantes
● Promover ou rebaixar administradores
● Aprovar ou rejeitar solicitações pendentes
Requer que o usuário seja administrador do grupo para executar as ações.
Request
Body
groupjidstringrequired
JID (identificador) do grupo
Example: "120363308883996631@g.us"
actionstringrequired
Ação a ser executada:
● add: Adicionar participantes ao grupo
● remove: Remover participantes do grupo
● promote: Promover participantes a administradores
● demote: Remover privilégios de administrador
● approve: Aprovar solicitações pendentes de entrada
● reject: Rejeitar solicitações pendentes de entrada
Valores possíveis: add, remove, promote, demote, approve, reject
Example: "promote"
participantsarrayrequired
Lista de números de telefone ou JIDs dos participantes. Para números de telefone, use
formato internacional sem '+' ou espaços.
Example: ["5521987654321","5511999887766"]
curl --request POST \
--url https://free.uazapi.com/group/updateParticipants \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"groupjid": "120363308883996631@g.us",
"action": "promote",
"participants": [
"5521987654321",
"5511999887766"
]
}'
Cria uma nova comunidade no WhatsApp. Uma comunidade é uma estrutura que permite
agrupar múltiplos grupos relacionados sob uma única administração.
A comunidade criada inicialmente terá apenas o grupo principal (announcements), e grupos
adicionais podem ser vinculados posteriormente usando o endpoint
/community/updategroups.
Observações importantes:
● O número que cria a comunidade torna-se automaticamente o administrador
● A comunidade terá um grupo principal de anúncios criado automaticamente
Request
Body
namestringrequired
Nome da comunidade
Example: "Comunidade do Bairro"
curl --request POST \
--url https://free.uazapi.com/community/create \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"name": "Comunidade do Bairro"
}'
Adiciona ou remove grupos de uma comunidade do WhatsApp. Apenas administradores da
comunidade podem executar estas operações.
Funcionalidades
● Adicionar múltiplos grupos simultaneamente a uma comunidade
● Remover grupos de uma comunidade existente
● Suporta operações em lote
Limitações
● Os grupos devem existir previamente
● A comunidade deve existir e o usuário deve ser administrador
● Grupos já vinculados não podem ser adicionados novamente
● Grupos não vinculados não podem ser removidos
Ações Disponíveis
● add: Adiciona os grupos especificados à comunidade
● remove: Remove os grupos especificados da comunidade
Request
Body
communitystringrequired
JID (identificador único) da comunidade
Example: "120363153742561022@g.us"
actionstringrequired
Tipo de operação a ser realizada:
● add - Adiciona grupos à comunidade
● remove - Remove grupos da comunidade
Valores possíveis: add, remove
groupjidsarrayrequired
Lista de JIDs dos grupos para adicionar ou remover
Example: ["120363324255083289@g.us","120363308883996631@g.us"]
curl --request POST \
--url https://free.uazapi.com/community/editgroups \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"community": "120363153742561022@g.us",
"action": "add",
"groupjids": [
"120363324255083289@g.us",
"120363308883996631@g.us"
]
}'
Gerencia templates de respostas rápidas para agilizar o atendimento. Suporta mensagens
de texto e mídia.
● Para criar: não inclua o campo id
● Para atualizar: inclua o id existente
● Para excluir: defina delete: true e inclua o id
Observação: Templates originados do WhatsApp (onWhatsApp=true) não podem ser
modificados ou excluídos.
Request
Body
idstring
Necessário para atualizações/exclusões, omitir para criação
Example: "rb9da9c03637452"
deleteboolean
Definir como true para excluir o template
shortCutstringrequired
Atalho para acesso rápido ao template
Example: "saudacao1"
typestringrequired
Tipo da mensagem
Valores possíveis: text, audio, myaudio, ptt, document, video, image
textstring
Obrigatório para mensagens do tipo texto
Example: "Olá! Como posso ajudar hoje?"
filestring
URL ou Base64 para tipos de mídia
Example: "https://exemplo.com/arquivo.pdf"
docNamestring
Nome do arquivo opcional para tipo documento
Example: "apresentacao.pdf"
curl --request POST \
--url https://free.uazapi.com/quickreply/edit \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": "rb9da9c03637452",
"delete": false,
"shortCut": "saudacao1",
"type": "text",
"text": "Olá! Como posso ajudar hoje?",
"file": "https://exemplo.com/arquivo.pdf",
"docName": "apresentacao.pdf"
}'
Retorna todas as respostas rápidas cadastradas para a instância autenticada
curl --request GET \
--url https://free.uazapi.com/quickreply/showall \
--header 'Accept: application/json'
Atualiza os campos personalizados (custom fields) de uma instância. Permite configurar até
20 campos personalizados para armazenamento de informações adicionais sobre leads.
Cada campo pode armazenar até 255 caracteres e aceita qualquer tipo de dado.
Campos disponíveis:
● lead_field01 a lead_field20
Exemplo de uso:
1. Armazenar informações adicionais sobre leads
2. Criar campos personalizados para integração com outros sistemas
3. Armazenar tags ou categorias personalizadas
4. Manter histórico de interações com o lead
Exemplo de requisição:
{
"lead_field01": "nome",
"lead_field02": "email",
"lead_field03": "telefone",
"lead_field04": "cidade",
"lead_field05": "estado",
"lead_field06": "idade",
"lead_field07": "interesses",
"lead_field08": "origem",
"lead_field09": "status",
"lead_field10": "valor",
"lead_field11": "observacoes",
"lead_field12": "ultima_interacao",
"lead_field13": "proximo_contato",
"lead_field14": "vendedor",
"lead_field15": "produto_interesse",
"lead_field16": "fonte_captacao",
"lead_field17": "score",
"lead_field18": "tags",
"lead_field19": "historico",
"lead_field20": "custom"
}
Exemplo de resposta:
{
"success": true,
"message": "Custom fields updated successfully",
"instance": {
"id": "r183e2ef9597845",
"name": "minha-instancia",
"fieldsMap": {
"lead_field01": "nome",
"lead_field02": "email",
"lead_field03": "telefone",
"lead_field04": "cidade",
"lead_field05": "estado",
"lead_field06": "idade",
"lead_field07": "interesses",
"lead_field08": "origem",
"lead_field09": "status",
"lead_field10": "valor",
"lead_field11": "observacoes",
"lead_field12": "ultima_interacao",
"lead_field13": "proximo_contato",
"lead_field14": "vendedor",
"lead_field15": "produto_interesse",
"lead_field16": "fonte_captacao",
"lead_field17": "score",
"lead_field18": "tags",
"lead_field19": "historico",
"lead_field20": "custom"
}
}
}
Erros comuns:
● 400: Campos inválidos ou payload mal formatado
● 401: Token inválido ou expirado
● 404: Instância não encontrada
● 500: Erro ao atualizar campos no banco de dados
Restrições:
● Cada campo pode ter no máximo 255 caracteres
● Campos vazios serão mantidos com seus valores atuais
● Apenas os campos enviados serão atualizados
Request
Body
lead_field01string
Campo personalizado 01
lead_field02string
Campo personalizado 02
lead_field03string
Campo personalizado 03
lead_field04string
Campo personalizado 04
lead_field05string
Campo personalizado 05
lead_field06string
Campo personalizado 06
lead_field07string
Campo personalizado 07
lead_field08string
Campo personalizado 08
lead_field09string
Campo personalizado 09
lead_field10string
Campo personalizado 10
lead_field11string
Campo personalizado 11
lead_field12string
Campo personalizado 12
lead_field13string
Campo personalizado 13
lead_field14string
Campo personalizado 14
lead_field15string
Campo personalizado 15
lead_field16string
Campo personalizado 16
lead_field17string
Campo personalizado 17
lead_field18string
Campo personalizado 18
lead_field19string
Campo personalizado 19
lead_field20string
Campo personalizado 20
curl --request POST \
--url https://free.uazapi.com/instance/updateFieldsMap \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"lead_field01": "string",
"lead_field02": "string",
"lead_field03": "string",
"lead_field04": "string",
"lead_field05": "string",
"lead_field06": "string",
"lead_field07": "string",
"lead_field08": "string",
"lead_field09": "string",
"lead_field10": "string",
"lead_field11": "string",
"lead_field12": "string",
"lead_field13": "string",
"lead_field14": "string",
"lead_field15": "string",
"lead_field16": "string",
"lead_field17": "string",
"lead_field18": "string",
"lead_field19": "string",
"lead_field20": "string"
}'
Atualiza as informações de lead associadas a um chat. Permite modificar status do ticket,
atribuição de atendente, posição no kanban, tags e outros campos customizados.
As alterações são refletidas imediatamente no banco de dados e disparam eventos
webhook/SSE para manter a aplicação sincronizada.
Request
Body
idstringrequired
Identificador do chat. Pode ser:
● wa_chatid (ex: "5511999999999@s.whatsapp.net")
● wa_fastid (ex: "5511888888888:5511999999999")
Example: "5511999999999@s.whatsapp.net"
chatbot_disableUntilinteger
Timestamp UTC até quando o chatbot deve ficar desativado para este chat. Use 0 para
reativar imediatamente.
Example: 1735686000
lead_isTicketOpenboolean
Status do ticket associado ao lead.
● true: Ticket está aberto/em atendimento
● false: Ticket está fechado/resolvido
Example: true
lead_assignedAttendant_idstring
ID do atendente atribuído ao lead. Use string vazia ("") para remover a atribuição.
Example: "att_123456"
lead_kanbanOrderinteger
Posição do card no quadro kanban. Valores maiores aparecem primeiro.
Example: 1000
lead_tagsarray
Lista de tags associadas ao lead. Tags inexistentes são criadas automaticamente. Envie
array vazio ([]) para remover todas as tags.
Example: ["vip","suporte","prioridade-alta"]
lead_namestring
Nome principal do lead
Example: "João Silva"
lead_fullNamestring
Nome completo do lead
Example: "João Silva Pereira"
lead_emailstring
Email do lead
Example: "joao@exemplo.com"
lead_personalidstring
Documento de identificação (CPF/CNPJ) Apenas números ou formatado
Example: "123.456.789-00"
lead_statusstring
Status do lead no funil de vendas
Example: "qualificado"
lead_notesstring
Anotações sobre o lead
Example: "Cliente interessado em plano premium"
lead_field01string
Campo personalizado 1
lead_field02string
Campo personalizado 2
lead_field03string
Campo personalizado 3
lead_field04string
Campo personalizado 4
lead_field05string
Campo personalizado 5
lead_field06string
Campo personalizado 6
lead_field07string
Campo personalizado 7
lead_field08string
Campo personalizado 8
lead_field09string
Campo personalizado 9
lead_field10string
Campo personalizado 10
lead_field11string
Campo personalizado 11
lead_field12string
Campo personalizado 12
lead_field13string
Campo personalizado 13
lead_field14string
Campo personalizado 14
lead_field15string
Campo personalizado 15
lead_field16string
Campo personalizado 16
lead_field17string
Campo personalizado 17
lead_field18string
Campo personalizado 18
lead_field19string
Campo personalizado 19
lead_field20string
Campo personalizado 20
curl --request POST \
--url https://free.uazapi.com/chat/editLead \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": "5511999999999@s.whatsapp.net",
"chatbot_disableUntil": 1735686000,
"lead_isTicketOpen": true,
"lead_assignedAttendant_id": "att_123456",
"lead_kanbanOrder": 1000,
"lead_tags": [
"vip",
"suporte",
"prioridade-alta"
],
"lead_name": "João Silva",
"lead_fullName": "João Silva Pereira",
"lead_email": "joao@exemplo.com",
"lead_personalid": "123.456.789-00",
"lead_status": "qualificado",
"lead_notes": "Cliente interessado em plano premium",
"lead_field01": "string",
"lead_field02": "string",
"lead_field03": "string",
"lead_field04": "string",
"lead_field05": "string",
"lead_field06": "string",
"lead_field07": "string",
"lead_field08": "string",
"lead_field09": "string",
"lead_field10": "string",
"lead_field11": "string",
"lead_field12": "string",
"lead_field13": "string",
"lead_field14": "string",
"lead_field15": "string",
"lead_field16": "string",
"lead_field17": "string",
"lead_field18": "string",
"lead_field19": "string",
"lead_field20": "string"
}'
Cria uma nova campanha de envio com configurações básicas
Request
Body
numbersarrayrequired
Lista de números para envio
Example: ["5511999999999@s.whatsapp.net"]
typestringrequired
Tipo da mensagem
Valores possíveis: text, image, video, audio, document, contact, location, list, button, poll,
carousel
folderstring
Nome da campanha de envio
Example: "Campanha Janeiro"
delayMinintegerrequired
Delay mínimo entre mensagens em segundos
Example: 10
delayMaxintegerrequired
Delay máximo entre mensagens em segundos
Example: 30
scheduled_forintegerrequired
Timestamp em milissegundos ou minutos a partir de agora para agendamento
Example: 1706198400000
infostring
Informações adicionais sobre a campanha
delayinteger
Delay fixo entre mensagens (opcional)
mentionsstring
Menções na mensagem em formato JSON
textstring
Texto da mensagem
linkPreviewboolean
Habilitar preview de links em mensagens de texto. O preview será gerado automaticamente
a partir da URL contida no texto.
linkPreviewTitlestring
Título personalizado para o preview do link (opcional)
linkPreviewDescriptionstring
Descrição personalizada para o preview do link (opcional)
linkPreviewImagestring
URL ou dados base64 da imagem para o preview do link (opcional)
linkPreviewLargeboolean
Se deve usar preview grande ou pequeno (opcional, padrão false)
filestring
URL da mídia ou arquivo (quando type é image, video, audio, document, etc.)
docNamestring
Nome do arquivo (quando type é document)
fullNamestring
Nome completo (quando type é contact)
phoneNumberstring
Número do telefone (quando type é contact)
organizationstring
Organização (quando type é contact)
emailstring
Email (quando type é contact)
urlstring
URL (quando type é contact)
latitudenumber
Latitude (quando type é location)
longitudenumber
Longitude (quando type é location)
namestring
Nome do local (quando type é location)
addressstring
Endereço (quando type é location)
footerTextstring
Texto do rodapé (quando type é list, button, poll ou carousel)
buttonTextstring
Texto do botão (quando type é list, button, poll ou carousel)
listButtonstring
Texto do botão da lista (quando type é list)
selectableCountinteger
Quantidade de opções selecionáveis (quando type é poll)
choicesarray
Lista de opções (quando type é list, button, poll ou carousel). Para carousel, use formato
específico com [texto], {imagem} e botões
imageButtonstring
URL da imagem para o botão (quando type é button)
curl --request POST \
--url https://free.uazapi.com/sender/simple \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"numbers": [
"5511999999999@s.whatsapp.net"
],
"type": "text",
"folder": "Campanha Janeiro",
"delayMin": 10,
"delayMax": 30,
"scheduled_for": 1706198400000,
"info": "string",
"delay": 0,
"mentions": "string",
"text": "string",
"linkPreview": false,
"linkPreviewTitle": "string",
"linkPreviewDescription": "string",
"linkPreviewImage": "string",
"linkPreviewLarge": false,
"file": "string",
"docName": "string",
"fullName": "string",
"phoneNumber": "string",
"organization": "string",
"email": "string",
"url": "string",
"latitude": 0,
"longitude": 0,
"name": "string",
"address": "string",
"footerText": "string",
"buttonText": "string",
"listButton": "string",
"selectableCount": 0,
"choices": [
"string"
],
"imageButton": "string"
}'
Cria um novo envio em massa com configurações avançadas, permitindo definir múltiplos
destinatários e mensagens com delays personalizados.
Request
Body
delayMininteger
Delay mínimo entre mensagens (segundos)
Example: 3
delayMaxinteger
Delay máximo entre mensagens (segundos)
Example: 6
infostring
Descrição ou informação sobre o envio em massa
Example: "Campanha de lançamento"
scheduled_forinteger
Timestamp em milissegundos (date unix) ou minutos a partir de agora para agendamento
Example: 1
messagesarrayrequired
Lista de mensagens a serem enviadas
curl --request POST \
--url https://free.uazapi.com/sender/advanced \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"delayMin": 3,
"delayMax": 6,
"info": "teste avançado",
"scheduled_for": 1,
"messages": [
{
"number": "5511999999999",
"type": "text",
"text": "First message"
},
{
"number": "5511999999999",
"type": "button",
"text": "Promoção Especial!\nConfira nossas ofertas incríveis",
"footerText": "Válido até 31/12/2024",
"imageButton": "https://exemplo.com/banner-promocao.jpg",
"choices": [
"Ver Ofertas|https://loja.exemplo.com/ofertas",
"Falar com Vendedor|reply:vendedor",
"Copiar Cupom|copy:PROMO2024"
]
},
{
"number": "5511999999999",
"type": "list",
"text": "Escolha sua categoria preferida:",
"listButton": "Ver Categorias",
"choices": [
"[Eletrônicos]",
"Smartphones|eletronicos_smartphones",
"Notebooks|eletronicos_notebooks",
"[Roupas]",
"Camisetas|roupas_camisetas",
"Sapatos|roupas_sapatos"
]
},
{
"number": "5511999999999",
"type": "document",
"file": "https://example.com/doc.pdf",
"docName": "Documento.pdf"
},
{
"number": "5511999999999",
"type": "carousel",
"text": "Conheça nossos produtos",
"choices": [
"[Smartphone XYZ\nO mais avançado smartphone da linha]",
"{https://exemplo.com/produto1.jpg}",
"Copiar Código|copy:PROD123",
"Ver no Site|https://exemplo.com/xyz",
"[Notebook ABC\nO notebook ideal para profissionais]",
"{https://exemplo.com/produto2.jpg}",
"Copiar Código|copy:NOTE456",
"Comprar Online|https://exemplo.com/abc"
]
}
]
}'
Permite controlar campanhas de envio de mensagens em massa através de diferentes
ações:
Ações Disponíveis:
🛑 stop - Pausar campanha
● Pausa uma campanha ativa ou agendada
● Altera o status para "paused"
● Use quando quiser interromper temporariamente o envio
● Mensagens já enviadas não são afetadas
▶ continue - Continuar campanha
● Retoma uma campanha pausada
● Altera o status para "scheduled"
● Use para continuar o envio após pausar uma campanha
● Não funciona em campanhas já concluídas ("done")
🗑 delete - Deletar campanha
● Remove completamente a campanha
● Deleta apenas mensagens NÃO ENVIADAS (status "scheduled")
● Mensagens já enviadas são preservadas no histórico
● Operação é executada de forma assíncrona
Status de Campanhas:
● scheduled: Agendada para envio
● sending: Enviando mensagens
● paused: Pausada pelo usuário
● done: Concluída (não pode ser alterada)
● deleting: Sendo deletada (operação em andamento)
Request
Body
folder_idstringrequired
Identificador único da campanha de envio
Example: "folder_123"
actionstringrequired
Ação a ser executada na campanha:
● stop: Pausa a campanha (muda para status "paused")
● continue: Retoma campanha pausada (muda para status "scheduled")
● delete: Remove campanha e mensagens não enviadas (assíncrono)
Valores possíveis: stop, continue, delete
Example: "stop"
curl --request POST \
--url https://free.uazapi.com/sender/edit \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"folder_id": "folder_123",
"action": "stop"
}'
Inicia processo de limpeza de mensagens antigas em lote que já foram enviadas com
sucesso. Por padrão, remove mensagens mais antigas que 7 dias.
Request
Body
hoursinteger
Quantidade de horas para manter mensagens. Mensagens mais antigas que esse valor
serão removidas.
Example: 168
curl --request POST \
--url https://free.uazapi.com/sender/cleardone \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"hours": 168
}'
Remove todas as mensagens da fila de envio em massa, incluindo mensagens pendentes e
já enviadas. Esta é uma operação irreversível.
curl --request DELETE \
--url https://free.uazapi.com/sender/clearall \
--header 'Accept: application/json'
Retorna todas as campanhas de mensagens em massa com possibilidade de filtro por
status
Parameters
Query Parameters
status
string
Filtrar campanhas por status
curl --request GET \
--url https://free.uazapi.com/sender/listfolders \
--header 'Accept: application/json'
Retorna a lista de mensagens de uma campanha específica, com opções de filtro por status
e paginação
Request
Body
folder_idstringrequired
ID da campanha a ser consultada
messageStatusstring
Status das mensagens para filtrar
Valores possíveis: Scheduled, Sent, Failed
pageinteger
Número da página para paginação
pageSizeinteger
Quantidade de itens por página
curl --request POST \
--url https://free.uazapi.com/sender/listmessages \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"folder_id": "string",
"messageStatus": "Scheduled",
"page": 1,
"pageSize": 1
}'
Retorna a configuração atual da integração com Chatwoot para a instância.
Funcionalidades:
● Retorna todas as configurações do Chatwoot incluindo credenciais
● Mostra status de habilitação da integração
● Útil para verificar configurações atuais antes de fazer alterações
curl --request GET \
--url https://free.uazapi.com/chatwoot/config \
--header 'Accept: application/json'
Atualiza a configuração da integração com Chatwoot para a instância.
Funcionalidades:
● Configura todos os parâmetros da integração Chatwoot
● Reinicializa automaticamente o cliente Chatwoot quando habilitado
● Retorna URL do webhook para configurar no Chatwoot
● Sincronização bidirecional de mensagens novas entre WhatsApp e Chatwoot
● Sincronização automática de contatos (nome e telefone)
● Atualização automática LID → PN (Local ID para Phone Number)
● Sistema de nomes inteligentes com til (~)
Configuração no Chatwoot:
1. Após configurar via API, use a URL retornada no webhook settings da inbox no
Chatwoot
2. Configure como webhook URL na sua inbox do Chatwoot
3. A integração ficará ativa e sincronizará mensagens e contatos automaticamente
🏷 Sistema de Nomes Inteligentes:
● Nomes com til (~): São atualizados automaticamente quando o contato modifica
seu nome no WhatsApp
● Nomes específicos: Para definir um nome fixo, remova o til (~) do nome no
Chatwoot
● Exemplo: "~João Silva" será atualizado automaticamente, "João Silva" (sem til)
permanecerá fixo
● Atualização LID→PN: Contatos migram automaticamente de Local ID para Phone
Number quando disponível
● Sem duplicação: Durante a migração LID→PN, não haverá duplicação de
conversas
● Respostas nativas: Todas as respostas dos agentes aparecem nativamente no
Chatwoot
🚧 AVISO IMPORTANTE - INTEGRAÇÃO BETA:
● Fase Beta: Esta integração está em fase de desenvolvimento e testes
● Uso por conta e risco: O usuário assume total responsabilidade pelo uso
● Recomendação: Teste em ambiente não-produtivo antes de usar em produção
● Suporte limitado: Funcionalidades podem mudar sem aviso prévio
⚠ Limitações Conhecidas:
● Sincronização de histórico: Não implementada - apenas mensagens novas são
sincronizadas
Request
Body
enabledbooleanrequired
Habilitar/desabilitar integração com Chatwoot
Example: true
urlstringrequired
URL base da instância Chatwoot (sem barra final)
Example: "https://app.chatwoot.com"
access_tokenstringrequired
Token de acesso da API Chatwoot (obtido em Profile Settings > Access Token)
Example: "pXXGHHHyJPYHYgWHJHYHgJjj"
account_idintegerrequired
ID da conta no Chatwoot (visível na URL da conta)
Example: 1
inbox_idintegerrequired
ID da inbox no Chatwoot (obtido nas configurações da inbox)
Example: 5
ignore_groupsboolean
Ignorar mensagens de grupos do WhatsApp na sincronização
sign_messagesboolean
Assinar mensagens enviadas para WhatsApp com identificação do agente
Example: true
create_new_conversationboolean
Sempre criar nova conversa ao invés de reutilizar conversas existentes
curl --request PUT \
--url https://free.uazapi.com/chatwoot/config \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"enabled": true,
"url": "https://app.chatwoot.com",
"access_token": "pXXGHHHyJPYHYgWHJHYHgJjj",
"account_id": 1,
"inbox_id": 5,
"ignore_groups": false,
"sign_messages": true,
"create_new_conversation": false
}'
Chatbot Configurações
Explicação dos campos:
● openai_apikey: Chave da API OpenAI (começa com "sk-")
● chatbot_enabled: Habilita/desabilita o chatbot
● chatbot_ignoreGroups: Define se o chatbot deve ignorar mensagens de grupos
● chatbot_stopConversation: Palavra-chave que os usuários podem usar para
parar o chatbot
● chatbot_stopMinutes: Por quantos minutos o chatbot deve ficar desativado após
receber o comando de parada
● chatbot_stopWhenYouSendMsg: Por quantos minutos o chatbot deve ficar
desativado após você enviar uma mensagem fora da API, 0 desliga.
Request
Body
No request body schema defined
curl --request POST \
--url https://free.uazapi.com/instance/updatechatbotsettings \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"openai_apikey": "sk-1234567890abcdefghijklmnopqrstuvwxyz",
"chatbot_enabled": true,
"chatbot_ignoreGroups": true,
"chatbot_stopConversation": "stop",
"chatbot_stopMinutes": 30,
"chatbot_stopWhenYouSendMsg": 5
}'
Criar, atualizar ou excluir um trigger do
chatbot
Endpoint para gerenciar triggers do chatbot. Suporta:
● Criação de novos triggers
● Atualização de triggers existentes
● Exclusão de triggers por ID
Request
Body
idstring
ID do trigger. Vazio para criação, obrigatório para atualização/exclusão
deleteboolean
Quando verdadeiro, exclui o trigger especificado pelo id
triggerstringrequired
curl --request POST \
--url https://free.uazapi.com/trigger/edit \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": "",
"delete": false,
"trigger": {
"active": true,
"type": "agent",
"agent_id": "ref2ed7ab21d4ea",
"ignoreGroups": true,
"lead_field": "lead_status",
"lead_operator": "equals",
"lead_value": "novo",
"priority": 1,
"wordsToStart": "ola|oi|iniciar",
"responseDelay_seconds": 6
}
}'
Listar todos os triggers do chatbot
Retorna a lista completa de triggers configurados para a instância atual
curl --request GET \
--url https://free.uazapi.com/trigger/list \
--header 'Accept: application/json'
Documentação dos Campos de
Configuração
Campos Básicos
Nome e Identificação
O agente precisa ser configurado com informações básicas que determinam sua identidade
e funcionamento.
Nome do Agente
name: Define como o agente será identificado nas conversas.
Exemplos válidos:
● "Assistente de Vendas"
● "Suporte Técnico"
● "João"
● "Maria"
Provedor do Serviço
provider: Especifica qual serviço de IA será utilizado.
Provedores disponíveis:
● "openai" (ChatGPT)
● "anthropic" (Claude)
● "gemini" (Google)
● "deepseek" (DeepSeek)
Chave de API
apikey: Credencial necessária para autenticação com o provedor escolhido.
● Deve ser obtida através do site oficial do provedor selecionado
● Mantenha esta chave em segurança e nunca a compartilhe
Configuração do Modelo
Seleção do Modelo
model: Especifica qual modelo de IA será utilizado. A disponibilidade depende do provedor
selecionado.
OpenAI
Documentação: https://platform.openai.com/docs/models
● gpt-4o
● gpt-4o-mini
● gpt-3.5-turbo
Claude
Documentação: https://docs.anthropic.com/en/docs/about-claude/models
● claude-3-5-sonnet-latest
● claude-3-5-haiku-latest
● claude-3-opus-latest
Gemini
Documentação: https://ai.google.dev/models/gemini
● gemini-2.0-flash-exp
● gemini-1.5-pro
● gemini-1.5-flash
DeepSeek
Documentação: https://api-docs.deepseek.com/quick_start/pricing
● deepseek-chat
● deepseek-reasoner
Configurações de Comportamento
Prompt Base (basePrompt)
Instruções iniciais para definir o comportamento do agente
Exemplo para assistente de vendas:
"Você é um assistente especializado em vendas, focado em ajudar clientes a encontrar os
produtos ideais. Mantenha um tom profissional e amigável."
Exemplo para suporte:
"Você é um agente de suporte técnico especializado em nossos produtos. Forneça
respostas claras e objetivas para ajudar os clientes a resolverem seus problemas."
Parâmetros de Geração
● temperature: Controla a criatividade das respostas (0-100)
○ 0-30: Respostas mais conservadoras e precisas
○ 30-70: Equilíbrio entre criatividade e precisão
○ 70-100: Respostas mais criativas e variadas
● maxTokens: Limite máximo de tokens por resposta
○ Recomendado: 1000-4000 para respostas detalhadas
○ Para respostas curtas: 500-1000
○ Limite máximo varia por modelo
● diversityLevel: Controla a diversidade das respostas (0-100)
○ Valores mais altos geram respostas mais variadas
○ Recomendado: 30-70 para uso geral
● frequencyPenalty: Penalidade para repetição de palavras (0-100)
○ Valores mais altos reduzem repetições
○ Recomendado: 20-50 para comunicação natural
● presencePenalty: Penalidade para manter foco no tópico (0-100)
○ Valores mais altos incentivam mudanças de tópico
○ Recomendado: 10-30 para manter coerência
Configurações de Interação
Mensagens
● signMessages: Se verdadeiro, adiciona a assinatura do agente nas mensagens
○ Útil para identificar quem está enviando a mensagem
● readMessages: Se verdadeiro, marca as mensagens como lidas ao responder
○ Recomendado para simular comportamento humano
Exemplos de Configuração
Assistente de Vendas
{
"name": "Assistente de Vendas",
"provider": "openai",
"model": "gpt-4",
"basePrompt": "Você é um assistente de vendas especializado...",
"temperature": 70,
"maxTokens": 2000,
"diversityLevel": 50,
"frequencyPenalty": 30,
"presencePenalty": 20,
"signMessages": true,
"readMessages": true
}
Suporte Técnico
{
"name": "Suporte Técnico",
"provider": "anthropic",
"model": "claude-3-sonnet-20240229",
"basePrompt": "Você é um agente de suporte técnico...",
"temperature": 30,
"maxTokens": 3000,
"diversityLevel": 40,
"frequencyPenalty": 40,
"presencePenalty": 15,
"signMessages": true,
"readMessages": true
}
Dicas de Otimização
1. Ajuste Gradual: Comece com valores moderados e ajuste conforme necessário
2. Teste o Base Prompt: Verifique se as instruções estão claras e completas
3. Monitore o Desempenho: Observe as respostas e ajuste os parâmetros para
melhor adequação
4. Backup: Mantenha um backup das configurações que funcionaram bem
5. Documentação: Registre as alterações e seus impactos para referência futura
Request
Body
No request body schema defined
curl --request POST \
--url https://free.uazapi.com/agent/edit \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": "",
"delete": false,
"agent": {
"name": "uazabot",
"provider": "openai",
"apikey": "sk-proj-HfXFgA",
"basePrompt": "Seu nome é Sara e você faz parte do time de suporte ao cliente da
TechShop...",
"model": "gpt-4o-mini",
"maxTokens": 2000,
"temperature": 70,
"diversityLevel": 50,
"frequencyPenalty": 30,
"presencePenalty": 30,
"signMessages": true,
"readMessages": true,
"maxMessageLength": 500,
"typingDelay_seconds": 3,
"contextTimeWindow_hours": 24,
"contextMaxMessages": 50,
"contextMinMessages": 3
}
}'
Todos os agentes
curl --request GET \
--url https://free.uazapi.com/agent/list \
--header 'Accept: application/json'
Gerencia o conhecimento base usado pelos agentes de IA para responder consultas. O
conhecimento pode ser fornecido como texto direto ou através de arquivos PDF/CSV.
Características principais:
● Suporta criação, edição e exclusão de conhecimento
● Aceita conteúdo em:
○ Texto puro
○ URLs públicas
○ Base64 encoded de arquivos
○ Upload direto de arquivos
● Formatos suportados: PDF, CSV, TXT, HTML
● Processa automaticamente qualquer formato de entrada
● Vetoriza automaticamente o conteúdo para busca semântica
Nota sobre URLs e Base64:
● URLs devem ser públicas e acessíveis
● Para PDFs/CSVs, especifique fileType se não for detectável da extensão
● Base64 deve incluir o encoding completo do arquivo
● O servidor detecta e processa automaticamente conteúdo Base64
Request
Body
idstring
ID do conhecimento (vazio para criar novo)
deleteboolean
Define se é uma operação de exclusão
knowledgeobject
fileTypestring
Tipo do arquivo quando não detectado automaticamente
Valores possíveis: pdf, txt, html, csv
curl --request POST \
--url https://free.uazapi.com/knowledge/edit \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": "",
"delete": false,
"knowledge": {
"active": true,
"tittle": "Informações sobre a uazapi",
"content": "A uazapi foi originalmente desenvolvida..."
}
}'
Listar Base de Conhecimento
Retorna todos os conhecimentos cadastrados para o agente de IA da instância. Estes
conhecimentos são utilizados pelo chatbot para responder perguntas e interagir com os
usuários de forma contextualizada.
curl --request GET \
--url https://free.uazapi.com/knowledge/list \
--header 'Accept: application/json'
Configuração de Funções de API para
Agentes IA
Documentação para criar/editar funções utilizadas pelos agentes de IA para integração com
APIs externas. Inclui validação automática e controle de ativação.
1. Estrutura Base da Função
Campos Principais
{
"name": "nomeDaFuncao",
"description": "Descrição detalhada",
"active": true,
"method": "POST",
"endpoint": "https://api.exemplo.com/recurso",
"headers": {},
"body": {},
"parameters": []
}
Detalhamento dos Campos
name
● Identificador único e descritivo
● Sem espaços ou caracteres especiais
● Ex: "createProduct", "updateUserStatus"
description
● Propósito e funcionamento da função
● Inclua casos de uso e resultados esperados
● Ex: "Cria produto no catálogo com nome, preço e categoria"
active
● Controla disponibilidade da função
● Desativa automaticamente se houver erros
● Default: false
method
● GET: buscar dados
● POST: criar recurso
● PUT: atualizar completo
● PATCH: atualização parcial
● DELETE: remover recurso
endpoint
● URL completa da API
● Aceita placeholders: {{variavel}}
Exemplos:
https://api.exemplo.com/produtos
https://api.exemplo.com/usuarios/{{userId}}
https://api.exemplo.com/busca?q={{query}}&limit={{limit}}
●
headers
{
"Authorization": "Bearer {{apiKey}}",
"Content-Type": "application/json",
"Accept": "application/json"
}
body (POST/PUT/PATCH)
{
"name": "{{productName}}",
"price": "{{price}}",
"metadata": {
"tags": "{{tags}}"
}
}
2. Configuração de Parâmetros
Estrutura do Parâmetro
{
"name": "nomeParametro",
"type": "string",
"description": "Descrição do uso",
"required": true,
"enum": "valor1,valor2,valor3",
"minimum": 0,
"maximum": 100
}
Tipos de Parâmetros
String
{
"name": "status",
"type": "string",
"description": "Status do pedido",
"required": true,
"enum": "pending,processing,completed"
}
Número
{
"name": "price",
"type": "number",
"description": "Preço em reais",
"required": true,
"minimum": 0.01,
"maximum": 99999.99
}
Inteiro
{
"name": "quantity",
"type": "integer",
"description": "Quantidade",
"minimum": 0,
"maximum": 1000
}
Boolean
{
"name": "active",
"type": "boolean",
"description": "Status de ativação"
}
3. Sistema de Validação
Validações Automáticas
1. JSON
● Headers e body devem ser válidos
● Erros desativam a função
1. Placeholders ({{variavel}})
● Case-sensitive
● Devem ter parâmetro correspondente
1. Parâmetros
● Nomes únicos
● Tipos corretos
● Limites numéricos válidos
● Enums sem valores vazios
Erros e Avisos
● Função desativa se houver:
○ JSON inválido
○ Parâmetros não documentados
○ Violações de tipo
● Erros aparecem em undocumentedParameters
4. Exemplo Completo
{
"name": "createProduct",
"description": "Criar novo produto no catálogo",
"active": true,
"method": "POST",
"endpoint": "https://api.store.com/v1/products",
"headers": {
"Authorization": "Bearer {{apiKey}}",
"Content-Type": "application/json"
},
"body": {
"name": "{{productName}}",
"price": "{{price}}",
"category": "{{category}}"
},
"parameters": [
{
"name": "apiKey",
"type": "string",
"description": "Chave de API",
"required": true
},
{
"name": "productName",
"type": "string",
"description": "Nome do produto",
"required": true
},
{
"name": "price",
"type": "number",
"description": "Preço em reais",
"required": true,
"minimum": 0.01
},
{
"name": "category",
"type": "string",
"description": "Categoria do produto",
"required": true,
"enum": "electronics,clothing,books"
}
]
}
Request
Body
idstringrequired
ID da função. Vazio para criar nova, preenchido para editar existente.
deletebooleanrequired
Se true, deleta a função especificada pelo ID.
functionobjectrequired
curl --request POST \
--url https://free.uazapi.com/function/edit \
--header 'Accept: application/json' \
--header 'Content-Type: application/json' \
--data '{
"id": "string",
"delete": false,
"function": {
"name": "createProduct",
"active": false,
"description": "Cria um novo produto no catálogo",
"method": "POST",
"endpoint": "https://api.example.com/products",
"headers": {
"Authorization": "Bearer {{apiKey}}",
"Content-Type": "application/json"
},
"body": {
"name": "{{productName}}",
"price": "{{price}}",
"category": "{{category}}"
},
"parameters": [
{
"name": "apiKey",
"type": "string",
"description": "Chave de API para autenticação",
"required": true
},
{
"name": "price",
"type": "number",
"description": "Preço do produto",
"minimum": 0.01,
"maximum": 999999.99,
"required": true
}
]
}
}'
Lista todas as funções de API
Retorna todas as funções de API configuradas para a instância atual
curl --request GET \
--url https://free.uazapi.com/function/list \
--header 'Accept: application/json'
SCHEMAS:
Instance
Representa uma instância do WhatsApp
Properties
idstring
ID único gerado automaticamente
tokenstring
Token de autenticação da instância
statusstring
Status atual da conexão
paircodestring
Código de pareamento
qrcodestring
QR Code em base64 para autenticação
namestring
Nome da instância
profileNamestring
Nome do perfil WhatsApp
profilePicUrlstring
URL da foto do perfil
isBusinessboolean
Indica se é uma conta business
plataformstring
Plataforma de origem (iOS/Android/Web)
systemNamestring
Nome do sistema operacional
ownerstring
Proprietário da instância
current_presencestring
Status atual de presença da instância (campo não persistido)
"available"
lastDisconnectstring
Data/hora da última desconexão
lastDisconnectReasonstring
Motivo da última desconexão
adminField01string
Campo administrativo 01
adminField02string
Campo administrativo 02
openai_apikeystring
Chave da API OpenAI
chatbot_enabledboolean
Habilitar chatbot automático
chatbot_ignoreGroupsboolean
Ignorar mensagens de grupos
chatbot_stopConversationstring
Palavra-chave para parar conversa
chatbot_stopMinutesinteger
Por quanto tempo ficará pausado o chatbot ao usar stop conversation
chatbot_stopWhenYouSendMsginteger
Por quanto tempo ficará pausada a conversa quando você enviar mensagem manualmente
fieldsMapobject
Mapa de campos customizados da instância (quando presente)
currentTimestring
Horário atual retornado pelo backend
createdstring
Data de criação da instância
updatedstring
Data da última atualização
Example
{
"id": "i91011ijkl",
"token": "abc123xyz",
"status": "connected",
"paircode": "1234-5678",
"qrcode": "data:image/png;base64,iVBORw0KGg...",
"name": "Instância Principal",
"profileName": "Loja ABC",
"profilePicUrl": "https://example.com/profile.jpg",
"isBusiness": true,
"plataform": "Android",
"systemName": "uazapi",
"owner": "user@example.com",
"lastDisconnect": "2025-01-24T14:00:00Z",
"lastDisconnectReason": "Network error",
"adminField01": "custom_data",
"openai_apikey": "sk-...xyz",
"chatbot_enabled": true,
"chatbot_ignoreGroups": true,
"chatbot_stopConversation": "parar",
"chatbot_stopMinutes": 60,
"created": "2025-01-24T14:00:00Z",
"updated": "2025-01-24T14:30:00Z",
"currentPresence": "available"
}
Webhook
Configuração completa de webhook com filtros e opções avançadas
Properties
idstring
ID único gerado automaticamente
enabledboolean
Webhook ativo/inativo
urlstringrequired
URL de destino dos eventos
eventsarrayrequired
Tipos de eventos monitorados
addUrlTypesMessagesboolean
Incluir na URLs o tipo de mensagem
addUrlEventsboolean
Incluir na URL o nome do evento
excludeMessagesarray
Filtros para excluir tipos de mensagens
Example
{
"id": "wh_9a8b7c6d5e",
"enabled": true,
"url": "https://webhook.cool/example",
"events": [
"messages",
"connection"
],
"addUrlTypesMessages": false,
"addUrlEvents": false,
"excludeMessages": []
}
Chat
Representa uma conversa/chamado no sistema
Properties
idstring
ID único da conversa (r + 7 bytes aleatórios em hex)
wa_fastidstring
Identificador rápido do WhatsApp
wa_chatidstring
ID completo do chat no WhatsApp
wa_chatlidstring
LID do chat no WhatsApp (quando disponível)
wa_archivedboolean
Indica se o chat está arquivado
wa_contactNamestring
Nome do contato no WhatsApp
wa_namestring
Nome do WhatsApp
namestring
Nome exibido do chat
imagestring
URL da imagem do chat
imagePreviewstring
URL da miniatura da imagem
wa_ephemeralExpirationinteger
Tempo de expiração de mensagens efêmeras
wa_isBlockedboolean
Indica se o contato está bloqueado
wa_isGroupboolean
Indica se é um grupo
wa_isGroup_adminboolean
Indica se o usuário é admin do grupo
wa_isGroup_announceboolean
Indica se é um grupo somente anúncios
wa_isGroup_communityboolean
Indica se é uma comunidade
wa_isGroup_memberboolean
Indica se é membro do grupo
wa_isPinnedboolean
Indica se o chat está fixado
wa_labelarray
Labels do chat
wa_lastMessageTextVotestring
Texto/voto da última mensagem
wa_lastMessageTypestring
Tipo da última mensagem
wa_lastMsgTimestampinteger
Timestamp da última mensagem
wa_lastMessageSenderstring
Remetente da última mensagem
wa_muteEndTimeinteger
Timestamp do fim do silenciamento
ownerstring
Dono da instância
wa_unreadCountinteger
Contador de mensagens não lidas
phonestring
Número de telefone
common_groupsstring
Grupos em comum separados por vírgula, formato: (nome_grupo)id_grupo
"Grupo
Família(120363123456789012@g.us),Trabalho(987654321098765432@g.us)"
lead_namestring
Nome do lead
lead_fullNamestring
Nome completo do lead
lead_emailstring
Email do lead
lead_personalidstring
Documento de identificação
lead_statusstring
Status do lead
lead_tagsarray
Tags do lead
lead_notesstring
Anotações sobre o lead
lead_isTicketOpenboolean
Indica se tem ticket aberto
lead_assignedAttendant_idstring
ID do atendente responsável
lead_kanbanOrderinteger
Ordem no kanban
lead_field01string
lead_field02string
lead_field03string
lead_field04string
lead_field05string
lead_field06string
lead_field07string
lead_field08string
lead_field09string
lead_field10string
lead_field11string
lead_field12string
lead_field13string
lead_field14string
lead_field15string
lead_field16string
lead_field17string
lead_field18string
lead_field19string
lead_field20string
chatbot_agentResetMemoryAtinteger
Timestamp do último reset de memória
chatbot_lastTrigger_idstring
ID do último gatilho executado
chatbot_lastTriggerAtinteger
Timestamp do último gatilho
chatbot_disableUntilinteger
Timestamp até quando chatbot está desativado
Message
Representa uma mensagem trocada no sistema
Properties
idstring
ID único interno da mensagem (formato r + 7 caracteres hex aleatórios)
messageidstring
ID original da mensagem no provedor
chatidstring
ID da conversa relacionada
senderstring
ID do remetente da mensagem
senderNamestring
Nome exibido do remetente
isGroupboolean
Indica se é uma mensagem de grupo
fromMeboolean
Indica se a mensagem foi enviada pelo usuário
messageTypestring
Tipo de conteúdo da mensagem
sourcestring
Plataforma de origem da mensagem
messageTimestampinteger
Timestamp original da mensagem em milissegundos
statusstring
Status do ciclo de vida da mensagem
textstring
Texto original da mensagem
quotedstring
ID da mensagem citada/respondida
editedstring
Histórico de edições da mensagem
reactionstring
ID da mensagem reagida
votestring
Dados de votação de enquete e listas
convertOptionsstring
Conversão de opções da mensagem, lista, enquete e botões
buttonOrListidstring
ID do botão ou item de lista selecionado
ownerstring
Dono da mensagem
errorstring
Mensagem de erro caso o envio tenha falhado
contentobject
Conteúdo bruto da mensagem (JSON serializado ou texto)
wasSentByApiboolean
Indica se a mensagem foi enviada via API
sendFunctionstring
Função usada para enviar a mensagem (quando enviada via API)
sendPayloadobject
Payload enviado (texto/JSON serializado)
fileURLstring
URL ou referência de arquivo da mensagem
send_folder_idstring
Pasta associada ao envio (quando aplicável)
track_sourcestring
Origem de rastreamento
track_idstring
ID de rastreamento (pode repetir)
ai_metadataobject
Metadados do processamento por IA
sender_pnstring
JID PN resolvido do remetente (quando disponível)
sender_lidstring
LID original do remetente (quando disponível)
Label
Representa uma etiqueta/categoria no sistema
Properties
idstring
ID único da etiqueta
namestring
Nome da etiqueta
colorinteger
Índice numérico da cor (0-19)
2
colorHexstring
Cor hexadecimal correspondente ao índice
"#fed428"
labelidstring
ID da label no WhatsApp (quando sincronizada)
ownerstring
Dono da etiqueta
createdstring
Data de criação
updatedstring
Data da última atualização
Example
{
"id": "l121314mnop",
"name": "Cliente VIP",
"color": 2,
"colorHex": "#fed428",
"created": "2025-01-24T14:35:00.000Z",
"updated": "2025-01-24T15:00:00.000Z"
}
Attendant
Modelo de atendente do sistema
Properties
idstring
ID único gerado automaticamente
namestring
Nome do atendente
phonestring
Número de telefone
emailstring
Endereço de e-mail
departmentstring
Departamento de atuação
customField01string
Campo personalizável 01
customField02string
Campo personalizável 02
ownerstring
Responsável pelo cadastro
createdstring
Data de criação automática
updatedstring
Data de atualização automática
Example
{
"id": "r1234abcd",
"name": "João da Silva",
"phone": "+5511999999999",
"email": "joao@empresa.com",
"department": "Suporte Técnico",
"customField01": "Turno: Manhã",
"customField02": "Nível: 2",
"owner": "admin",
"created": "2025-01-24T13:52:19.000Z",
"updated": "2025-01-24T13:52:19.000Z"
}
ChatbotTrigger
Properties
idstring
Identificador único do trigger. Se definido, você irá editar ou deletar o trigger. Se vazio, um
novo trigger será criado.
activeboolean
Define se o trigger está ativo e disponível para uso. Triggers inativos não serão executados
pelo sistema.
typestringrequired
Tipo do trigger:
● agent - aciona um agente de IA
● quickreply - aciona respostas rápidas predefinidas
● flow - dispara um fluxo salvo
agent_idstringrequired
ID do agente de IA. Obrigatório quando type='agent'
flow_idstring
ID do fluxo. Obrigatório quando type='flow'
quickReply_idstring
ID da resposta rápida. Obrigatório quando type='quickreply'
ignoreGroupsboolean
Define se o trigger deve ignorar mensagens de grupos
lead_fieldstring
Campo do lead usado para condição do trigger
lead_operatorstring
Operador de comparação para condição do lead:
● equals - igual a
● not_equals - diferente de
● contains - contém
● not_contains - não contém
● greater - maior que
● less - menor que
● empty - vazio
● not_empty - não vazio
lead_valuestring
Valor para comparação com o campo do lead. Usado em conjunto com lead_field e
lead_operator
priorityinteger
Prioridade do trigger. Quando existem múltiplos triggers que poderiam ser acionados,
APENAS o trigger com maior prioridade será executado. Se houver múltiplos triggers com a
mesma prioridade mais alta, um será escolhido aleatoriamente.
wordsToStartstring
Palavras-chave ou frases que ativam o trigger. Múltiplas entradas separadas por pipe (|).
Exemplo: olá|bom dia|qual seu nome
responseDelay_secondsinteger
Tempo de espera em segundos antes de executar o trigger
ownerstring
Identificador do proprietário do trigger
createdstring
Data e hora de criação
updatedstring
Data e hora da última atualização
ChatbotAIAgent
Configuração de um agente de IA para atendimento de conversas
Properties
idstring
ID único gerado pelo sistema
namestringrequired
Nome de exibição do agente
providerstringrequired
Provedor do serviço de IA
modelstringrequired
Nome do modelo LLM a ser utilizado
apikeystringrequired
Chave de API para autenticação no provedor
basePromptstring
Prompt base para orientar o comportamento do agente
maxTokensinteger
Número máximo de tokens por resposta
temperatureinteger
Controle de criatividade (0-100)
diversityLevelinteger
Nível de diversificação das respostas
frequencyPenaltyinteger
Penalidade para repetição de frases
presencePenaltyinteger
Penalidade para manter foco no tópico
signMessagesboolean
Adiciona identificação do agente nas mensagens
readMessagesboolean
Marca mensagens como lidas automaticamente
maxMessageLengthinteger
Tamanho máximo permitido para mensagens (caracteres)
typingDelay_secondsinteger
Atraso simulado de digitação em segundos
contextTimeWindow_hoursinteger
Janela temporal para contexto da conversa
contextMaxMessagesinteger
Número máximo de mensagens no contexto
contextMinMessagesinteger
Número mínimo de mensagens para iniciar contexto
ownerstring
Responsável/Proprietário do agente
createdstring
Data de criação do registro
updatedstring
Data da última atualização
ChatbotAIFunction
Properties
idstring
ID único da função gerado automaticamente
namestringrequired
Nome da função
descriptionstringrequired
Descrição da função
activeboolean
Indica se a função está ativa
methodstringrequired
Método HTTP da requisição
endpointstringrequired
Endpoint da API
headersstringnull
Cabeçalhos da requisição
bodystringnull
Corpo da requisição
parametersstringnull
Parâmetros da função
undocumentedParametersstring
Parâmetros não documentados
header_errorboolean
Indica erro de formatação nos cabeçalhos
body_errorboolean
Indica erro de formatação no corpo
ownerstring
Proprietário da função
createdstring
Data de criação
updatedstring
Data de atualização
ChatbotAIKnowledge
Properties
idstringrequired
ID único gerado automaticamente
"r1a2b3c4"
activebooleanrequired
Indica se o conhecimento está ativo
tittlestringrequired
Título do conhecimento
contentstringrequired
Conteúdo textual do conhecimento
vectorStatusstring
Status da vetorização no sistema
isVectorizedboolean
Indica se o conteúdo foi vetorizado
lastVectorizedAtinteger
Timestamp da última vetorização
ownerstring
Proprietário do conhecimento
priorityinteger
Prioridade de uso do conhecimento
createdstring
Data de criação
updatedstring
Data de atualização
MessageQueueFolder
Pasta para organização de campanhas de mensagens em massa
Properties
idstring
Identificador único
infostring
Informações adicionais sobre a pasta
statusstring
Status atual da pasta
"ativo"
scheduled_forinteger
Timestamp Unix para execução agendada
delayMaxinteger
Atraso máximo entre mensagens em milissegundos
delayMininteger
Atraso mínimo entre mensagens em milissegundos
log_deliveredinteger
Contagem de mensagens entregues
log_failedinteger
Contagem de mensagens com falha
log_playedinteger
Contagem de mensagens reproduzidas (para áudio/vídeo)
log_readinteger
Contagem de mensagens lidas
log_sucessinteger
Contagem de mensagens enviadas com sucesso
log_totalinteger
Contagem total de mensagens
ownerstring
Identificador do proprietário da instância
createdstring
Data e hora de criação
updatedstring
Data e hora da última atualização
QuickReply
Properties
idstring
ID único da resposta rápida
onWhatsAppboolean
Indica se a resposta veio do WhatsApp (não pode ser editada/excluída)
docNamestring
Nome de documento associado (quando aplicável)
filestring
Caminho ou conteúdo do arquivo associado
shortCutstringrequired
Atalho para acionar a resposta
textstringrequired
Conteúdo da mensagem pré-definida
typestring
Tipo da resposta rápida (texto/documento/outros)
ownerstring
Dono da resposta rápida
createdstring
Data de criação
updatedstring
Data da última atualização
Group
Representa um grupo/conversa coletiva
Properties
JIDstring
Identificador único do grupo
"jid8@g.us"
OwnerJIDstring
JID do proprietário do grupo
"1232@s.whatsapp.net"
OwnerPNstring
Número/LID do proprietário (quando disponível)
Namestring
Nome do grupo
"Grupo de Suporte"
NameSetAtstring
Data da última alteração do nome
NameSetBystring
JID do usuário que definiu o nome
NameSetByPNstring
LID/PN de quem definiu o nome
Topicstring
Descrição do grupo
TopicIDstring
ID interno da descrição
TopicSetAtstring
Data da última alteração da descrição
TopicSetBystring
JID de quem alterou a descrição
TopicSetByPNstring
LID/PN de quem alterou a descrição
TopicDeletedboolean
Indica se a descrição foi apagada
IsLockedboolean
Indica se apenas administradores podem editar informações do grupo
● true = apenas admins podem editar
● false = todos podem editar
true
IsAnnounceboolean
Indica se apenas administradores podem enviar mensagens
AnnounceVersionIDstring
Versão da configuração de anúncios
IsEphemeralboolean
Indica se as mensagens são temporárias
DisappearingTimerinteger
Tempo em segundos para desaparecimento de mensagens
IsIncognitoboolean
Indica se o grupo é incognito
IsParentboolean
Indica se é um grupo pai (comunidade)
IsJoinApprovalRequiredboolean
Indica se requer aprovação para novos membros
LinkedParentJIDstring
JID da comunidade vinculada
IsDefaultSubGroupboolean
Indica se é um subgrupo padrão da comunidade
DefaultMembershipApprovalModestring
Modo padrão de aprovação de membros (quando comunidade)
GroupCreatedstring
Data de criação do grupo
CreatorCountryCodestring
Código do país do criador
ParticipantVersionIDstring
Versão da lista de participantes
Participantsarray
Lista de participantes do grupo
MemberAddModestring
Modo de adição de novos membros
AddressingModestring
Endereçamento preferido do grupo
OwnerCanSendMessageboolean
Verifica se é possível você enviar mensagens
OwnerIsAdminboolean
Verifica se você adminstrador do grupo
DefaultSubGroupIdstring
Se o grupo atual for uma comunidade, nesse campo mostrará o ID do subgrupo de avisos
invite_linkstring
Link de convite para entrar no grupo
request_participantsstring
Lista de solicitações de entrada, separados por vírgula
GroupParticipant
Participante de um grupo
Properties
JIDstring
Identificador do participante
LIDstring
Identificador local do participante
PhoneNumberstring
Número do participante (quando disponível)
IsAdminboolean
Indica se é administrador
IsSuperAdminboolean
Indica se é super administrador
DisplayNamestring
Nome exibido no grupo (para usuários anônimos)
Errorinteger
Código de erro ao adicionar participante
AddRequestobject
Informações da solicitação de entrada
WebhookEvent
Properties
eventstringrequired
Tipo do evento recebido
instancestringrequired
ID da instância que gerou o evento
dataobjectrequired
Payload do evento enviado pelo webhook. O formato varia conforme o tipo do evento
(messages, messages_update, connection, presence, etc) e segue o que o backend envia
em callHook (map[string]interface{}). Consulte os exemplos de cada evento específico.