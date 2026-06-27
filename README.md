# isee-browser

跨平台(Windows + Linux)Electron Kiosk 桌面客户端,用于打开配置网址并以全屏/最大化 Kiosk 模式展示,支持多媒体与图表渲染、本地存储持久化、文件下载、开机自启与 GitHub Releases 自动更新。

## 项目简介

isee-browser 采用「主窗口直接加载配置 URL」的架构:主窗口作为 Kiosk 内容窗口,使用持久化分区 `persist:kiosk` 加载远程内容并沙箱化(无 Node 集成);设置面板为独立的本地 React 窗口,通过托盘菜单或全局快捷键按需打开,经受限、类型化的 IPC 桥与主进程通信。

- **Kiosk 内容窗口**:加载配置地址,导航锁定(仅允许同 host 或 allowlist 内跳转),外链可选由系统浏览器打开。
- **设置面板**:本地 React 应用,管理默认地址、显示模式、下载、开机自启、更新与存储清除等。
- **自动更新**:基于 electron-updater 与 GitHub Releases,支持手动检查与定时复查。

## 环境要求

- Node.js ≥ 18
- npm ≥ 9
- Windows 10/11 或 Ubuntu(及其他基于 glibc 的 Linux 发行版)

## 开发

```bash
# 安装依赖
npm install

# 启动开发(electron-vite dev,自动加载 React 面板热更新)
npm run dev

# 构建产物到 out/(main + preload + renderer)
npm run build

# 运行单元测试(Vitest)
npm test

# 类型检查
npm run typecheck:node
npm run typecheck:web

# 代码规范
npm run lint
npm run format
```

开发模式下,设置面板通过 `ELECTRON_RENDERER_URL` 加载 Vite 热更新入口;托盘「设置」或快捷键 `Ctrl+Shift+,`(macOS 为 `Cmd+Shift+,`)可打开面板。

## 打包分发

打包前需准备图标资源(位于 `resources/`):

- `icon.png`:应用图标,建议 ≥ 256×256(electron-builder 在 Windows 上需要 ≥256 像素的图标,会自动转换为 `.ico`)。
- `tray.png`:托盘图标。

> 当前 `resources/icon.png` 与 `tray.png` 为占位图标,正式发布前请替换为品牌图标。Windows 若需自带多尺寸图标,可提供 `resources/icon.ico`;macOS 可提供 `resources/icon.icns`(可选)。

```bash
# Windows:NSIS 安装包
npm run dist:win

# Linux:AppImage + deb
npm run dist:linux
```

产物输出至 `release/`。

### 自动更新配置

自动更新基于 GitHub Releases。打包配置(`electron-builder.yml`)的 `publish` 段使用环境变量占位:

```yaml
publish:
  provider: github
  owner: ${GH_OWNER}
  repo: ${GH_REPO}
```

发布前设置环境变量:

```bash
export GH_OWNER=你的GitHub用户名
export GH_REPO=仓库名
export GH_TOKEN=你的GitHubToken  # 私有仓库或自动上传产物所需
```

随后 `npm run dist:win` / `dist:linux` 会将安装包上传到对应 Release。electron-updater 在应用启动后(若设置中开启「自动检查更新」)会向 GitHub 查询最新版本,发现新版本后可下载并重启安装。

> 私有仓库需确保 `GH_TOKEN` 在打包与运行时均可访问;electron-updater 默认使用 `GH_TOKEN` 环境变量鉴权。

## Kiosk 使用说明

- **托盘菜单**:设置、刷新页面、检查更新、重启、退出。
- **快捷键**:`Ctrl/Cmd+Shift+,` 打开设置面板。
- **单实例**:已运行时再次启动会聚焦已有窗口。
- **导航锁定**:仅允许在配置地址同 host 或 URL allowlist 内跳转,其余导航被拦截;新窗口默认拒绝,可在设置中开启「外链用系统浏览器打开」。

## 设置项说明

| 设置项 | 说明 |
| --- | --- |
| 默认地址 | Kiosk 内容窗口加载的 http/https 地址 |
| 显示模式 | 全屏(Kiosk)/ 最大化 / 普通窗口 |
| 开机自启动 | 同步系统注册项,重启后生效 |
| 默认下载目录 | 不询问时下载文件保存目录 |
| 每次下载询问保存位置 | 开启后每次下载弹出另存为对话框 |
| 外链用系统浏览器打开 | 关闭则拦截外链新窗口 |
| 自动检查更新 | 启动检查 + 每 4 小时复查 |
| 关闭硬件加速 | 部分 Linux 环境兼容性选项 |
| 清除浏览数据 | 清除 Kiosk 分区的 localStorage、Cookie、indexDB、缓存等并刷新内容窗口 |

## 冒烟测试矩阵

发布前请按以下矩阵手动验证:

### Windows 10/11

1. 全屏 Kiosk 启动 → 加载默认地址。
2. 播放音视频、查看 ECharts/SVG/canvas 渲染。
3. 触发下载(另存为对话框)。
4. 设置面板修改地址 / 切换开机自启 → 重启验证。
5. 检查更新流程:发现新版本 → 下载 → 重启安装。

### Ubuntu(AppImage)

1. 同 Windows 流程。
2. 验证硬件加速与编解码(必要时在设置中关闭硬件加速)。
3. 验证开机自启(`.desktop` autostart)。

### 更新流程(Staging)

用 staging GitHub Release 发布更高版本,验证「发现新版本 → 下载 → 重启安装」完整链路。

## 技术栈

Electron、electron-vite、electron-builder、electron-updater、auto-launch、electron-store、React + Vite、TypeScript、Vitest、electron-log。

## 许可证

MIT
