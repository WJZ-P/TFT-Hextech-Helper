import {createContext, useContext} from "react";

/** 所在页面当前是否正在显示（由 KeepAlivePages 提供） */
export const PageActiveContext = createContext(true);

/**
 * 所在页面当前是否正在显示
 * @description 页面切走后不会卸载，useEffect 的清理函数不会执行，
 *              轮询、全局监听之类的逻辑要用它来暂停和恢复
 */
export const usePageActive = () => useContext(PageActiveContext);
