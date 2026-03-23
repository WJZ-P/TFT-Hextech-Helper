import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
    Box,
    Typography,
    Paper,
    Tabs,
    Tab,
    Switch,
    FormControl,
    Select,
    MenuItem,
    Button,
    TextField,
    Divider,
    Link,
    Card,
    CardContent,
} from '@mui/material';

import SettingsRemoteIcon from '@mui/icons-material/SettingsRemote';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import MonitorIcon from '@mui/icons-material/Monitor';
import HistoryIcon from '@mui/icons-material/History';
import SaveIcon from '@mui/icons-material/Save';
import GitHubIcon from '@mui/icons-material/GitHub';
import UpdateIcon from '@mui/icons-material/Update';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DeveloperModeIcon from '@mui/icons-material/DeveloperMode';

import OnboardingTour from './OnboardingTour.tsx';
import { toast } from "../toast/toast-core.ts";
import { logStore, LogAutoCleanThreshold } from "../../stores/logStore.ts";
import { settingsStore } from "../../stores/settingsStore.ts";
import type { GameRegion, GameClient } from "../../types/GameTypes.ts";

// -------------------------------------------------------------------
// ✨ 样式组件定义 (Styled Components) ✨
// -------------------------------------------------------------------

const PageWrapper = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f5f7fa;
`;

const ContentArea = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

const HotkeyBox = styled(Box)<{ $isRecording: boolean }>`
  background-color: ${props => props.$isRecording ? '#e3f2fd' : '#fff'};
  border: 1px solid ${props => props.$isRecording ? '#1976d2' : '#dcdfe6'};
  border-radius: 4px;
  padding: 8px 16px;
  min-width: 120px;
  text-align: center;
  cursor: pointer;
  font-family: monospace;
  font-weight: bold;
  color: ${props => props.$isRecording ? '#1976d2' : '#303133'};
  transition: all 0.2s;
  &:hover {
    border-color: #1976d2;
  }
