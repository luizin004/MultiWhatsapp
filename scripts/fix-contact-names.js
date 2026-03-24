/**
 * Script para corrigir nomes de contatos que foram salvos com o nome da instância.
 * Busca o nome real via UAZAPI /chat/details para cada contato com nome genérico.
 */

const SUPABASE_URL = 'https://kyensxcpwabqpbzrgngy.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5ZW5zeGNwd2FicXBienJnbmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMzY0NzcsImV4cCI6MjA3MDYxMjQ3N30.EjVUGrCekMGgHTnafavv1sY41QApmU94mYYH5GILpdE'
const UAZAPI_URL = 'https://oralaligner.uazapi.com'

const INSTANCE_PROFILE_NAMES = [
  'oralaligner', 'oral aligner', 'oralaligner comercial',
  'planejamento oralaligner', 'planejamento/cobranca', 'planejamento/cobrança',
  'suporte ao cliente', 'oralday'
]

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  })
  return res.json()
}

async function supabasePatch(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(data)
  })
  return res.status
}

async function getContactName(token, phoneNumber) {
  try {
    const res = await fetch(`${UAZAPI_URL}/chat/details`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        token
      },
      body: JSON.stringify({ number: phoneNumber })
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.wa_contactName || data?.wa_name || data?.name || null
  } catch {
    return null
  }
}

function isGenericName(name, phone) {
  if (!name) return true
  const lower = name.toLowerCase().trim()
  if (lower === phone) return true
  if (/^\d+$/.test(lower)) return true
  if (INSTANCE_PROFILE_NAMES.some(p => lower === p)) return true
  return false
}

async function main() {
  console.log('Buscando contatos...')
  const contacts = await supabaseGet(
    'contacts?select=id,name,phone_number,instance_id,instances(uazapi_instance_id,name)&order=updated_at.desc&limit=500'
  )

  const toFix = contacts.filter(c => isGenericName(c.name, c.phone_number))
  console.log(`Encontrados ${toFix.length} contatos com nomes genericos de ${contacts.length} total`)

  let fixed = 0
  let skipped = 0

  for (const contact of toFix) {
    const token = contact.instances?.uazapi_instance_id
    if (!token) { skipped++; continue }

    // Pular grupos
    if (contact.phone_number.includes('@g.us')) { skipped++; continue }

    const realName = await getContactName(token, contact.phone_number)

    if (realName && !isGenericName(realName, contact.phone_number)) {
      const status = await supabasePatch('contacts', contact.id, { name: realName })
      console.log(`  [OK] ${contact.phone_number}: "${contact.name}" -> "${realName}" (HTTP ${status})`)
      fixed++
    } else {
      console.log(`  [--] ${contact.phone_number}: "${contact.name}" (sem nome melhor na UAZAPI)`)
      skipped++
    }

    // Rate limit gentil
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\nResultado: ${fixed} corrigidos, ${skipped} ignorados`)
}

main().catch(console.error)
