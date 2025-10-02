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

const DashboardPage = () => (
    <div className="p-5">
        <h1 className="text-3xl font-bold text-white">仪表盘</h1>
        <p className="mt-2 text-gray-400">这里是应用的主概览页面。</p>
    </div>
);

export default DashboardPage;