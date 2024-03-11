import { dirname, relative } from 'path'

const builds = await Bun.build({
	entrypoints: ['main.tsx', 'App.tsx'],
	outdir: 'dist',
	splitting: true,
	minify: true,
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
		} else if (output.path.endsWith('.svg')) {
			return `<img src="${getRelativePath(output.path)}" />`
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

const appCssOutput = builds.outputs.find(output => output.path.startsWith('App') && output.path.endsWith('.css'))
const appCssPath = appCssOutput?.path ? `/${getRelativePath(appCssOutput?.path)}` : ''

const indexCssOutput = builds.outputs.find(output => output.path.startsWith('index') && output.path.endsWith('.css'))
const indexCssPath = indexCssOutput?.path ? `/${getRelativePath(indexCssOutput?.path)}` : ''

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
			return new Response(appJsOutput.stream(), {
				headers: {
					'Content-Type': appJsOutput.type || 'application/javascript',
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

		if (pathname === '/' && req.method === 'GET') {
			const indexFile = Bun.file('index.html')
			const indexContent = await indexFile.text()
			const replaceString = getReplaceString(builds.outputs)

			const contentWithReactScript = indexContent.replace('<!-- react-script -->', await replaceString)

			return new Response(contentWithReactScript, {
				headers: {
					'Content-Type': 'text/html',
				},
			})
		}

		return new Response('Not Found', { status: 404 })
	},
})

console.log(`Listening on ${server.hostname}:${server.port}`)
