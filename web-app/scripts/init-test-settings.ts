import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initTestSettings() {
  try {
    console.log('\n🔧 Initializing test settings...\n')

    const defaultSettings = [
      {
        testType: 'pre-test',
        isLocked: false,
        requirePrerequisite: false,
        allowRetakes: true,
        lockedWeeks: null
      },
      {
        testType: 'post-test',
        isLocked: false,
        requirePrerequisite: false,
        allowRetakes: true,
        lockedWeeks: null
      },
      {
        testType: 'mock-exam',
        isLocked: false,
        requirePrerequisite: false,
        allowRetakes: true,
        lockedWeeks: null
      }
    ]

    for (const setting of defaultSettings) {
      await prisma.testSettings.upsert({
        where: { testType: setting.testType },
        update: {},
        create: setting
      })
      console.log(`✅ ${setting.testType}: Unlocked (allows retakes, no prerequisites)`)
    }

    console.log('\n✨ Test settings initialized! All tests are unlocked for demo.\n')
  } catch (error) {
    console.error('❌ Error initializing test settings:', error)
    throw error
  }
}

initTestSettings()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })




