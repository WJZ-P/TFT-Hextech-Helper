import './App.css'
import {router} from "./Router.tsx";
import {RouterProvider} from "react-router-dom";


function App() {
  // 喵~ App 组件现在非常干净，只负责提供路由
  return <RouterProvider router={router} />;
}

export default App;
