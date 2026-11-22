import {createGlobalStyle} from "styled-components";

export const GlobalStyle = createGlobalStyle`
  /* * 喵~ 装修第一步：样式重置 (CSS Reset)
 * 我们把所有元素默认的 margin, padding 和盒模型计算方式都统一起来
 * 这样能避免很多浏览器兼容性问题
*/
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    // 更平滑的滚动体验
    scroll-behavior: smooth;
    // 原生控件（下拉框、时间选择器等）也使用深色外观
    color-scheme: dark;
  }

  /*
   * 喵~ 装修第二步：设定全局基调
   * 我们在这里为 <body> 设置基础的字体、背景色和文字颜色
   * 最神奇的是，它能自动读取到我们通过 <ThemeProvider> 提供的 theme！
  */
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei UI', 'Microsoft YaHei',
    'Roboto', 'Helvetica Neue', sans-serif;

    /* 喵~ 从我们的 theme 设计规范里，读取背景色和文字颜色！*/
    background-color: ${props => props.theme.colors.background};
    color: ${props => props.theme.colors.text};

    /* 让字体渲染更平滑，看起来更舒服 */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    /* 确保应用在视口高度不足时，也能撑满整个屏幕 */
    min-height: 100vh;
  }

  /* 文字选中：金色底，和整体配色统一 */
  ::selection {
    background: ${props => props.theme.colors.gold}66;
    color: ${props => props.theme.colors.goldBright};
  }

  /* 滚动条：细条、暗金滑块，深色背景上不刺眼 */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.goldDim};
    border: 2px solid ${props => props.theme.colors.background};
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.gold};
  }
  ::-webkit-scrollbar-corner {
    background: transparent;
  }
`
