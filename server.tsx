import { dirname, relative } from 'path'
import path from 'path'

const builds = await Bun.build({
	entrypoints: ['src'],
	outdir: 'dist',
	minify: true,
	splitting: true,
})

const jsOutputs = builds.outputs.filter(output => output.path.endsWith('.js'))
const cssOutputs = builds.outputs.filter(output => output.path.endsWith('.css'))
const faviconOutput = builds.outputs.find(output => output.path.endsWith('.ico'))
const svgOutputs = builds.outputs.filter(output => output.path.endsWith('.svg'))

const server = Bun.serve({
	port: process.env['PORT'],
	fetch: async req => {
		const { pathname } = new URL(req.url)

		const basePath = path.join(process.cwd(), 'dist')
		const getWebPath = (outputPath?: string) => {
			return outputPath?.replace(basePath, '') || ''
		}

		// Serve favicon
		if (pathname === getWebPath(faviconOutput?.path) && faviconOutput && req.method === 'GET') {
			return new Response(faviconOutput.stream(), {
				headers: { 'Content-Type': faviconOutput.type || 'image/x-icon' },
			})
		}

		// Serve SVGs
		for (const svgOutput of svgOutputs) {
			if (pathname === getWebPath(svgOutput.path) && svgOutput && req.method === 'GET') {
				return new Response(svgOutput.stream(), {
					headers: { 'Content-Type': svgOutput.type || 'image/svg+xml' },
				})
			}
		}

		// Serve CSS
		for (const cssOutput of cssOutputs) {
			if (pathname === getWebPath(cssOutput.path) && cssOutput && req.method === 'GET') {
				return new Response(cssOutput.stream(), {
					headers: { 'Content-Type': cssOutput.type || 'text/css' },
				})
			}
		}

		// Serve JS (including index.js, app.js, and chunks)
		for (const jsOutput of jsOutputs) {
			if (pathname === getWebPath(jsOutput?.path) && jsOutput && req.method === 'GET') {
				return new Response(jsOutput.stream(), {
					headers: { 'Content-Type': jsOutput.type || 'text/javascript' },
				})
			}
		}

		// Fallback for root path to serve the index.html with replaced content
		if (pathname === '/' && req.method === 'GET') {
			const indexFile = Bun.file('src/index.html')
			const indexContent = await indexFile.text()
			const getReplaceString = async (outputs: typeof builds.outputs) => {
				const replacePromises = outputs.map(async output => {
					if (output.path.endsWith('.js')) {
						return `<script type="module" src="${`src/${relative(
							dirname(output.path),
							output.path,
						)}`}"></script>`
					} else if (output.path.endsWith('.css')) {
						const cssContent = await output.text()
						return `<style>${cssContent}</style>`
					} else if (output.path.endsWith('.ico')) {
						return `<link rel="icon" href="${`src/${relative(
							dirname(output.path),
							output.path,
						)}`}">`
					}
				})

				const replaceStrings = await Promise.all(replacePromises)
				return replaceStrings
					.filter(a => !!a)
					.sort(a => (a?.includes('<style>') ? -1 : 1))
					.join('\n')
			}
			const replaceString = await getReplaceString(builds.outputs)
			const content = indexContent.replace('<!-- react-script -->', replaceString)

			return new Response(content, {
				headers: {
					'Content-Type': 'text/html',
				},
			})
		}

		try {
			// Attempt to serve a file from the dist directory
			const response = await new Response(Bun.file(`./dist${pathname}`))
			if (response.status === 200) {
				return response
			}
		} catch (error) {
			// If no routes matched and no file was served, return a 404 response
			return new Response('404 Not Found', {
				status: 404,
				headers: { 'Content-Type': 'text/plain' },
			})
		}

		// If no routes matched and no file was served, return a 404 response
		return new Response('404 Not Found', {
			status: 404,
			headers: { 'Content-Type': 'text/plain' },
		})
	},
})

console.info(`Listening on ${server.hostname}:${server.port}`)
