import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  MobileStepper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// -------------------------------------------------------------------
// ✨ 样式组件定义 (Styled Components) ✨
// -------------------------------------------------------------------

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
`;

const TourCard = styled(Paper)`
  width: 450px;
  padding: 32px;
  border-radius: 16px !important;
  position: relative;
  animation: ${fadeIn} 0.3s ease-out;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2) !important;
`;

const StepIconWrapper = styled(Box)`
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: linear-gradient(135deg, #1976d2 0%, #64b5f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: white;
  box-shadow: 0 8px 16px rgba(25, 118, 210, 0.2);
`;

// -------------------------------------------------------------------
// ✨ 引导步骤定义 ✨
// -------------------------------------------------------------------

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    title: '欢迎使用 TFT Hextech Helper',
    description: '这是一个基于 Electron 的云顶之弈挂机助手。在开始之前，让我们简单了解一下如何使用它。',
    icon: <Typography variant="h4">👋</Typography>,
  },
  {
    title: '选择您的游戏环境',
    description: '在“游戏设置”标签页中，您可以选择所在的区服（国服/美服）以及使用的客户端类型（电脑端/安卓模拟器）。',
    icon: <Typography variant="h4">🌐</Typography>,
  },
  {
    title: '智能排队与自动化',
    description: '在“自动化”标签页中，您可以设置排队随机间隔、定时停止等功能，让挂机过程更加模拟真人行为。',
    icon: <Typography variant="h4">🤖</Typography>,
  },
  {
    title: '全局快捷键控制',
    description: '默认使用 F1 键开启或关闭挂机，F2 键在当前对局结束后停止。您可以在设置中根据个人习惯进行修改。',
    icon: <Typography variant="h4">⌨️</Typography>,
  },
  {
    title: '一切就绪！',
    description: '配置完成后，回到首页选择您心仪的阵容，点击“开始挂机”即可。祝您上分愉快！',
    icon: <CheckCircleIcon sx={{ fontSize: 40 }} />,
  },
];

// -------------------------------------------------------------------
// ✨ React 组件 ✨
// -------------------------------------------------------------------

interface OnboardingTourProps {
  onComplete: () => void;
  onClose: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const maxSteps = steps.length;

  const handleNext = () => {
    if (activeStep === maxSteps - 1) {
      onComplete();
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  return (
    <Overlay>
      <TourCard elevation={24}>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <StepIconWrapper>
            {steps[activeStep].icon}
          </StepIconWrapper>
          
          <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
            {steps[activeStep].title}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6, px: 2 }}>
            {steps[activeStep].description}
          </Typography>
        </Box>

        <MobileStepper
          variant="dots"
          steps={maxSteps}
          position="static"
          activeStep={activeStep}
          sx={{ 
            bgcolor: 'transparent', 
            flexGrow: 1,
            px: 0,
            '& .MuiMobileStepper-dot': {
              width: 10,
              height: 10,
              mx: 0.8
            }
          }}
          nextButton={
            <Button
              variant="contained"
              size="large"
              onClick={handleNext}
              sx={{ borderRadius: '12px', px: 4, py: 1 }}
              endIcon={activeStep === maxSteps - 1 ? null : <ArrowForwardIcon />}
            >
              {activeStep === maxSteps - 1 ? '开始体验' : '下一步'}
            </Button>
          }
          backButton={
            <Button
              size="large"
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{ borderRadius: '12px', visibility: activeStep === 0 ? 'hidden' : 'visible' }}
              startIcon={<ArrowBackIcon />}
            >
              上一步
            </Button>
          }
        />
      </TourCard>
    </Overlay>
  );
};

export default OnboardingTour;
