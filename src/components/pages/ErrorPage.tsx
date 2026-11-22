// 喵~ 这是一个专业的错误处理组件，我们的“安全气囊”！
import {useRouteError} from "react-router-dom";
import styled from "styled-components";
import {hextechPanel} from "../../styles/hextech.ts";
import {TitleBar} from "../TitleBar.tsx";

/** 出错时 MainLayout 不会渲染，这里自己带一个标题栏，保证无边框窗口仍能拖动和关闭 */
const ErrorLayout = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${props => props.theme.colors.background};
`;

const PageWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const ErrorPanel = styled.div`
  ${hextechPanel};
  width: 100%;
  max-width: 640px;
  padding: 1.5rem 2rem;
  text-align: left;
  border-color: ${props => props.theme.colors.error}99;
`;

const Title = styled.h1`
  margin-bottom: 0.75rem;
  font-size: 1.6rem;
  font-weight: 800;
  color: ${props => props.theme.colors.goldBright};
`;

const Hint = styled.p`
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const ErrorDetail = styled.pre`
  padding: 1rem;
  font-size: 0.85rem;
  overflow: auto;
  color: ${props => props.theme.colors.error};
  background: rgba(1, 10, 19, 0.6);
  border: 1px solid ${props => props.theme.colors.goldDeep};
`;

const ErrorPage = () => {
    const error = useRouteError() as any; // 获取路由抛出的错误
    console.error(error); // 在控制台打印详细错误，方便调试

    return (
        <ErrorLayout>
            <TitleBar/>
            <PageWrapper>
                <ErrorPanel>
                    <Title>糟糕！出错了</Title>
                    <Hint>应用在加载页面时遇到了问题，请联系作者解决</Hint>
                    <ErrorDetail>
                        <code>
                            {error?.statusText || error?.message}
                        </code>
                    </ErrorDetail>
                </ErrorPanel>
            </PageWrapper>
        </ErrorLayout>
    );
};
export default ErrorPage
