# Centralizador de WhatsApp Multi-Instância

Um projeto full-stack para centralizar mensagens de múltiplas instâncias do WhatsApp em uma única interface, utilizando a API Uazaí.

## Stack Tecnológica

- **Front-end**: Next.js (App Router), React, Tailwind CSS, Lucide React
- **Back-end/BaaS**: Supabase (Auth, Database, Edge Functions)
- **API de WhatsApp**: Uazaí (compatível com Evolution API/Baileys)

## Funcionalidades

- ✅ Dashboard com layout de chat estilo WhatsApp
- ✅ Barra lateral com lista de contatos ordenada por última mensagem
- ✅ Badges indicando a instância (número comercial) de cada chat
- ✅ Visualização do histórico de mensagens em tempo real
- ✅ Input para envio de mensagens (visual + console.log)
- ✅ Realtime Subscriptions do Supabase para atualizações automáticas

## Configuração

### 1. Variáveis de Ambiente

Configure o arquivo `.env.local` com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

### 2. Estrutura do Banco de Dados

O projeto assume as seguintes tabelas no Supabase:

- `instances`: Informações das instâncias do WhatsApp
- `contacts`: Contatos das conversas
- `messages`: Mensagens trocadas

### 3. Edge Function

A Edge Function `webhook-uazapi` deve estar configurada para receber webhooks da API Uazaí e popular as tabelas do banco.

## Getting Started

Instale as dependências e inicie o servidor de desenvolvimento:

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## Estrutura do Projeto

```
src/
├── app/
│   └── page.tsx              # Página principal
├── components/
│   ├── Dashboard.tsx         # Componente principal do dashboard
│   ├── Sidebar.tsx          # Barra lateral com contatos
│   ├── ChatArea.tsx         # Área de mensagens
│   └── MessageInput.tsx     # Input para envio de mensagens
├── lib/
│   └── supabase.ts          # Cliente Supabase
└── types/
    └── database.ts          # Tipos do banco de dados
```

## Próximos Passos

- [ ] Implementar envio real de mensagens via API Uazaí
- [ ] Adicionar suporte a mídia (imagens, áudios, documentos)
- [ ] Implementar autenticação de usuários
- [ ] Adicionar notificações desktop
- [ ] Criar páginas de configuração de instâncias
- [ ] Implementar busca de contatos e mensagens

## Deploy

Para fazer o deploy em produção, utilize o comando:

```bash
npm run build
npm start
```

Ou faça o deploy diretamente na Vercel conectando seu repositório.
