import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const adapter = new PrismaMariaDb({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'Tuyendeptrai142',
  database: 'asset_tracking'
})

const prisma = new PrismaClient({
  adapter
})

export default prisma;