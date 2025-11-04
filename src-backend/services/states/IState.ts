//  定义一个Istate接口，
 export interface IState {
    action:() => Promise<IState>,
}