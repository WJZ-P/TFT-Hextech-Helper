# TFT-Hextech-Helper —— 云顶之弈挂机小助手

<!-- PROJECT SHIELDS -->

<br>

<div align="center">

  <a href="https://github.com/WJZ-P/TFT-Hextech-Helper/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/WJZ-P/TFT-Hextech-Helper.svg?style=flat-square" alt="Contributors" style="height: 30px">
  </a>
  &nbsp;
  <a href="https://github.com/WJZ-P/TFT-Hextech-Helper/network/members">
    <img src="https://img.shields.io/github/forks/WJZ-P/TFT-Hextech-Helper.svg?style=flat-square" alt="Forks" style="height: 30px">
  </a>
  &nbsp;
  <a href="https://github.com/WJZ-P/TFT-Hextech-Helper/stargazers">
    <img src="https://img.shields.io/github/stars/WJZ-P/TFT-Hextech-Helper.svg?style=flat-square" alt="Stargazers" style="height: 30px">
  </a>
  &nbsp;
  <a href="https://img.shields.io/github/issues/WJZ-P/TFT-Hextech-Helper.svg">
    <img src="https://img.shields.io/github/issues/WJZ-P/TFT-Hextech-Helper.svg?style=flat-square" alt="Issues" style="height: 30px">
  </a>
  &nbsp;
  <a href="https://github.com/WJZ-P/TFT-Hextech-Helper/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/WJZ-P/TFT-Hextech-Helper.svg?style=flat-square" alt="MIT License" style="height: 30px">
  </a>

</div>

<br><br>

<!-- PROJECT LOGO -->

<p align="center">
  <a href="https://github.com/WJZ-P/TFT-Hextech-Helper/">
    <img src="public/icon.png" alt="Logo" width="150" height="150" style="margin: 0; border-radius: 24px;">
  </a>
  <h1 align="center">TFT Hextech Helper</h1>
  <p align="center">
    <br>
    <a href="https://github.com/WJZ-P/TFT-Hextech-Helper">查看Demo</a>
    ·
    <a href="https://github.com/WJZ-P/TFT-Hextech-Helper/issues">报告Bug</a>
    ·
    <a href="https://github.com/WJZ-P/TFT-Hextech-Helper/issues">提出新特性</a>
  </p>
</p>

<p align="center">
  <a href="https://www.bilibili.com/video/BV1vx4y1t7rH">
    <img src="markdown/深蓝雨.jpg" alt="深蓝雨">
  </a>
</p>
<h2 align="center">"尽握在手沉重的花束名誉&nbsp;沾着泥土的指尖始终&nbsp;怯于靠近&nbsp;那脸庞遥不可及"</h2>

## 目录

