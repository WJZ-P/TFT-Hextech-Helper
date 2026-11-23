import {createTheme, ThemeOptions} from "@mui/material";

/**
 * 海克斯科技色板 —— 参考英雄联盟 / 云顶之弈客户端的"金边 + 深蓝"配色
 *
 * 喵~ 设计要点：
 *   - 底色是偏蓝的深灰黑，面板比底色稍亮，形成层次（比客户端纯黑底稍浅，没有背景图时不压抑）
 *   - 金色只用在边框、标题和重点装饰上，不大面积铺色
 *   - 蓝色是唯一的交互强调色（主按钮、选中、开关），青色用于描边发光
 *   - 圆角基本为 0，方角是客户端最明显的风格特征
 */
const hextechPalette = {
    // ---------- 海克斯专用色 ----------
    gold: '#C8AA6E',            // 主金：边框、图标、强调
    goldBright: '#F0E6D2',      // 亮米金：标题文字
    goldDim: '#785A28',         // 暗金：常规边框
    goldDeep: '#463714',        // 深金：分隔线、弱边框
    accentCyan: '#5BD3FF',      // 青蓝：主按钮描边、选中发光
    panelBg: 'linear-gradient(180deg, rgba(27, 40, 57, 0.78) 0%, rgba(20, 32, 48, 0.84) 100%)',   // 面板渐变底（半透明，透出背景图）
    dialogBg: 'linear-gradient(180deg, #1E2B3C 0%, #131D2A 100%)',  // 弹窗底板
    buttonBg: 'linear-gradient(180deg, #243245 0%, #19232F 100%)',  // 次要按钮底
    buttonBgHover: 'linear-gradient(180deg, #2C3D54 0%, #1E2A39 100%)',
    titleBarBg: 'rgba(11, 17, 25, 0.88)', // 自绘标题栏（半透明，透出背景图）
    overlayBg: 'rgba(6, 12, 20, 0.72)',   // 弹窗遮罩

    // ---------- 通用语义色（各页面通过这些 token 取色） ----------
    primary: '#2F8BFF',
    primaryHover: '#5AA5FF',
    navActiveBg: 'rgba(47, 139, 255, 0.16)',
    navActiveText: '#F0E6D2',
    background: '#121B27',
    sidebarBg: '#0D141E',
    sidebarGlassBg: 'rgba(13, 20, 30, 0.80)',  // 侧边栏本体（半透明，透出背景图）；sidebarBg 仍用于输入框等元素的实底
    cardBg: '#192535',          // 卡片背景色（比背景稍亮，形成层次）
    elementBg: '#1E2B3C',
    elementHover: '#26364A',
    text: '#E6DFD1',
    textSecondary: '#A09B8C',
    textDisabled: '#5B5A56',
    textOnPrimary: '#FFFFFF',
    border: '#3B3224',
    divider: '#2E3644',
    success: '#2BB673',
    warning: '#E8A33D',
    error: '#E84057',
    resizer: '#3C3C41',        // 拖拽条的默认颜色
    resizerHover: '#C8AA6E',    // 鼠标悬停在拖拽条上时的颜色（金色）
    // 羁绊激活色（金色），不同透明度用 8 位十六进制 RRGGBBAA 表示
    traitActiveFull: '#C89B3C',      // 100% 不透明 - 激活态
    traitActiveHover: '#C89B3C99',   // 60% 不透明 (0x99 ≈ 153/255 ≈ 60%) - Hover 未激活态
    traitActiveInactive: '#C89B3C66', // 40% 不透明 (0x66 ≈ 102/255 ≈ 40%) - 未激活态
    // 统计面板相关颜色
    statsCardBg: '#172231',         // 统计卡片背景
    statsCardBorder: '#3B3224',     // 统计卡片边框
    statsValueColor: '#F0E6D2',     // 统计数值颜色
    statsLabelColor: '#A09B8C',     // 统计标签颜色
    statsIconColor: '#5BD3FF',      // 统计图标颜色
    championCost: {
        1: 'rgb(154, 164, 175)',
        2: 'rgb(0, 174, 10)',
        3: 'rgb(0, 147, 255)',
        4: 'rgb(229, 55, 162)',
        5: 'rgb(235, 156, 0)',
        7: 'rgb(219, 255, 195)',
        default: '#5B5A56',
    }
};

// 喵~ 设计规范（间距、字号、圆角、侧边栏尺寸）
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
    borderRadius: '2px',
    titleBarHeight: 32,     // 自绘标题栏高度 (px)
    sidebar: {
        width: 256,         // 侧边栏展开时的宽度 (px)
        collapsedWidth: 88, // 侧边栏收缩时的宽度 (px)
    },
};

// 喵~ 创建 MUI 能理解的主题配置（MUI 组件也跟着走深色）
const createMuiTheme = (palette: typeof hextechPalette): ThemeOptions => ({
    palette: {
        mode: 'dark',
        primary: {main: palette.primary},
        background: {default: palette.background, paper: palette.cardBg},
        text: {primary: palette.text, secondary: palette.textSecondary},
    },
});

// 喵~ 导出海克斯主题（全应用唯一主题）
export const hextechTheme = {
    ...createTheme(createMuiTheme(hextechPalette)),
    ...baseTheme,
    colors: hextechPalette,
};

// 喵~ 导出一个统一的类型，方便我们在其他地方获得类型提示
export type ThemeType = typeof hextechTheme;
