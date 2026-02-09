import {createTheme, ThemeOptions} from "@mui/material";

const lightPalette = {
    primary: '#66ccff',
    primaryHover: '#33bbff',
    navActiveBg: '#66ccff',
    navActiveText: '#ffffff',
    background: '#f8f9fa',
    sidebarBg: '#ffffff',
    cardBg: '#eef1f5',          // 卡片背景色（浅灰蓝，与背景 #f8f9fa 有明显对比）
    elementBg: '#ffffff',
    elementHover: '#f1f3f5',
    text: '#212529',
    textSecondary: '#6c757d',
    textDisabled: '#adb5bd',
    textOnPrimary: '#ffffff',
    border: '#dee2e6',
    divider: '#ced4da',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    resizer: '#ced4da',        // 拖拽条的默认颜色
    resizerHover: '#66ccff',    // 鼠标悬停在拖拽条上时的颜色 (主色调)
    // 羁绊激活色 (深琥珀橙 #B46414)，不同透明度用 8 位十六进制 RRGGBBAA 表示
    traitActiveFull: '#1890FF',      // 100% 不透明 - 激活态
    traitActiveHover: '#1890FF99',   // 60% 不透明 (0x99 ≈ 153/255 ≈ 60%) - Hover 未激活态
    traitActiveInactive: '#1890FF66', // 40% 不透明 (0x66 ≈ 102/255 ≈ 40%) - 未激活态
    // 统计面板相关颜色
    statsCardBg: '#f0f4f8',         // 统计卡片背景
    statsCardBorder: '#e2e8f0',     // 统计卡片边框
    statsValueColor: '#2d3748',     // 统计数值颜色
    statsLabelColor: '#718096',     // 统计标签颜色
    statsIconColor: '#66ccff',      // 统计图标颜色
    championCost: {
        1: 'rgb(154, 164, 175)',
        2: 'rgb(0, 174, 10)',
        3: 'rgb(0, 147, 255)',
        4: 'rgb(229, 55, 162)',
        5: 'rgb(235, 156, 0)',
        7: 'rgb(219, 255, 195)',
        default: '#000000',
    }
};

// 喵~ 2. 这是我们新增的深色调色板！
const darkPalette = {
    primary: '#66ccff',
    primaryHover: '#80d4ff', // 深色模式下，悬停颜色可以亮一点
    navActiveBg: '#66ccff',
    navActiveText: '#0D1117',
    background: '#111827',
    sidebarBg: '#1F2937',
    cardBg: '#1F2937',          // 卡片背景色（比背景稍亮，形成层次）
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
    resizer: '#4B5563',        // 拖拽条的默认颜色
    resizerHover: '#66ccff',    // 鼠标悬停在拖拽条上时的颜色 (主色调)
    // 羁绊激活色 (深琥珀橙 #B46414)，不同透明度用 8 位十六进制 RRGGBBAA 表示
    traitActiveFull: '#B46414',      // 100% 不透明 - 激活态
    traitActiveHover: '#B4641499',   // 60% 不透明 (0x99 ≈ 153/255 ≈ 60%) - Hover 未激活态
    traitActiveInactive: '#B4641466', // 40% 不透明 (0x66 ≈ 102/255 ≈ 40%) - 未激活态
    // 统计面板相关颜色
    statsCardBg: '#1a2332',         // 统计卡片背景（比深色背景稍亮）
    statsCardBorder: '#2d3a4a',     // 统计卡片边框
    statsValueColor: '#e2e8f0',     // 统计数值颜色
    statsLabelColor: '#8899aa',     // 统计标签颜色
    statsIconColor: '#66ccff',      // 统计图标颜色
    championCost: {
        1: 'rgb(154, 164, 175)',
        2: 'rgb(0, 174, 10)',
        3: 'rgb(0, 147, 255)',
        4: 'rgb(229, 55, 162)',
        5: 'rgb(235, 156, 0)',
        7: 'rgb(219, 255, 195)',
        default: '#000000',
    }
};

// 喵~ 3. 这是两套主题共享的"设计规范"
const baseTheme = {
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
    sidebar: {
        width: 256,         // 侧边栏展开时的宽度 (px)
        collapsedWidth: 88, // 侧边栏收缩时的宽度 (px)
    },
};

// 喵~ 4. 创建 MUI 能理解的“双语”主题配置
const createMuiTheme = (palette: typeof lightPalette, mode: 'light' | 'dark'): ThemeOptions => ({
    palette: {
        mode,
        primary: {main: palette.primary},
        background: {default: palette.background, paper: palette.sidebarBg},
        text: {primary: palette.text, secondary: palette.textSecondary},
    },
});

// 喵~ 5. 组合并导出两套完整的主题！
export const lightTheme = {
    ...createTheme(createMuiTheme(lightPalette, 'light')),
    ...baseTheme,
    colors: lightPalette,
};

export const darkTheme = {
    ...createTheme(createMuiTheme(darkPalette, 'dark')),
    ...baseTheme,
    colors: darkPalette,
};

// 喵~ 导出一个统一的类型，方便我们在其他地方获得类型提示
export type ThemeType = typeof lightTheme;