- [TFT Hextech Helper](#tft-hextech-helper)
    - [目录](#目录)
    - [项目简介](#项目简介)
    - [功能特性](#功能特性)
    - [使用教程](#使用教程)
    - [获取更新](#获取更新)
    - [交流渠道](#交流渠道)
    - [技术栈](#技术栈)
    - [版权说明](#版权说明)
    - [鸣谢](#鸣谢)
    - [重要声明](#重要声明)

## 项目简介

TFT Hextech Helper 是一款基于 Electron + React + TypeScript 开发的云顶之弈自动下棋助手。它可以帮助你在云顶之弈(包括S16英雄联盟传奇、S4.5瑞兽闹新春、发条鸟的试炼)中自动进行对局，解放你的双手，让你可以边挂机边做其他事情。（当然挂机的时候你就不能玩电脑了，因为软件会使用你的鼠标！）

当前版本支持按区服/客户端切换：
- **区服**：国服（CN）/ 美服（NA）
- **客户端**：安卓端（模拟器/投屏，手动开局）/ 电脑端 Riot Client（自动建房与排队）

<p align="center">
  <img src="markdown/项目示意图.png" alt="软件截图" width="80%">
</p>

## ⚠️ 注意事项

- **必须以管理员身份运行**，否则无法正常控制游戏
- **游戏语言必须设置为简体中文**，否则软件无法正确识别棋子
- **推荐使用默认棋盘皮肤**，已针对默认棋盘优化，能加快棋子识别速度
- 支持**Windows & MacOS**
- ✅ 已支持国服（CN）与美服（NA）基础流程。
- ✅ 已新增客户端类型：安卓端（手动开局）与电脑端 Riot Client（自动排队）。

## 功能特性

- 🎮 **自动下棋** - 智能识别游戏状态，自动购买英雄、整理阵容
- 🎯 **阵容推荐** - 内置多套热门阵容配置，一键选择
- ⌨️ **快捷键控制** - F1 开启/关闭挂机，F2 本局结束后停止
- 🎨 **现代化界面** - 美观的 UI 设计，超级酷
- 📊 **实时日志** - 查看详细的运行日志，了解程序状态
 - 🧭 **OCR 优化提升** - OCR 识别速度提升约 31.6%，提高文本识别和区域定位的稳定性
 - 📈 **策略有效性跟踪** - 实时跟踪并在界面显示不同阵容/策略的有效性指标，帮助你评估选择
 - 💡 **帮助模态 (F1)** - 按 F1 打开帮助覆盖层，提供快捷操作提示、常见问题和基础使用指南

## Phase 3 Features

- Beta program opt-in for debugging features (调试功能的 Beta 计划入口)
- OCR retry with exponential backoff (auto-recovery)（OCR 重试，指数退避实现）
- Data deletion option in privacy settings（隐私设置中的数据删除选项）
- Type safety improvements（类型安全改进）

## 使用教程

### 1. 下载并安装

从 [Release](https://github.com/WJZ-P/TFT-Hextech-Helper/releases) 页面下载最新版本：
- **安装版** (.exe setup) - 不推荐，走正常软件安装流程，会留注册表
- **便携版** (.zip) - 推荐，解压即用，无需安装

**或点击右侧高速下载**：[TFT-Hextech-Helper-1.0.0-win.zip](https://static1.keepcdn.com/user-avatar/2026/01/17/22/6943f6affbbe480001c744e2/ciallo/82672950ad9b996250910d6919e85631_TFT-Hextech-Helper-1.0.0-win.zip)

- 最新打包与安装也可通过源码打包获得发行包。若你在本地从源码打包，请在项目根目录执行以下步骤：
  1) 运行 `npm install` 安装依赖
  2) 运行 `npm run dist` 进行打包，产物将输出到 dist/ 目录（针对不同平台会生成相应的 dist/win、dist/mac、dist/linux 子目录）


### 2. 启动软件

> ⚠️ **重要**：本软件需要**以管理员身份运行**才能正常工作！目前只支持Windows系统运行。

<p align="center">
  <img src="markdown/软件首页.png" alt="软件截图" width="80%">
</p>

### 3. 选择区服与客户端类型

在 **设置 → 区域与客户端** 中先完成选择：

- **国服（CN）+ 电脑端（Riot Client）**：默认全自动流程
- **美服（NA）+ 电脑端（Riot Client）**：全自动流程（建房 / 排队 / 对局）
- **安卓端（模拟器/投屏）**：当前为手动开局模式，需你自己进入对局，软件会在检测到游戏窗口后接管局内操作

### 4. 连接游戏客户端

启动英雄联盟客户端，软件会自动检测并连接。如果出现打开了客户端却显示未连接的情况，请检查是否使用管理员模式启动软件！

<!-- TODO: 添加连接成功截图 -->

### 5. 开始挂机

1. 选择你想要的阵容配置
2. 点击"开始挂机"按钮或按 **F1** 快捷键
3. 程序会自动开始匹配并进行对局

### 快捷键说明

| 快捷键 | 功能 |
|:------:|:----:|
| F1 | 开启/关闭挂机 |
| F2 | 本局结束后自动停止 |


## 区域与平台兼容说明

| 组合 | 当前支持状态 | 说明 |
|:---|:---:|:---|
| 国服（CN）+ 电脑端 Riot | ✅ | 完整自动流程（建房、排队、对局） |
| 美服（NA）+ 电脑端 Riot | ✅ | 完整自动流程（建房、排队、对局） |
| 安卓端（模拟器/投屏） | ✅（Beta） | 手动开局，自动局内操作与窗口检测 |

> 说明：安卓端因客户端生态差异较大（不同模拟器窗口名、分辨率、渲染模式），推荐优先使用常见模拟器并保持窗口可见。

## 获取更新

#### [前往 Release 页面](https://github.com/WJZ-P/TFT-Hextech-Helper/releases)

## 交流渠道

<p align="center">
  <img src="markdown/交流群.png" alt="软件截图" width="50%">
</p>

## 技术栈

- **前端框架**: React 18 + TypeScript
- **桌面框架**: Electron 32
- **构建工具**: electron-vite
- **UI 组件**: MUI (Material-UI) + styled-components
- **图像识别**: OpenCV.js + Tesseract.js
- **自动化**: nut-js (鼠标键盘控制)

## 迁移开发辅助（US Android / PC Logic）

为双端迁移新增了以下开发脚本（优先服务安卓模拟器与 PC 纯逻辑阶段）：

- `npm run data:refresh`：拉取官方 TFT 数据（英雄/装备/羁绊/阵容）并刷新本地快照
- `npm run pc:logic -- <state-json-path>`：对离线局面运行 PC 逻辑引擎，输出动作计划
- `npm run android:sim -- --scenario android-reroll-midgame`：对安卓端离线样例运行回放，输出运营计划与触控步骤（无需开模拟器）
- `npm run android:ocr -- --fixture android-s16-opening-recognition`：运行安卓截图裁片 + OCR mock 识别回放，验证回合号与英雄名识别
- `npm run state:convert -- <liveclient+ocr.json> <observed-state.json>`：将原始对局抓取数据转换为逻辑引擎输入
- `npm run test:unit`：执行迁移新增核心单元测试（决策引擎 + 数据管线）
- `npm run typecheck:migration`：仅检查迁移新增模块的 TypeScript 类型

示例输入/输出：
- 原始抓取样例：`examples/liveclient-ocr-raw.sample.json`
- 可直接用于 `pc:logic` 的样例：`examples/pc-observed-state.real-match.json`
- 安卓离线回放样例：`examples/android-simulator/*.json`
- 安卓实战时间线关键帧：`examples/android-simulator/android-real-match-*.json`
- 安卓识别回放样例：`examples/android-recognition-replay/*.json`

调试页中新增了“安卓离线模拟面板”和“安卓识别离线回放”，可以直接加载内置样例、按时间线切换关键帧、编辑局面 JSON，并查看生成的买牌 / D 牌 / 上人 / 装备 / 海克斯触控步骤，以及回合号 / 英雄名识别结果。

## 版权说明

本项目采用 **CC BY-NC-ND 4.0** 协议，这意味着：

- ✅ 可以下载、使用、分享（需注明出处）
- ❌ **禁止**商业使用
- ❌ **禁止**二次开发/修改后发布

详情请参阅 [LICENSE](https://github.com/WJZ-P/TFT-Hextech-Helper/blob/main/LICENSE)

## 鸣谢

- 感谢所有为这个项目提供建议和反馈的朋友们

## 重要声明

### 本项目仅供学习交流使用，**禁止**用于任何商业用途！使用本软件产生的任何后果由用户自行承担。(｡•́︿•̀｡)

## 故障排除

以下是常见问题以及快速解决方法。若问题仍未解决，请在 issue 里提供日志片段与操作系统信息，我们将协助你排查。

- OCR 返回空文本
  - 原因：OCR 模块未正确加载、截图区域不正确、字体数据缺失等。
  - 解决方案：确保应用以管理员权限运行、确保对局屏幕未被其他程序覆盖，重启应用后再次尝试；如仍无文本，请尝试在设置中重新选择截图区域或使用默认分辨率运行。

- 游戏窗口未检测到
  - 原因：窗口名变化、分辨率不在识别范围、模拟器/MIRROR 组合问题。
  - 解决方案：确保游戏窗口可见且在前台，尝试调整分辨率或使用常见的模拟器分辨率；重启应用以重新探测窗口。

- 自动化卡顿或停止响应
  - 原因：系统资源紧张、OCR/图像识别卡滞、主进程阻塞。
  - 解决方案：关闭不必要的后台应用，查看日志输出定位阻塞点；如必要，重启应用，必要时分步开启功能以降低负载。

- 热键失效（F1 / F2 等）
  - 原因：界面焦点不在应用窗口、全局快捷键冲突、管理员权限丢失。
  - 解决方案：确保应用窗口处于前景并获得焦点，检查系统快捷键设置，确保以管理员身份运行应用。

- 内存占用异常
  - 原因：OCR 缓存、图像处理队列积压、长时间运行导致的内存累积。
  - 解决方案：定期重启应用，确保使用默认设置以降低内存峰值；如问题持续，请报告日志，可能需要调整缓存策略。

## 📝 To Do List

- [x] **基础挂机功能**

- [x] **阵容配置系统**

- [x] **快捷键支持**

- [x] **更多阵容配置**

- [x] **支持自定义阵容**

- [x] **对局显示人机信息**

- [ ] **战绩统计**

## 如果您喜欢本项目，请给我点个⭐吧(๑>◡<๑)！

## ⭐ Star 历史

[![Stargazers over time](https://starchart.cc/WJZ-P/TFT-Hextech-Helper.svg?variant=adaptive)](https://starchart.cc/WJZ-P/TFT-Hextech-Helper)

---

<details>
<summary align="center"><b>另一条时间线</b></summary>
<br>
<p align="center">
  <img src="markdown/艾克与爆爆.jpg" alt="Ekko & Jinx" width="90%">
</p>
<p align="center"><i>"但至少在这里，他们在一起。"</i></p>
</details>

<!-- 时至今日，你依然在我的梦境中挥之不去。 -->

[contributors-shield]: https://img.shields.io/github/contributors/WJZ-P/TFT-Hextech-Helper.svg?style=flat-square
[contributors-url]: https://github.com/WJZ-P/TFT-Hextech-Helper/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/WJZ-P/TFT-Hextech-Helper.svg?style=flat-square
[forks-url]: https://github.com/WJZ-P/TFT-Hextech-Helper/network/members
[stars-shield]: https://img.shields.io/github/stars/WJZ-P/TFT-Hextech-Helper.svg?style=flat-square
[stars-url]: https://github.com/WJZ-P/TFT-Hextech-Helper/stargazers
[issues-shield]: https://img.shields.io/github/issues/WJZ-P/TFT-Hextech-Helper.svg?style=flat-square
[issues-url]: https://img.shields.io/github/issues/WJZ-P/TFT-Hextech-Helper.svg
[license-shield]: https://img.shields.io/github/license/WJZ-P/TFT-Hextech-Helper.svg?style=flat-square
[license-url]: https://github.com/WJZ-P/TFT-Hextech-Helper/blob/main/LICENSE
