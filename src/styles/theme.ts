// 喵~ 1. 从 Material-UI 导入“菜单制作工具”
import { createTheme, ThemeOptions } from '@mui/material/styles';

// 喵~ 2. 这是我们自己定义的、纯粹的“中文”设计规范
const customThemeOptions = {
  colors: {
    primary: '#66ccff',
    primaryHover: '#33bbff',
    navActiveBg: '#66ccff',
    navActiveText: '#0D1117',
    background: '#111827',
    sidebarBg: '#1F2937',
    elementBg: '#374151',
    elementHover: '#4B5563',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textDisabled: '#6B7280',
    textOnPrimary: '#0D1117',
    border: '#374151',
    divider: '#4B5563',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  spacing: {
    small: '0.5rem',
    medium: '1rem',
    large: '1.5rem',
  },
  fontSizes: {
    small: '0.875rem',
    medium: '1rem',
    large: '1.25rem',
  },
  borderRadius: '8px',
};

// 喵~ 3. 这是给“法餐大厨”看的“法语”菜单部分
// 我们告诉他，他的主色调应该用我们的 primary 颜色
const muiThemeOptions: ThemeOptions = {
  palette: {
    primary: {
      main: customThemeOptions.colors.primary,
    },
    // 你可以在这里为 MUI 定义更多颜色...
  },
};

// 喵~ 4. 最关键的一步：制作“双语菜单”！
// 我们用 createTheme 创建一个基础的 MUI 主题（法语部分）
// 然后用 ... 操作符，把我们自己的 customThemeOptions（中文部分）也合并进去！
export const theme = {
  ...createTheme(muiThemeOptions), // 包含了 MUI 需要的所有东西，比如 palette
  ...customThemeOptions,          // 也包含了我们自己需要的所有东西，比如 colors
};

// 喵~ 导出一个 theme 的类型，方便我们在其他地方获得类型提示
export type ThemeType = typeof theme;