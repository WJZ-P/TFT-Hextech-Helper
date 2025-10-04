import styled from "styled-components";

const PageContaier = styled.div`
  padding: 2.5rem
`
const Title = styled.h1`
font-size: 2.25rem;
font-weight: 700;
color: #ffffff;
margin: 0;
`

const Subtitle=styled.p`
margin-top: 0.5rem;
color: #a0aec0;
font-size: 1.125rem;
`

const DashboardPage = () => (
    <PageContaier>
      <Title>仪表盘</Title>
      <Subtitle>这里是应用的主概览页面。</Subtitle>
        <button onClick={startAFK}>点我开始挂机</button>
    </PageContaier>
);

function startAFK(){
    console.log("开始挂坤。")
}

export default DashboardPage;