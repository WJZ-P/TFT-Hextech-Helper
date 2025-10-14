import './App.css'
import {router} from "./Router.tsx";
import {RouterProvider} from "react-router-dom";
import {ThemeProvider} from "styled-components";
import {darkTheme, lightTheme,} from "./styles/theme.ts";
import {GlobalStyle} from "./styles/GlobalStyle.ts";
import {ToastProvider} from "./components/toast/Toast.tsx";


function App() {
    // 喵~ App 组件现在非常干净，只负责提供路由
    const currentTheme = lightTheme;
    return (
        <ThemeProvider theme={currentTheme}>
            <ToastProvider>
                <GlobalStyle/>
                <RouterProvider router={router}/>
            </ToastProvider>
        </ThemeProvider>
    );
}

export default App;