import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function createDemoUser() {
  try {
    // Check if demo user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@farm.com' }
    })

    if (existingUser) {
      console.log('Demo user already exists:', existingUser.email)
      return existingUser
    }

    // Create demo user
    const user = await prisma.user.create({
      data: {
        id: 'user_placeholder', // Keep the same ID for backward compatibility
        email: 'admin@farm.com',
        name: 'Farm Administrator',
        johnDeereConnected: false,
      }
    })

    console.log('✅ Demo user created successfully:')
    console.log('Email:', user.email)
    console.log('Password: admin123')
    console.log('ID:', user.id)

    return user
  } catch (error) {
    console.error('Error creating demo user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  createDemoUser()
    .then(() => {
      console.log('Demo user setup complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Failed to create demo user:', error)
      process.exit(1)
    })
}

export { createDemoUser } 