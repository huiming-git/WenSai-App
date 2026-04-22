import { createServer } from 'vite'

const port = Number(process.env.WENSAI_DEV_PORT || process.env.PORT || 1420)

const server = await createServer({
  configFile: 'vite.config.js',
  configLoader: 'native',
  server: {
    host: '127.0.0.1',
    port,
    strictPort: true,
  },
})

await server.listen()
server.printUrls()

const close = async () => {
  await server.close()
  process.exit(0)
}

process.on('SIGINT', close)
process.on('SIGTERM', close)

setInterval(() => {}, 1 << 30)
