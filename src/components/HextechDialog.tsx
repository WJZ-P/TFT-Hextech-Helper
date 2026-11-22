/**
 * 海克斯风格的提示弹窗
 * @description 参考云顶之弈客户端的弹窗：近黑底板 + 金边 + 古铜色确认按钮。
 *              只有一个"知道了"按钮，用于需要用户手动处理的提醒（比如切换窗口化）。
 *
 * 用法：
 *   <HextechDialog open={!!msg} title="标题" onClose={() => setMsg(null)}>
 *       提示内容
 *   </HextechDialog>
 */

import React from "react";
import styled from "styled-components";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {hextechButtonGold} from "../styles/hextech.ts";

/** 遮罩层：从标题栏下方开始，弹窗打开时窗口仍可拖动/关闭 */
const Overlay = styled.div`
  position: fixed;
  top: ${props => props.theme.titleBarHeight}px;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.colors.overlayBg};
`;

const Panel = styled.div`
  width: 420px;
  max-width: 90%;
  padding: 22px 26px 20px;
  text-align: center;
  background: ${props => props.theme.colors.dialogBg};
  border: 1px solid ${props => props.theme.colors.gold}b3;
  border-radius: ${props => props.theme.borderRadius};
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.7),
    inset 0 0 0 3px ${props => props.theme.colors.goldDeep}80,
    0 20px 60px rgba(0, 0, 0, 0.6);
`;

const Title = styled.h2`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: ${props => props.theme.colors.goldBright};

  .MuiSvgIcon-root {
    font-size: 1.3rem;
    color: ${props => props.theme.colors.warning};
  }
`;

const Message = styled.div`
  margin-bottom: 20px;
  font-size: 0.9rem;
  line-height: 1.7;
  color: ${props => props.theme.colors.textSecondary};

  strong {
    color: ${props => props.theme.colors.goldBright};
  }
`;

const ConfirmButton = styled.button`
  ${hextechButtonGold};
  min-width: 140px;
  padding: 0.55rem 1.6rem;
`;

interface HextechDialogProps {
    /** 是否显示 */
    open: boolean;
    /** 标题 */
    title: string;
    /** 关闭弹窗（点击按钮或遮罩） */
    onClose: () => void;
    /** 确认按钮文字，默认"我知道了" */
    confirmText?: string;
    /** 提示内容 */
    children: React.ReactNode;
}

export const HextechDialog: React.FC<HextechDialogProps> = ({ open, title, onClose, confirmText = '我知道了', children }) => {
    if (!open) return null;

    return (
        <Overlay onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <Panel role="alertdialog" aria-labelledby="hextech-dialog-title">
                <Title id="hextech-dialog-title">
                    <WarningAmberIcon />
                    {title}
                </Title>
                <Message>{children}</Message>
                <ConfirmButton type="button" onClick={onClose} autoFocus>
                    {confirmText}
                </ConfirmButton>
            </Panel>
        </Overlay>
    );
};
