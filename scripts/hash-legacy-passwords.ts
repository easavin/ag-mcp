/*
  One-off helper to hash any legacy plaintext passwords.
  Safe to run multiple times; it only hashes rows that don't look like bcrypt.
*/

import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

function looksHashed(password: string): boolean {
  return password.startsWith('$2a$') || password.startsWith('$2b$')
}

async function main() {
  const users = await prisma.user.findMany({
    where: { password: { not: null } },
    select: { id: true, email: true, password: true },
  })

  let upgraded = 0
  for (const user of users) {
    const pw = user.password as string
    if (!looksHashed(pw)) {
      const hash = await bcrypt.hash(pw, 10)
      await prisma.user.update({ where: { id: user.id }, data: { password: hash } })
      upgraded += 1
      console.log(`Upgraded password for ${user.email}`)
    }
  }

  console.log(`\nDone. Upgraded ${upgraded} of ${users.length} users.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



