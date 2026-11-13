import { readFile } from 'node:fs/promises'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// WebLLM's published lib/index.js.map points at TypeScript sources that are not
// in the npm package, so the dev server warns about a missing sourcemap on every
// reload. Load the file without its sourceMappingURL so the map is never read.
function stripWebllmSourcemap() {
  return {
    name: 'strip-webllm-sourcemap',
    enforce: 'pre',
    async load(id) {
      const file = id.split('?')[0]
      if (!file.endsWith('@mlc-ai/web-llm/lib/index.js')) return null
      const code = await readFile(file, 'utf8')
      return code.replace(/\n?\/\/# sourceMappingURL=\S+\s*$/, '')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), stripWebllmSourcemap()],
  // WebLLM ships its own worker + wasm loader; pre-bundling breaks those paths.
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'],
  },
})
