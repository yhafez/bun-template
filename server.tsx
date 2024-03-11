import { dirname, relative } from 'path'
import { renderToReadableStream } from 'react-dom/server'
import App from './App'

const builds = await Bun.build({
	entrypoints: ['main.tsx', 'App.tsx', 'favicon.ico'],
	outdir: 'dist',
	minify: true,
	splitting: true,
})

const getRelativePath = (outputPath: string) => {
	return relative(dirname(outputPath), outputPath)
}

const getReplaceString = async (outputs: typeof builds.outputs) => {
	const replacePromises = outputs.map(async output => {
		if (output.path.endsWith('.js')) {
			return `<script type="module" src="${getRelativePath(output.path)}"></script>`
		} else if (output.path.endsWith('.css')) {
			const cssContent = await output.text()
			return `<style>${cssContent}</style>`
		} else if (output.path.endsWith('.ico')) {
			return `<link rel="icon" href="${getRelativePath(output.path)}" />`
		}
	})

	// Use Promise.all to wait for all promises to resolve
	const replaceStrings = await Promise.all(replacePromises)
	return replaceStrings.sort(a => (a?.includes('<style>') ? -1 : 1)).join('\n')
}

const mainJsOutput = builds.outputs.find(output => output.path.endsWith('main.js'))
const mainJsPath = mainJsOutput?.path ? `/${getRelativePath(mainJsOutput?.path)}` : ''

const appJsOutput = builds.outputs.find(output => output.path.endsWith('App.js'))
const appJsPath = appJsOutput?.path ? `/${getRelativePath(appJsOutput?.path)}` : ''

const appCssOutput = builds.outputs.find(
	output => output.path.startsWith('App') && output.path.endsWith('.css'),
)
const appCssPath = appCssOutput?.path ? `/${getRelativePath(appCssOutput?.path)}` : ''

const indexCssOutput = builds.outputs.find(
	output => output.path.startsWith('index') && output.path.endsWith('.css'),
)
const indexCssPath = indexCssOutput?.path ? `/${getRelativePath(indexCssOutput?.path)}` : ''

const faviconOutput = builds.outputs.find(output => output.path.endsWith('.ico'))
const faviconPath = faviconOutput?.path ? `/${getRelativePath(faviconOutput?.path)}` : ''

const chunkOutput = builds.outputs.find(
	output => output.path.startsWith('chunk') && output.path.endsWith('.js'),
)
const chunkPath = chunkOutput?.path ? `/${getRelativePath(chunkOutput?.path)}` : ''

const server = Bun.serve({
	port: process.env['PORT'],
	fetch: async req => {
		const { pathname } = new URL(req.url)

		if (pathname === mainJsPath && req.method === 'GET' && mainJsOutput) {
			return new Response(mainJsOutput.stream(), {
				headers: {
					'Content-Type': mainJsOutput.type || 'application/javascript',
				},
			})
		}

		if (pathname === appJsPath && req.method === 'GET' && appJsOutput) {
			// Serve App component
			const appStream = await renderToReadableStream(<App />)
			return new Response(appStream, {
				headers: {
					'Content-Type': 'text/html',
				},
			})
		}

		if (pathname === appCssPath && req.method === 'GET' && appCssOutput) {
			return new Response(appCssOutput.stream(), {
				headers: {
					'Content-Type': appCssOutput.type || 'text/css',
				},
			})
		}

		if (pathname === indexCssPath && req.method === 'GET' && indexCssOutput) {
			return new Response(indexCssOutput.stream(), {
				headers: {
					'Content-Type': indexCssOutput.type || 'text/css',
				},
			})
		}

		if (pathname === faviconPath && req.method === 'GET' && faviconOutput) {
			return new Response(faviconOutput.stream(), {
				headers: {
					'Content-Type': faviconOutput.type || 'image/x-icon',
				},
			})
		}

		if (pathname === chunkPath && req.method === 'GET' && chunkOutput) {
			return new Response(chunkOutput.stream(), {
				headers: {
					'Content-Type': chunkOutput.type || 'application/javascript',
				},
			})
		}

		if (pathname === '/' && req.method === 'GET') {
			const indexFile = Bun.file('index.html')
			const indexContent = await indexFile.text()
			const replaceString = getReplaceString(builds.outputs)

			const contentWithReactScript = indexContent.replace(
				'<!-- react-script -->',
				await replaceString,
			)

			return new Response(contentWithReactScript, {
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

console.log(`Listening on ${server.hostname}:${server.port}`)
