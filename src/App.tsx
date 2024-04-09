// import Container from '@mui/material/Container'
import CssBaseline from '@mui/material/CssBaseline'
// import ThemeProvider from '@mui/material/styles/ThemeProvider'
// import createTheme from '@mui/material/styles/createTheme'
// import useMediaQuery from '@mui/material/useMediaQuery'
import Test from './Components/Test'

import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'

function App() {
	// const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
	// const [darkMode, setDarkMode] = useState<boolean>(prefersDarkMode)

	// const theme = useMemo(
	// 	() =>
	// 		createTheme({
	// 			palette: {
	// 				mode: darkMode ? 'dark' : 'light',
	// 			},
	// 		}),
	// 	[darkMode],
	// )

	return (
		<>
			{/* <ThemeProvider theme={theme}> */}
			<CssBaseline enableColorScheme />
			<Test />
			{/* <Container component="main"></Container> */}
			{/* </ThemeProvider> */}
		</>
	)
}

export default App
