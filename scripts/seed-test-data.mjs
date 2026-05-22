import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hvxlqvnuwiqtahmgppyh.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eGxxdm51d2lxdGFobWdwcHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczODQ4NTEsImV4cCI6MjA5Mjk2MDg1MX0.mdl0GgG_nMnlcjVpcZjjAAaXIv5gob3CqG4yZDITxcc'
const DEV_EMAIL = 'erayboranagirdici@gmail.com'
const DEV_PASSWORD = 'Eray2026!'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function buildBlocks(userId) {
  const rows = []

  // Pazartesi (0) ve Salı (1)
  for (const day of [0, 1]) {
    rows.push(
      { user_id: userId, day_of_week: day, start_time: '09:00:00', end_time: '17:00:00', title: 'Okul',              is_hard_constraint: true,  energy_cost: 4, flexibility_score: 1 },
      { user_id: userId, day_of_week: day, start_time: '19:00:00', end_time: '21:00:00', title: 'Algoritma Çalışması', is_hard_constraint: false, energy_cost: 5, flexibility_score: 3 },
    )
  }

  // Çarşamba (2), Perşembe (3), Cuma (4)
  for (const day of [2, 3, 4]) {
    rows.push(
      { user_id: userId, day_of_week: day, start_time: '08:00:00', end_time: '18:00:00', title: 'Staj',             is_hard_constraint: true,  energy_cost: 5, flexibility_score: 1 },
      { user_id: userId, day_of_week: day, start_time: '20:00:00', end_time: '21:30:00', title: 'Kitap Okuma',      is_hard_constraint: false, energy_cost: 2, flexibility_score: 5 },
      { user_id: userId, day_of_week: day, start_time: '22:00:00', end_time: '23:00:00', title: 'Dizi / Dinlenme',  is_hard_constraint: false, energy_cost: 1, flexibility_score: 5 },
    )
  }

  // Cumartesi (5) ve Pazar (6)
  for (const day of [5, 6]) {
    rows.push(
      { user_id: userId, day_of_week: day, start_time: '10:00:00', end_time: '14:00:00', title: 'Kişisel Proje Kodlama', is_hard_constraint: false, energy_cost: 4, flexibility_score: 4 },
      { user_id: userId, day_of_week: day, start_time: '15:00:00', end_time: '18:00:00', title: 'Sosyal Zaman',          is_hard_constraint: false, energy_cost: 2, flexibility_score: 2 },
    )
  }

  return rows
}

async function main() {
  // 1. Kimlik doğrula
  console.log('Giriş yapılıyor...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  })
  if (authError) throw new Error(`Auth hatası: ${authError.message}`)
  const userId = authData.user.id
  console.log(`✓ Kullanıcı ID: ${userId}`)

  // 2. tasks tablosunu temizle
  console.log('tasks tablosu temizleniyor...')
  const { error: delTasksErr } = await supabase
    .from('tasks')
    .delete()
    .eq('user_id', userId)
  if (delTasksErr) throw new Error(`tasks DELETE hatası: ${delTasksErr.message}`)
  console.log('✓ tasks temizlendi')

  // 3. skeleton_blocks tablosunu temizle
  console.log('skeleton_blocks tablosu temizleniyor...')
  const { error: delBlocksErr } = await supabase
    .from('skeleton_blocks')
    .delete()
    .eq('user_id', userId)
  if (delBlocksErr) throw new Error(`skeleton_blocks DELETE hatası: ${delBlocksErr.message}`)
  console.log('✓ skeleton_blocks temizlendi')

  // 4. skeleton_blocks verisini bas
  console.log('Test verileri ekleniyor...')
  const blocks = buildBlocks(userId)
  const { data: insertedBlocks, error: insertErr } = await supabase
    .from('skeleton_blocks')
    .insert(blocks)
    .select('id, day_of_week, title, energy_cost, flexibility_score')
  if (insertErr) throw new Error(`skeleton_blocks INSERT hatası: ${insertErr.message}`)

  console.log(`\n✓ ${insertedBlocks.length} blok eklendi:\n`)
  const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
  for (const b of insertedBlocks) {
    console.log(`  [${dayNames[b.day_of_week]}] ${b.title.padEnd(26)} energy:${b.energy_cost}  flex:${b.flexibility_score}`)
  }
}

main().catch((err) => {
  console.error('\n✗ HATA:', err.message)
  process.exit(1)
})
