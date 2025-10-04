import { ipcRenderer, contextBridge } from 'electron'
import IpcRendererEvent = Electron.IpcRendererEvent;
import 'source-map-support/register';

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

const ipcApi= {
  on: (channel:string,callback:(...args:any[]) => void) =>{
    const listener =(_event:IpcRendererEvent,...args:any[]) =>{
      callback(...args)
    }
    //  监听指定频道
    ipcRenderer.on(channel,listener)
    //  返回一个清理函数
    return () => {
      ipcRenderer.removeListener(channel,listener)
    }
  }
}

export type IpcApi = typeof ipcApi

contextBridge.exposeInMainWorld('ipc',ipcApi)
