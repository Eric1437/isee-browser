# isee-browser 设计规格

> 日期:2026-06-27
> 状态:已批准

## 1. 目标

构建跨平台(Windows + Linux)的 Electron 桌面应用,作为**专用 Kiosk 客户端**打开配置的网址。应用需具备:

- 完整 Chromium 能力:多媒体音频/视频(含 H.264/AAC/MP3)、ECharts、SVG、canvas、WebGL
- 浏览器本地存储持久化(localStorage/sessionStorage/cookies/IndexedDB)跨重启保留
- 文件下载(每次询问 + 默认目录)
- 开机启动设置
- 可配置默认打开地址
- 经 GitHub Releases 的远程更新(通知 + 手动下载 + 手动安装)

## 2. 非目标(YAGNI)

- 标签页、多窗口浏览(专用 Kiosk,单窗口单页面)
- 地址栏、前进/后退等通用浏览器控件
- 通用书签、历史记录管理
- 移动端 / macOS 支持(本期仅 Windows + Linux)

## 3. 技术栈

| 关注点 | 选型 | 理由 |
|---|---|---|
| 运行时 | Electron(最新稳定版) | Node + Chromium,内置专有编解码器(H.264/AAC/MP3)与 WebGL/canvas/SVG,原生满足"node 为技术"+ 多媒体 |
| 构建 | electron-vite | 统一构建 main / preload / renderer,开发热重载 |
| 打包 | electron-builder | Windows: NSIS `.exe`;Linux: AppImage + `.deb` |
| 自动更新 | electron-updater | GitHub Releases provider |
| 开机启动 | auto-launch | Win 注册表 Run 键;Linux `~/.config/autostart` `.desktop` |
| 设置 UI | React + Vite | 设置面板 |
| 设置持久化 | electron-store | `userData/settings.json`,带 schema 校验 |
| 语言 | TypeScript | main + preload + renderer 全量类型安全 |
| 日志/规范 | electron-log、ESLint、Prettier | |

不选 Tauri:非 Node 技术栈,且 Linux WebKitGTK 对专有编解码支持不稳定。

## 4. 架构(方案 A)

两类窗口/进程角色:

- **内容窗口(主 BrowserWindow)**:直接加载配置的默认 URL,即 Kiosk 内容。默认全屏。`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`。使用**持久化分区** `persist:kiosk`,使 localStorage/sessionStorage/cookies/IndexedDB 跨重启保留。远程内容**不暴露** Node API 与 IPC。Web 安全开启。
- **设置窗口(独立 BrowserWindow)**:加载本地 React 构建(`app://` 协议)。经系统托盘菜单 + 快捷键 `Ctrl+Shift+,` 按需打开。`contextIsolation: true`,preload 通过 `contextBridge` 暴露**受限、类型化**的 `window.settingsApi`。单例:已开则聚焦。
- **主进程**:拥有设置存储、窗口生命周期、下载处理、更新编排、开机启动、托盘、全局快捷键;通过 `ipcMain.handle` 暴露给设置 preload。

**安全模型**:远程内容默认不可信——无 Node 集成、沙箱运行、无 IPC 访问。只有本地设置窗口拥有经审核的 IPC 桥,防止远程页面调用特权操作。

## 5. 设置项(electron-store 持久化)

- `defaultUrl`(URL,http/https)— 内容窗口启动加载地址
- `autoStart`(bool)— 开机自启
- `displayMode`(`fullscreen`|`maximized`|`normal`,默认 `fullscreen`)
- `download.defaultFolder`(路径)— 默认下载目录
- `download.alwaysAsk`(bool,默认 true)— 每次弹"另存为"
- `update.autoCheck`(bool,默认 true)— 启动 + 定期检查
- `update.openExternalLinks`(bool,默认 false)— 外链是否用系统浏览器打开(否则拦截,保持 Kiosk)
- `urlAllowlist`(可选数组)— 限制导航来源(默认允许同 host)
- `gpu.disabled`(bool,默认 false)— 关闭硬件加速(部分 Linux 回退)

## 6. 窗口与显示

