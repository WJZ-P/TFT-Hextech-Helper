export const theme = {
  colors: {
    // --- 核心色 ---
    primary: '#66ccff',       // 主色调 (天空蓝)，用于按钮、高亮、活动状态等
    primaryHover: '#33bbff',  // 主色调的悬停颜色，稍微深一点以提供反馈

    // --- 导航专用色 ---
    navActiveBg: '#66ccff',   // 喵~ 新增！导航项激活时的背景色 (当前与主色调相同)
    navActiveText: '#0D1117', // 喵~ 新增！导航项激活时的文字颜色 (为了对比度，使用深色)


    // --- 背景色 (由深到浅) ---
    background: '#111827',    // 最深的背景色 (深空蓝)，用于页面body
    sidebarBg: '#1F2937',     // 侧边栏/面板背景，比主背景稍浅
    elementBg: '#374151',     // 卡片、输入框等元素的背景色
    elementHover: '#4B5563',  // 元素悬停时的背景色

    // --- 文字色 (由亮到暗) ---
    text: '#F9FAFB',          // 主要文字颜色 (近白色)，保证可读性
    textSecondary: '#9CA3AF', // 次要文字颜色，用于副标题、提示信息等
    textDisabled: '#6B7280',   // 禁用状态的文字颜色
    textOnPrimary: '#0D1117', // 在主色调按钮上使用的文字颜色 (深色以保证对比度)

    // --- 边框和分割线 ---
    border: '#374151',        // 边框颜色
    divider: '#4B5563',       // 分割线颜色

    // --- 状态色 (用于提示) ---
    success: '#10B981',       // 成功状态 (绿色)
    warning: '#F59E0B',       // 警告状态 (黄色)
    error: '#EF4444',         // 错误状态 (红色)
  },
  spacing: {
    small: '0.5rem',  // 8px
    medium: '1rem',   // 16px
    large: '1.5rem',  // 24px
  },
  fontSizes: {
    small: '0.875rem', // 14px
    medium: '1rem',    // 16px
    large: '1.25rem',  // 20px
  },
  borderRadius: '8px',
};

export type ThemeType = typeof theme;