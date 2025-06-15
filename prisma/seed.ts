import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'farmer@example.com' },
    update: {},
    create: {
      id: 'user_placeholder',
      email: 'farmer@example.com',
      name: 'John Farmer',
      johnDeereConnected: false,
    },
  })

  console.log('✅ Created user:', user.email)

  // Create sample chat sessions
  const session1 = await prisma.chatSession.create({
    data: {
      userId: user.id,
      title: 'Field Analysis',
      messages: {
        create: [
          {
            role: 'user',
            content: 'Can you show me the yield data for my corn fields?',
          },
          {
            role: 'assistant',
            content: 'I\'d be happy to help you analyze your corn field yield data! To access your specific field information, you\'ll need to connect your John Deere Operations Center account. Once connected, I can show you detailed yield maps, historical performance, and field-by-field comparisons.',
          },
        ],
      },
    },
  })

  const session2 = await prisma.chatSession.create({
    data: {
      userId: user.id,
      title: 'Equipment Status',
      messages: {
        create: [
          {
            role: 'user',
            content: 'What\'s the current status of my tractors?',
          },
          {
            role: 'assistant',
            content: 'To provide you with real-time equipment status, I\'ll need access to your John Deere Operations Center. Once connected, I can show you:\n\n• Current location of all equipment\n• Operational status and alerts\n• Maintenance schedules\n• Fuel levels and usage\n• Hours of operation\n\nWould you like me to help you connect your account?',
          },
        ],
      },
    },
  })

  console.log('✅ Created chat sessions:', session1.title, 'and', session2.title)

  // Create sample file uploads
  const fileUpload = await prisma.fileUpload.create({
    data: {
      filename: 'field_prescription_2024.zip',
      originalName: 'Field 23 Nitrogen Prescription.zip',
      fileType: 'application/zip',
      fileSize: 2048576, // 2MB
      filePath: '/uploads/field_prescription_2024.zip',
      status: 'processed',
      metadata: {
        fields: 1,
        features: 156,
        bounds: [-95.123, 41.456, -95.089, 41.478],
        crs: 'EPSG:4326',
        prescriptionType: 'nitrogen',
        targetRate: 180,
        units: 'lbs/acre',
      },
    },
  })

  console.log('✅ Created sample file upload:', fileUpload.originalName)

  // Create sample equipment
  const equipment = await prisma.equipment.create({
    data: {
      johnDeereId: 'JD_TRACTOR_001',
      name: 'John Deere 8R 370',
      type: 'tractor',
      model: '8R 370',
      year: 2022,
      serialNumber: 'RW8R370X123456',
      lastLocation: {
        lat: 41.4567,
        lng: -95.1234,
        timestamp: new Date().toISOString(),
      },
      lastSeen: new Date(),
      isActive: true,
      metadata: {
        engineHours: 1247,
        fuelLevel: 85,
        implements: ['planter', 'cultivator'],
      },
    },
  })

  console.log('✅ Created sample equipment:', equipment.name)

  // Create sample field operations
  const fieldOperation = await prisma.fieldOperation.create({
    data: {
      johnDeereFieldId: 'FIELD_001',
      operationType: 'planting',
      operationDate: new Date('2024-04-15'),
      equipmentId: equipment.johnDeereId,
      area: 156.7,
      notes: 'Corn planting - Field 23 North',
      metadata: {
        crop: 'corn',
        variety: 'Pioneer P1234',
        seedRate: 32000,
        depth: 2.0,
        spacing: 30,
        weather: {
          temperature: 68,
          humidity: 45,
          windSpeed: 8,
        },
      },
    },
  })

  console.log('✅ Created sample field operation:', fieldOperation.operationType)

  console.log('🎉 Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 