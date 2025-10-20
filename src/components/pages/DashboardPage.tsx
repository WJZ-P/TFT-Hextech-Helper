import styled from "styled-components";
import {Queue} from "../../../src-backend/lcu/utils/LCUProtocols.ts";
import {toast} from "../toast/toast-core.ts";

const PageContaier = styled.div`
  padding: 2.5rem
`
const Title = styled.h1`
  font-size: 2.25rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
`

const Subtitle = styled.p`
  margin-top: 0.5rem;
  color: #a0aec0;
  font-size: 1.125rem;
`

const DashboardPage = () => {
    return (
        <PageContaier>
            <Title>仪表盘</Title>
            <Subtitle>这里是应用的主概览页面。</Subtitle>
            <button onClick={getSummonerInfo}>获取当前召唤师信息</button>
            <button onClick={async () => {
                console.log(await window.lcu.createLobbyByQueueId(901))
            }}>点我创建房间
            </button>
            <button onClick={async () => {
                console.log(await window.lcu.getCurrentGamemodeInfo())
            }}>点我获取当前房间信息
            </button>
            <button onClick={async () => {
                console.log(await window.lcu.startMatch())
            }}>点我开始匹配对局
            </button>
            <button onClick={async () => {
                console.log(await window.lcu.checkMatchState())
            }}>点我检查排队状态
            </button>
            <button onClick={async () => {
                console.log(await window.lcu.getCustomGames())
            }}>点我获取所有自定义房间
            </button>
            <button onClick={async () => {
                const queues: any = await window.lcu.getQueues()
                for (const queue of queues) {
                    // 3. 打印出我们关心的属性
                    console.log(`--- [ ${queue.name || '无名模式'} (ID: ${queue.id}) ] ---`);
                    console.log(`   🔸 详细描述 (detailedDescription): ${queue.detailedDescription || '无'}`);
                    console.log(`   🔸 可用状态 (queueAvailability): ${queue.queueAvailability}`);
                    console.log(''); // 打印一个空行，让格式更清晰
                }
            }}>获取所有游戏模式
            </button>
            <button onClick={async () => {
                console.log(await window.lcu.getChatConfig());
            }}>获取聊天config
            </button>
            <button onClick={async () => {
                console.log(await window.lcu.testFunc());
            }}>测试功能
            </button>
            <button onClick={async () => {
                console.log(await window.lcu.getChampSelectSession());
            }}>获取当前英雄选择的session信息
            </button>
            <button onClick={async () => {
                console.log(await window.lcu.getChatConversations());
            }}>获取ChatConversations
            </button>
            <button onClick={async () => {
                console.log(await window.lcu.getGameflowSession());
            }}>gameflow的session
            </button>
            <button onClick={async () => {
                console.log(await window.lcu.getExtraGameClientArgs());
            }}>获取gameClient的args
            </button>
            <button onClick={async () => {
                console.log(await window.lcu.getLobby());
            }}>getLobby
            </button>
            <button onClick={async () => {
                toast("我是一个超级弹窗！",{type:"success"})
            }}>点我弹出一个Toast
            </button>
        </PageContaier>
    );
}
async function getSummonerInfo() {
    console.log(await window.lcu.getSummonerInfo())
}

export default DashboardPage;