- 启动创建内容窗口,应用 `displayMode`,加载 `defaultUrl`。
- 全屏 Kiosk:`kiosk: true`;Kiosk 下禁用误触退出,设置经托盘/快捷键进入。
- 系统托盘:菜单含「设置」「刷新页面」「检查更新」「重启」「退出」——确保全屏 Kiosk 下也能操作。
- `app.requestSingleInstanceLock()`:二次启动聚焦已有窗口。

## 7. 导航与 URL 锁定(Kiosk)

- 内容窗口仅加载 `defaultUrl`(默认允许同源/同 host 链接),可选用 `urlAllowlist` 收紧。
- `will-navigate` / `setWindowOpenHandler`:拦截新窗口/外部跳转,保持单窗口 Kiosk;外链默认拦截,可配置用系统浏览器打开。

## 8. 下载

- 监听 `webContents.session.on('will-download')`。
- `alwaysAsk`:`dialog.showSaveDialog`(预填默认目录 + 文件名);否则存入默认目录。
- 跟踪进度,下载开始/完成通知;用户取消则取消下载。

## 9. 浏览器本地存储持久化

- 持久分区 `persist:kiosk` → localStorage/sessionStorage/cookies/IndexedDB/Service Worker 存于 `userData/Partitions/kiosk`,**自动跨重启保留**。
- 设置面板提供"清除存储/缓存"按钮。

## 10. 多媒体与视图

- 原生 Chromium:HTML5 音视频(H.264/AAC/MP3,Electron 内置编解码器)、WebGL、canvas 2D、SVG、ECharts,无需额外配置。
- 硬件加速默认开启;提供关闭 GPU 的设置项以兼容部分 Linux。

## 11. 自动更新(GitHub Releases)

- electron-updater `provider: 'github'`,`owner`/`repo` 取自 `package.json`(私有仓库需 `private: true` + token)。
- electron-builder `publish` 指向 GitHub Releases。
- 流程:启动(若 autoCheck)+ 每 N 小时 `checkForUpdates()` →「update-available」时托盘+设置面板内横幅提示"发现新版本" → 用户点「下载更新」`downloadUpdate()`(显示进度)→「update-downloaded」提示「重启安装」`quitAndInstall()`。设置面板「检查更新」按钮手动触发,展示当前/最新版本。**从不强制安装**,全程用户确认。
- Linux:AppImage 原生支持自动更新;`.deb` 需重装(故 Linux 默认 AppImage)。

## 12. 项目结构

```
isee-browser/
├─ package.json  electron-builder.yml  tsconfig*.json
├─ src/
│  ├─ main/            # 主进程(TS)
│  │  ├─ index.ts      # 生命周期、单例、托盘、快捷键
│  │  ├─ windows.ts    # createContentWindow / createSettingsWindow
│  │  ├─ settings.ts   # electron-store + schema
│  │  ├─ downloads.ts  # will-download 处理
│  │  ├─ updater.ts    # electron-updater 编排 + IPC
│  │  ├─ autostart.ts  # auto-launch 切换
│  │  └─ ipc.ts        # IPC handlers
│  ├─ preload/settings.ts   # contextBridge → window.settingsApi
│  └─ renderer/        # 设置 React 应用(Vite)
│     ├─ index.html  main.tsx  App.tsx
│     ├─ components/        # SettingsForm, UpdatePanel, ...
│     └─ api.ts             # 调用 window.settingsApi
├─ resources/          # 图标、托盘图标
└─ docs/superpowers/specs/
```

构建:Vite 构建 renderer → `out/renderer`;esbuild/tsc 构建 main+preload → `out/main`;electron-builder 打包。开发用 electron-vite。

## 13. 测试

- 单元(Vitest):设置 schema 校验、下载路径解析、allowlist 匹配、清除选项、更新状态机、自启封装、窗口选项构造。
- IPC:mock 测试。
- React 组件:Vitest + Testing Library。
- 冒烟矩阵:Win10/11、Ubuntu(AppImage)。
- 更新流程:用 staging GitHub Release 验证。

## 14. 风险与缓解

- Linux 专有编解码:Electron 内置;AppImage 自带依赖可兜底。
- GitHub 限流/私有仓库:文档化 token 配置。
- Kiosk 逃逸:托盘+快捷键受控;生产 Kiosk 可选设置密码(锦上添花)。

## 15. 国际化

所有界面文案、托盘菜单、更新提示、日志均为**简体中文**。
