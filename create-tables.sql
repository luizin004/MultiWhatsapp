-- Criar tabela instances
CREATE TABLE IF NOT EXISTS instances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  api_token TEXT,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting')),
  profile_pic_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
  name TEXT,
  phone_number TEXT NOT NULL,
  profile_pic_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'audio', 'video', 'document')),
  direction TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  external_id TEXT,
  attachment_url TEXT,
  attachment_mime TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_contacts_instance_id ON contacts(instance_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_messages_instance_id ON messages(instance_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_instances_api_token ON instances(api_token);

-- Habilitar RLS (Row Level Security)
ALTER TABLE instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir tudo por enquanto, depois pode ser ajustado)
CREATE POLICY "Enable all operations on instances" ON instances FOR ALL USING (true);
CREATE POLICY "Enable all operations on contacts" ON contacts FOR ALL USING (true);
CREATE POLICY "Enable all operations on messages" ON messages FOR ALL USING (true);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_instances_updated_at') THEN
    CREATE TRIGGER update_instances_updated_at
    BEFORE UPDATE ON instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contacts_updated_at') THEN
    CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_messages_updated_at') THEN
    CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Criar tabela conversations (controla sessões e métricas intermediárias)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  first_reply_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'waiting', 'closed')),
  sla_violation BOOLEAN,
  messages_count INTEGER DEFAULT 0,
  customer_messages_count INTEGER DEFAULT 0,
  instance_messages_count INTEGER DEFAULT 0,
  last_message_direction TEXT CHECK (last_message_direction IN ('inbound', 'outbound')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_instance_id ON conversations(instance_id);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON conversations(started_at);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations on conversations" ON conversations FOR ALL USING (true);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_conversations_updated_at') THEN
    CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Criar tabela instance_activity (snapshots usados no dashboard)
CREATE TABLE IF NOT EXISTS instance_activity (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  active_chats INTEGER DEFAULT 0,
  pending_queue INTEGER DEFAULT 0,
  idle_since TIMESTAMPTZ,
  follow_up_sent INTEGER DEFAULT 0,
  follow_up_replied INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_instance_activity_instance_date
  ON instance_activity(instance_id, captured_at DESC);

ALTER TABLE instance_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations on instance_activity" ON instance_activity FOR ALL USING (true);

-- Criar tabela instance_metrics_daily (consolidação diária por instância)
CREATE TABLE IF NOT EXISTS instance_metrics_daily (
  instance_id UUID REFERENCES instances(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  avg_tmr TEXT,
  avg_tma TEXT,
  sla_breach_rate NUMERIC,
  avg_messages_per_conversation NUMERIC,
  engagement_rate NUMERIC,
  follow_up_sent INTEGER DEFAULT 0,
  follow_up_success INTEGER DEFAULT 0,
  avg_active_chats NUMERIC,
  max_active_chats INTEGER,
  PRIMARY KEY (instance_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_instance_metrics_daily_date ON instance_metrics_daily(metric_date DESC);

ALTER TABLE instance_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations on instance_metrics_daily" ON instance_metrics_daily FOR ALL USING (true);