`;

// -------------------------------------------------------------------
// ✨ 工具函数 ✨
// -------------------------------------------------------------------

function keyEventToAccelerator(e: KeyboardEvent): string | null {
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');
    let key = e.key;
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return null;
    const keyMap: Record<string, string> = {
        ' ': 'Space', 'ArrowUp': 'Up', 'ArrowDown': 'Down', 'ArrowLeft': 'Left', 'ArrowRight': 'Right', 'Escape': 'Esc',
    };
    if (keyMap[key]) key = keyMap[key];
    else if (key.length === 1) key = key.toUpperCase();
    parts.push(key);
    return parts.join('+');
}

// -------------------------------------------------------------------
// ✨ React 组件 ✨
// -------------------------------------------------------------------

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ py: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const SettingsPage = () => {
    const [tabValue, setTabValue] = useState(0);

    // 状态管理
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [logThreshold, setLogThreshold] = useState<LogAutoCleanThreshold>(logStore.getThreshold());
    const [toggleHotkey, setToggleHotkey] = useState('F1');
    const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
    const [stopHk, setStopHk] = useState('F2');
    const [isRecordingStopHk, setIsRecordingStopHk] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [showOverlay, setShowOverlay] = useState(true);
    const [region, setRegion] = useState<GameRegion>('CN');
    const [client, setClient] = useState<GameClient>('RIOT_PC');
    const [appVersion, setAppVersion] = useState('');
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [stopTime, setStopTime] = useState('');
    const [stopIso, setStopIso] = useState<string | null>(null);
    const [delayEnabled, setDelayEnabled] = useState(false);
    const [delayMin, setDelayMin] = useState(0);
    const [delayMax, setDelayMax] = useState(0);
    const [timeoutEnabled, setTimeoutEnabled] = useState(false);
    const [timeoutMins, setTimeoutMins] = useState(5);
    const [onboardingCompleted, setOnboardingCompleted] = useState(true);

    useEffect(() => {
        const init = async () => {
            await logStore.refreshThreshold();
            setLogThreshold(logStore.getThreshold());
            setToggleHotkey(await window.util.getToggleHotkey());
            setStopHk(await window.util.getStopAfterGameHotkey());
            await settingsStore.init();
            setShowDebug(settingsStore.getShowDebugPage());
            setShowOverlay(await window.settings.get<boolean>('showOverlay'));
            setRegion(settingsStore.getGameRegion());
            setClient(settingsStore.getGameClient());
            setAppVersion(await window.util.getAppVersion());
            setOnboardingCompleted(settingsStore.getOnboardingCompleted());
            const savedStop = await window.hex.getScheduledStop();
            if (savedStop) {
                setStopIso(savedStop);
                const d = new Date(savedStop);
                setStopTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
            }
            const delay = await window.settings.get<any>('queueRandomDelay');
            if (delay) {
                setDelayEnabled(delay.enabled);
                setDelayMin(delay.minSeconds);
                setDelayMax(delay.maxSeconds);
            }
            const timeout = await window.settings.get<any>('queueTimeout');
            if (timeout) {
                setTimeoutEnabled(timeout.enabled);
                setTimeoutMins(timeout.minutes);
            }
        };
        init();
        const sub = settingsStore.subscribe(s => {
            setShowDebug(s.showDebugPage);
            setRegion(s.gameRegion);
            setClient(s.gameClient);
            setOnboardingCompleted(s.onboardingCompleted);
        });
        const cleanupStop = window.hex.onScheduledStopTriggered(() => setStopIso(null));
        return () => { sub(); cleanupStop(); };
    }, []);

    const handleTabChange = (_: any, newValue: number) => setTabValue(newValue);

    const handleHotkeyKeyDown = useCallback(async (e: KeyboardEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.key === 'Escape') {
            if (await window.util.setToggleHotkey('')) { setToggleHotkey(''); toast.success('已取消'); }
            setIsRecordingHotkey(false); return;
        }
        const acc = keyEventToAccelerator(e);
        if (!acc) return;
        if (acc === toggleHotkey) { setIsRecordingHotkey(false); return; }
        if (acc === stopHk) { toast.error('冲突'); setIsRecordingHotkey(false); return; }
        if (await window.util.setToggleHotkey(acc)) { setToggleHotkey(acc); toast.success(`已设置 ${acc}`); }
        setIsRecordingHotkey(false);
    }, [toggleHotkey, stopHk]);

    const handleStopHkKeyDown = useCallback(async (e: KeyboardEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.key === 'Escape') {
            if (await window.util.setStopAfterGameHotkey('')) { setStopHk(''); toast.success('已取消'); }
            setIsRecordingStopHk(false); return;
        }
        const acc = keyEventToAccelerator(e);
        if (!acc) return;
        if (acc === stopHk) { setIsRecordingStopHk(false); return; }
        if (acc === toggleHotkey) { toast.error('冲突'); setIsRecordingStopHk(false); return; }
        if (await window.util.setStopAfterGameHotkey(acc)) { setStopHk(acc); toast.success(`已设置 ${acc}`); }
        setIsRecordingStopHk(false);
    }, [toggleHotkey, stopHk]);

    useEffect(() => {
        if (isRecordingHotkey) { window.addEventListener('keydown', handleHotkeyKeyDown); return () => window.removeEventListener('keydown', handleHotkeyKeyDown); }
        if (isRecordingStopHk) { window.addEventListener('keydown', handleStopHkKeyDown); return () => window.removeEventListener('keydown', handleStopHkKeyDown); }
        return undefined;
    }, [isRecordingHotkey, isRecordingStopHk, handleHotkeyKeyDown, handleStopHkKeyDown]);


    const handleToggleDebug = async () => {
        const val = !showDebug;
        await settingsStore.setShowDebugPage(val);
        toast.success(val ? '开启调试' : '隐藏调试');
    };

    const handleToggleOverlay = async () => {
        const val = !showOverlay;
        setShowOverlay(val);
        await window.settings.set('showOverlay', val);
        toast.success(val ? '开启浮窗' : '关闭浮窗');
    };

    const handleRegionChange = async (val: GameRegion) => {
        setRegion(val);
        await settingsStore.setGameRegion(val);
        toast.success(`切换到 ${val}`);
    };

    const handleClientChange = async (val: GameClient) => {
        setClient(val);
        await settingsStore.setGameClient(val);
        toast.success(`切换到 ${val}`);
    };

    const handleBackup = async () => {
        setIsBackingUp(true);
        if (await window.config.backup()) toast.success('备份成功');
        else toast.error('备份失败');
        setIsBackingUp(false);
    };

    const handleRestore = async () => {
        setIsRestoring(true);
        if (await window.config.restore()) toast.success('恢复成功');
        else toast.error('恢复失败');
        setIsRestoring(false);
    };

    const handleToggleScheduledStop = async () => {
        if (stopIso) { await window.hex.clearScheduledStop(); setStopIso(null); toast.success('已取消'); }
        else {
            if (!stopTime) { toast.error('请选择时间'); return; }
            try { const iso = await window.hex.setScheduledStop(stopTime); setStopIso(iso); toast.success('已设置'); }
            catch (e: any) { toast.error(e.message); }
        }
    };

    const handleToggleDelay = async () => {
        const enabled = !delayEnabled;
        if (enabled && (delayMax < delayMin || delayMax <= 0)) { toast.error('范围无效'); return; }
        setDelayEnabled(enabled);
        await window.settings.set('queueRandomDelay', { enabled, minSeconds: delayMin, maxSeconds: delayMax });
    };

    const handleToggleTimeout = async () => {
        const enabled = !timeoutEnabled;
        if (enabled && timeoutMins <= 0) { toast.error('时长无效'); return; }
        setTimeoutEnabled(enabled);
        await window.settings.set('queueTimeout', { enabled, minutes: timeoutMins });
    };

    const handleCheckUpdate = async () => {
        setIsCheckingUpdate(true);
        try {
            const res = await window.util.checkUpdate();
            if (res.hasUpdate) { toast.success('有更新'); window.open(res.releaseUrl, '_blank'); }
            else toast.success('最新版');
        } catch { toast.error('失败'); }
        finally { setIsCheckingUpdate(false); }
    };

    const handleRestartTour = async () => {
        await settingsStore.setOnboardingCompleted(false);
        toast.success('新手引导已重置');
    };

    const handleTourComplete = async () => {
        await settingsStore.setOnboardingCompleted(true);
        toast.success('新手引导完成，开启上分之旅！');
    };

    const handleTourClose = () => {
        // Just close it for now, can be restarted later
        setOnboardingCompleted(true);
    };

    return (
        <PageWrapper>
            {!onboardingCompleted && (
                <OnboardingTour onComplete={handleTourComplete} onClose={handleTourClose} />
            )}
            <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 1, bgcolor: '#fff' }}>
                <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>设置</Typography>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
                    <Tab icon={<MonitorIcon />} iconPosition="start" label="游戏设置" />
                    <Tab icon={<AutoFixHighIcon />} iconPosition="start" label="自动化" />
                    <Tab icon={<HistoryIcon />} iconPosition="start" label="高级/日志" />
                    <Tab icon={<HelpOutlineIcon />} iconPosition="start" label="关于" />
                </Tabs>
            </Paper>

            <ContentArea>
                {/* 游戏设置 */}
                <TabPanel value={tabValue} index={0}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <SettingsRemoteIcon color="primary" sx={{ mr: 1 }} />
                                        <Typography variant="h6" fontWeight="bold">区域与平台</Typography>
                                    </Box>
                                    <Divider sx={{ mb: 3 }} />
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">游戏区服</Typography>
                                            <Typography variant="body2" color="text.secondary">选择您账号所在的区服。</Typography>
                                        </Box>
                                        <FormControl size="small" sx={{ minWidth: 200 }}>
                                            <Select value={region} onChange={(e) => handleRegionChange(e.target.value as GameRegion)}>
                                                <MenuItem value="CN">国服（CN）</MenuItem>
                                                <MenuItem value="NA">美服（NA）</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">客户端类型</Typography>
                                            <Typography variant="body2" color="text.secondary">选择当前使用的游戏客户端。</Typography>
                                        </Box>
                                        <FormControl size="small" sx={{ minWidth: 200 }}>
                                            <Select value={client} onChange={(e) => handleClientChange(e.target.value as GameClient)}>
                                                <MenuItem value="RIOT_PC">电脑端 (Riot Client)</MenuItem>
                                                <MenuItem value="ANDROID">安卓端 (模拟器/投屏)</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>
                                </CardContent>
                            </Card>

                            <Card variant="outlined">
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <MonitorIcon color="primary" sx={{ mr: 1 }} />
                                        <Typography variant="h6" fontWeight="bold">界面显示</Typography>
                                    </Box>
                                    <Divider sx={{ mb: 3 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">启用游戏浮窗</Typography>
                                            <Typography variant="body2" color="text.secondary">在游戏界面显示真人/人机信息提示。</Typography>
                                        </Box>
                                        <Switch checked={showOverlay} onChange={handleToggleOverlay} />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                </TabPanel>

                {/* 自动化 */}
                <TabPanel value={tabValue} index={1}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <AutoFixHighIcon color="primary" sx={{ mr: 1 }} />
                                        <Typography variant="h6" fontWeight="bold">智能流程控制</Typography>
                                    </Box>
                                    <Divider sx={{ mb: 3 }} />
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">定时停止挂机</Typography>
                                            <Typography variant="body2" color="text.secondary">到达设定时间后，在本局结束后自动停止。</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <TextField
                                                type="time"
                                                size="small"
                                                value={stopTime}
                                                onChange={(e) => setStopTime(e.target.value)}
                                                disabled={!!stopIso}
                                                sx={{ width: 130 }}
                                            />
                                            <Switch checked={!!stopIso} onChange={handleToggleScheduledStop} />
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">排队随机间隔</Typography>
                                            <Typography variant="body2" color="text.secondary">在每局开始前随机等待，模拟真人行为。</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <TextField type="number" size="small" value={delayMin} onChange={(e) => setDelayMin(Number(e.target.value))} disabled={delayEnabled} sx={{ width: 70 }} />
                                            <Typography>~</Typography>
                                            <TextField type="number" size="small" value={delayMax} onChange={(e) => setDelayMax(Number(e.target.value))} disabled={delayEnabled} sx={{ width: 70 }} />
                                            <Typography sx={{ mr: 1 }}>秒</Typography>
                                            <Switch checked={delayEnabled} onChange={handleToggleDelay} />
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">排队超时自动重排</Typography>
                                            <Typography variant="body2" color="text.secondary">长时间匹配不到人时，自动退出房间重试。</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <TextField type="number" size="small" value={timeoutMins} onChange={(e) => setTimeoutMins(Number(e.target.value))} disabled={timeoutEnabled} sx={{ width: 80 }} />
                                            <Typography sx={{ mr: 1 }}>分钟</Typography>
                                            <Switch checked={timeoutEnabled} onChange={handleToggleTimeout} />
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>

                            <Card variant="outlined">
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">全局快捷键</Typography>
                                    </Box>
                                    <Divider sx={{ mb: 3 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">开始/停止挂机</Typography>
                                            <Typography variant="body2" color="text.secondary">随时切换自动挂机状态。</Typography>
                                        </Box>
                                        <HotkeyBox $isRecording={isRecordingHotkey} onClick={() => setIsRecordingHotkey(true)}>
                                            {isRecordingHotkey ? '按下按键...' : (toggleHotkey || '未绑定')}
                                        </HotkeyBox>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">本局结束后停止</Typography>
                                            <Typography variant="body2" color="text.secondary">仅在当前对局结束后停止。</Typography>
                                        </Box>
                                        <HotkeyBox $isRecording={isRecordingStopHk} onClick={() => setIsRecordingStopHk(true)}>
                                            {isRecordingStopHk ? '按下按键...' : (stopHk || '未绑定')}
                                        </HotkeyBox>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                </TabPanel>

                {/* 高级设置/日志 */}
                <TabPanel value={tabValue} index={2}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <HistoryIcon color="primary" sx={{ mr: 1 }} />
                                        <Typography variant="h6" fontWeight="bold">日志管理</Typography>
                                    </Box>
                                    <Divider sx={{ mb: 3 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">日志自动清理</Typography>
                                            <Typography variant="body2" color="text.secondary">超过阈值后自动删除旧日志以优化性能。</Typography>
                                        </Box>
                                        <FormControl size="small" sx={{ minWidth: 150 }}>
                                            <Select value={logThreshold} onChange={(e) => {
                                                const v = Number(e.target.value) as LogAutoCleanThreshold;
                                                setLogThreshold(v); logStore.setThreshold(v);
                                            }}>
                                                <MenuItem value={0}>从不</MenuItem>
                                                <MenuItem value={200}>200条</MenuItem>
                                                <MenuItem value={500}>500条</MenuItem>
                                                <MenuItem value={1000}>1000条</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>
                                </CardContent>
                            </Card>

                            <Card variant="outlined">
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <SaveIcon color="primary" sx={{ mr: 1 }} />
                                        <Typography variant="h6" fontWeight="bold">游戏配置备份</Typography>
                                    </Box>
                                    <Divider sx={{ mb: 3 }} />
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleBackup} disabled={isBackingUp}>备份当前设置</Button>
                                        <Button variant="outlined" startIcon={<HistoryIcon />} onClick={handleRestore} disabled={isRestoring}>恢复历史备份</Button>
                                    </Box>
                                </CardContent>
                            </Card>

                            <Card variant="outlined" sx={{ borderColor: 'warning.main' }}>
                                <CardContent>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <DeveloperModeIcon color="warning" sx={{ mr: 1 }} />
                                        <Typography variant="h6" fontWeight="bold">开发者模式</Typography>
                                    </Box>
                                    <Divider sx={{ mb: 3 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight="bold">显示调试面板</Typography>
                                            <Typography variant="body2" color="text.secondary">侧边栏将显示调试入口（仅限高级用户）。</Typography>
                                        </Box>
                                        <Switch checked={showDebug} onChange={handleToggleDebug} color="warning" />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Box>
                </TabPanel>


                {/* 关于 */}
                <TabPanel value={tabValue} index={3}>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Box sx={{ mb: 4 }}>
                            <img src="icon.png" alt="logo" width={100} height={100} style={{ borderRadius: 20 }} />
                            <Typography variant="h4" fontWeight="bold" sx={{ mt: 2 }}>TFT Hextech Helper</Typography>
                            <Typography color="text.secondary">Version {appVersion || 'Loading...'}</Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', mb: 6 }}>
                            <Button variant="outlined" startIcon={<GitHubIcon />} component={Link} href="https://github.com/WJZ-P/TFT-Hextech-Helper" target="_blank">
                                GitHub Star ⭐
                            </Button>
                            <Button variant="contained" startIcon={<UpdateIcon />} onClick={handleCheckUpdate} disabled={isCheckingUpdate}>
                                检查更新
                            </Button>
                            <Button variant="outlined" startIcon={<HelpOutlineIcon />} onClick={handleRestartTour}>
                                重新开启指南
                            </Button>
                        </Box>

                        <Paper variant="outlined" sx={{ p: 4, bgcolor: '#fafafa', borderRadius: 4 }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">📜 使用声明</Typography>
                            <Typography variant="body2" sx={{ maxWidth: 600, mx: 'auto', textAlign: 'left', color: 'text.secondary' }}>
                                1. 本项目仅供学习交流使用，禁止用于任何商业用途。<br />
                                2. 使用本软件产生的任何后果由用户自行承担。<br />
                                3. 管理员身份运行软件以确保控制功能正常。<br />
                                4. 推荐使用默认皮肤以提高 OCR 识别精度。
                            </Typography>
                        </Paper>

                        <Box sx={{ mt: 6 }}>
                            <Typography color="text.secondary">
                                Made with ❤️ by <Link href="https://github.com/WJZ-P" target="_blank" underline="hover" fontWeight="bold">WJZ_P</Link>
                            </Typography>
                        </Box>
                    </Box>
                </TabPanel>
            </ContentArea>
        </PageWrapper>
    );
};

export default SettingsPage;
