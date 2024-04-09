import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'
import favicon from './assets/favicon.ico'
import './index.css'

import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'

const faviconLink: HTMLLinkElement | null = document.querySelector("link[rel~='icon']")
if (faviconLink) faviconLink.href = favicon

ReactDOM.createRoot(document.getElementById('app')!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
)
