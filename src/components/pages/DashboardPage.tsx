import styled from "styled-components";
import {Queue} from "../../../src-backend/lcu/utils/Protocols.ts";

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

const DashboardPage = () => (
    <PageContaier>
        <Title>仪表盘</Title>
        <Subtitle>这里是应用的主概览页面。</Subtitle>
        <button onClick={getSummonerInfo}>获取当前召唤师信息</button>
        <button onClick={async () => {
            console.log(await window.lcu.createLobbyByQueueId(Queue.URF))
        }}>点我创建房间
        </button>
        <button onClick={async () => {
            console.log(await window.lcu.getCurrentGamemodeInfo())
        }}>点我获取当前房间信息
        </button>
    </PageContaier>
);

async function getSummonerInfo() {
    console.log(await window.lcu.getSummonerInfo())
}

export default DashboardPage;