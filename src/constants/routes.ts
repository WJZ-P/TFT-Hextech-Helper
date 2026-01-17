/**
 * 路由路径枚举 - 统一管理所有导航路径，避免硬编码
 * 
 * 使用枚举的好处：
 * 1. 修改路径时只需改这一处，其他地方自动同步
 * 2. 类型安全，IDE 自动补全
 * 3. 避免拼写错误
 */
export enum RoutePath {
    HOME = '/',
    LINEUPS = '/lineups',
    DEBUG = '/debug',
    SETTINGS = '/settings',
}
