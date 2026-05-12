import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { createClient } from '@supabase/supabase-js'

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
const prisma = new PrismaClient({ adapter })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  console.log('Seeding database...')

  // Create demo pipeline
  const pipeline = await prisma.pipeline.upsert({
    where: { id: 'pipeline_default' },
    update: {},
    create: {
      id: 'pipeline_default',
      name: 'Sales Pipeline',
      isDefault: true,
      stages: {
        create: [
          { id: 'stage_lead',        name: 'Lead',        order: 1, probability: 10,  color: '#94a3b8' },
          { id: 'stage_qualified',   name: 'Qualified',   order: 2, probability: 30,  color: '#60a5fa' },
          { id: 'stage_proposal',    name: 'Proposal',    order: 3, probability: 60,  color: '#a78bfa' },
          { id: 'stage_negotiation', name: 'Negotiation', order: 4, probability: 80,  color: '#fb923c' },
          { id: 'stage_won',         name: 'Won',         order: 5, probability: 100, color: '#4ade80', isWon: true  },
          { id: 'stage_lost',        name: 'Lost',        order: 6, probability: 0,   color: '#f87171', isLost: true },
        ],
      },
    },
  })

  console.log('✅ Pipeline created:', pipeline.name)

  // Create admin user via Supabase Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'admin@scc-courts.de',
    password: 'Admin2026!SCC',
    email_confirm: true,
    user_metadata: { firstName: 'Admin', lastName: 'SCC' },
  })

  if (error && !error.message.includes('already been registered')) {
    console.error('Error creating admin user:', error.message)
  } else if (data?.user) {
    await prisma.profile.upsert({
      where: { id: data.user.id },
      update: { role: 'admin' },
      create: {
        id: data.user.id,
        email: 'admin@scc-courts.de',
        firstName: 'Admin',
        lastName: 'SCC',
        role: 'admin',
      },
    })
    console.log('✅ Admin user created: admin@scc-courts.de / Admin2026!SCC')
  } else {
    console.log('ℹ️  Admin user already exists, updated role to admin')
  }

  console.log('Seeding complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
