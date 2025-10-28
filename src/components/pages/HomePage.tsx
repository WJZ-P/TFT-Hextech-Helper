import React, { useState } from 'react';
import styled from 'styled-components';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'; // 开始图标
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import {ThemeType} from "../../styles/theme.ts"; // 关闭图标

const PageWrapper = styled.div<{ theme: ThemeType }>`
  display: flex;
  flex-direction: column; // 垂直排列
  align-items: center; // 水平居中
  justify-content: center; // 垂直居中 (大致)
  padding: ${props => props.theme.spacing.large};
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  min-height: calc(100vh - 60px); // 假设你的布局有 60px 的头部或侧边栏，撑满剩余高度
  text-align: center; // 文本居中
`;

const Title = styled.h1<{ theme: ThemeType }>`
  font-size: 2.5rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.medium};
`;

const Description = styled.p<{ theme: ThemeType }>`
  font-size: 1.1rem;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: ${props => props.theme.spacing.large};
  max-width: 600px; // 限制描述宽度，使其更易读
`;

const ControlButton = styled.button<{ $isRunning: boolean; theme: ThemeType }>`
  display: inline-flex; // 使用 inline-flex 让图标和文字并排
  align-items: center; // 垂直居中图标和文字
  justify-content: center; // 水平居中内容
  gap: ${props => props.theme.spacing.small}; // 图标和文字间距
  padding: 0.8rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  border-radius: ${props => props.theme.borderRadius};
  cursor: pointer;
  transition: background-color 0.2s ease-in-out, transform 0.1s ease, box-shadow 0.2s ease;
  min-width: 150px; // 给按钮一个最小宽度

  // 根据 $isRunning 状态切换背景色和文字颜色
  background-color: ${props => props.$isRunning ? props.theme.colors.error : props.theme.colors.primary};
  color: ${props => props.theme.colors.textOnPrimary};

  &:hover {
    background-color: ${props => props.$isRunning ? '#D32F2F' : props.theme.colors.primaryHover}; // 悬停时加深颜色
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
    box-shadow: none;
  }

  // 图标样式
  .MuiSvgIcon-root {
    font-size: 1.4rem;
  }
`;

export const HomePage = () => {
  const [isRunning, setIsRunning] = useState(false); // false: 未开始, true: 运行中

  const handleToggle = () => {
    setIsRunning(prevState => !prevState);
    // 在这里添加你实际的开始/关闭逻辑
    if (!isRunning) {
      console.log("核心功能已启动！");
      // 调用启动功能的函数...
    } else {
      console.log("核心功能已关闭！");
      // 调用关闭功能的函数...
    }
  };

  return (
    <PageWrapper>
      <Title>欢迎使用</Title>
      <Description>
        海克斯科技，启动！
      </Description>
      <ControlButton onClick={handleToggle} $isRunning={isRunning}>
        {isRunning ? <StopCircleOutlinedIcon /> : <PlayCircleOutlineIcon />}
        {isRunning ? '关闭' : '开始'}
      </ControlButton>
    </PageWrapper>
  );
};