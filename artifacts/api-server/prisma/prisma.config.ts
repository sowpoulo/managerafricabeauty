import path from 'node:path'

const config = {
  earlyAccess: true,
  schema: path.join(__dirname, 'schema.prisma'),
}

export default config
