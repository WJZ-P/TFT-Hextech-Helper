import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Button,
  Box,
  MobileStepper,
  IconButton,
  Card,
  CardContent,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SettingsIcon from '@mui/icons-material/Settings';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const AnimatedContent = styled.div`
  animation: ${fadeIn} 0.5s ease-out;
`;

const steps = [
  {
    label: '欢迎使用 TFT Hextech Helper',
    description: '这是一款为您打造的云顶之弈自动化助手。让我们花一分钟了解如何快速上手。',
    icon: <AutoFixHighIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
  },
  {
    label: '配置您的游戏环境',
    description: '在设置页面，您可以选择区服（国服/美服）和客户端类型。记得以管理员身份运行软件，并将游戏语言设为简体中文。',
    icon: <SettingsIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
  },
  {
    label: '开启全自动挂机',
    description: '选择您心仪的阵容，点击“开始挂机”或按下 F1 键。助手的智能引擎将接管局内的购买、升人口和装备分配。',
    icon: <PlayArrowIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
  },
  {
    label: '安全与隐私',
    description: '我们重视您的账号安全。建议在设置中开启“排队随机间隔”，模拟真人行为，让挂机更自然。',
    icon: <VerifiedUserIcon sx={{ fontSize: 60, color: 'primary.main' }} />,
  },
];

interface OnboardingTourProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ open, onClose, onComplete }) => {
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          p: 2,
          bgcolor: 'background.paper',
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))',
        },
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          新手指南
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', py: 4 }}>
          <AnimatedContent key={activeStep}>
            <Box sx={{ mb: 4 }}>
              {steps[activeStep].icon}
            </Box>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              {steps[activeStep].label}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ px: 4 }}>
              {steps[activeStep].description}
            </Typography>
          </AnimatedContent>
        </Box>
        <MobileStepper
          variant="dots"
          steps={maxSteps}
          position="static"
          activeStep={activeStep}
          sx={{ bgcolor: 'transparent', flexGrow: 1 }}
          nextButton={
            <Button
              size="large"
              onClick={handleNext}
              variant="contained"
              sx={{ borderRadius: 2, px: 4 }}
            >
              {activeStep === maxSteps - 1 ? '开始使用' : '下一步'}
            </Button>
          }
          backButton={
            <Button
              size="large"
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{ borderRadius: 2 }}
            >
              上一步
            </Button>
          }
        />
      </DialogContent>
    </Dialog>
  );
};
