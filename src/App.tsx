import './App.css'
import {router} from "./Router.tsx";
import {RouterProvider} from "react-router-dom";
import {ThemeProvider} from "styled-components";
import {theme} from "./styles/theme.ts";
import {GlobalStyle} from "./styles/GlobalStyle.ts";


function App() {
    // 喵~ App 组件现在非常干净，只负责提供路由
    return (
        <ThemeProvider theme={theme}>
            <GlobalStyle />
            <RouterProvider router={router}/>
        </ThemeProvider>
    );
}

export default App;