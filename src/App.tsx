import './App.css'
import {router} from "./Router.tsx";
import {RouterProvider} from "react-router-dom";
import {ThemeProvider} from "styled-components";
import {darkTheme, lightTheme,} from "./styles/theme.ts";
import {GlobalStyle} from "./styles/GlobalStyle.ts";
import {Toaster} from "./components/toast/Toast.tsx";

function App() {
    const currentTheme = lightTheme;
    return (
        <ThemeProvider theme={currentTheme}>
            <GlobalStyle/>
            <Toaster/>
            <RouterProvider router={router}/>
        </ThemeProvider>
    );
}

export default App;