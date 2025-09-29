// 喵~ 这是一个专业的错误处理组件，我们的“安全气囊”！
import {useRouteError} from "react-router-dom";

const ErrorPage = () => {
    const error = useRouteError() as any; // 获取路由抛出的错误
    console.error(error); // 在控制台打印详细错误，方便调试

    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-white bg-red-900/50 p-8">
            <h1 className="text-4xl font-bold mb-4">糟糕！出错了</h1>
            <p className="text-red-200 mb-6">应用在加载页面时遇到了问题，请联系作者解决</p>
            <pre className="bg-gray-800 p-4 rounded-lg text-left text-sm w-full max-w-2xl overflow-auto">
        <code>
          {error.statusText || error.message}
        </code>
      </pre>
        </div>
    );
};
export default ErrorPage