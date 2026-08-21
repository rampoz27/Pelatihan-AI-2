import { createServer } from 'http'
import { readFile, stat } from 'fs/promises'
import { extname, join, normalize } from 'path'

const PORT = process.env.PORT || 3000
const DIST = join(process.cwd(), 'dist')
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2',
}

createServer(async (req, res) => {
  try {
    const urlPath = normalize(decodeURIComponent((req.url || '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '')
    let file = join(DIST, urlPath)
    try {
      const s = await stat(file)
      if (s.isDirectory()) file = join(file, 'index.html')
    } catch {
      file = join(DIST, 'index.html') // SPA fallback
    }
    const content = await readFile(file)
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' })
    res.end(content)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
}).listen(PORT, () => console.log(`Dashboard running on port ${PORT}`))
