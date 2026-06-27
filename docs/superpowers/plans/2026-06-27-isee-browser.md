# isee-browser 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** 构建跨平台(Windows + Linux)Electron 桌面应用,作为专用 Kiosk 客户端打开配置网址,具备多媒体/图表渲染、本地存储持久化、文件下载、开机启动设置与 GitHub Releases 自动更新。

**架构:** 方案 A——主窗口直接加载配置 URL(Kiosk 内容,持久化分区 `persist:kiosk`);设置面板为独立 React 窗口,经托盘+快捷键按需打开,通过受限 IPC 桥与主进程通信。远程内容沙箱化、无 Node 集成;仅本地设置窗口拥有经审核的 IPC。

**技术栈:** Electron、electron-vite、electron-builder、electron-updater、auto-launch、electron-store、React+Vite、TypeScript、Vitest、electron-log。

**约定:** 所有界面文案、托盘菜单、更新提示、日志均为简体中文。每阶段一个 git 提交,失败测试先于实现(TDD)。

---

## 文件结构

```
isee-browser/
├─ package.json              # 依赖与脚本
├─ electron-builder.yml      # 打包配置(Win NSIS / Linux AppImage+deb / publish github)
├─ electron.vite.config.ts   # main/preload/renderer 统一构建
├─ tsconfig.json / tsconfig.node.json
├─ .eslintrc.cjs / .prettierrc
├─ vitest.config.ts
├─ resources/                # icon.png、tray.png(各平台图标)
├─ docs/superpowers/{specs,plans}/
└─ src/
   ├─ main/                  # 主进程(TS)
   │  ├─ index.ts            # app 生命周期、单例锁、托盘、快捷键、启动流程
   │  ├─ windows.ts          # createContentWindow / createSettingsWindow / buildWindowOptions
   │  ├─ settings.ts         # electron-store 封装 + schema 校验
   │  ├─ downloads.ts        # will-download 处理 / resolveDownloadPath
   │  ├─ updater.ts          # electron-updater 编排 + 事件转发 + reduceUpdateEvent
   │  ├─ autostart.ts        # auto-launch 封装
   │  ├─ nav-guard.ts        # isAllowedNavigation 纯函数
   │  ├─ storage.ts          # buildClearOptions 纯函数 + clearStorage
   │  └─ ipc.ts              # ipcMain.handle 处理器
   ├─ preload/
   │  └─ settings.ts         # contextBridge → window.settingsApi
   └─ renderer/              # 设置 React 应用(Vite)
      ├─ index.html  main.tsx  App.tsx  api.ts
      ├─ components/          # SettingsForm、UpdatePanel、DownloadsSection
      └─ components/__tests__/
```

---

## 阶段 0:脚手架与工具链

**Files:**
- Create: `package.json`、`electron.vite.config.ts`、`tsconfig.json`、`tsconfig.node.json`、`.eslintrc.cjs`、`.prettierrc`、`vitest.config.ts`、`.gitignore`
- Create: `src/main/index.ts`(空壳)、`src/renderer/index.html`、`src/renderer/main.tsx`

- [ ] **Step 1: 初始化 npm 并安装依赖**

```bash
npm init -y
npm install --save electron electron-store electron-updater auto-launch electron-log
npm install --save-dev electron-vite electron-builder vite react react-dom typescript \
  @types/react @types/react-dom @types/node vitest @testing-library/react \
  @testing-library/jest-dom jsdom eslint prettier
```

- [ ] **Step 2: 编写 `package.json` 脚本与元信息**

确保 `package.json` 含:`"main": "out/main/index.js"`、scripts `dev`(electron-vite dev)、`build`(electron-vite build)、`dist:win`、`dist:linux`、`test`(vitest)、`lint`。`build.publish` 留待阶段 9 填充 github 配置。

- [ ] **Step 3: 配置 `electron.vite.config.ts`(三入口)**

main(entry `src/main/index.ts`)、preload(entry `src/preload/settings.ts`)、renderer(entry `src/renderer/index.html`,React 插件)。

- [ ] **Step 4: 配置 TS / ESLint / Prettier / Vitest**

`tsconfig.json`(renderer: jsx react,DOM lib);`tsconfig.node.json`(main/preload: node types);`vitest.config.ts`(environment jsdom,include `src/**/*.test.ts(x)`)。

- [ ] **Step 5: 写入空壳文件**

`src/main/index.ts`:`import { app, BrowserWindow } from 'electron'; app.whenReady().then(() => { new BrowserWindow(); });`
`src/renderer/index.html` + `src/renderer/main.tsx`:最小 React 根。

- [ ] **Step 6: 验证**

运行 `npm run dev` → 弹出空白窗口。运行 `npm run build` → `out/` 产出。

- [ ] **Step 7: 初始化 git 并提交**

```bash
git init
git add -A
git commit -m "chore: 初始化项目脚手架"
```

---

## 阶段 1:主进程骨架 + 内容窗口(Kiosk)

**Files:**
- Create: `src/main/windows.ts`、`src/main/index.ts`(替换空壳)、`resources/tray.png`
- Test: `src/main/windows.test.ts`

- [ ] **Step 1: 写失败测试 `buildWindowOptions`**

```ts
// src/main/windows.test.ts
import { describe, it, expect } from 'vitest';
import { buildWindowOptions, shouldFocusSecondInstance } from './windows';

describe('buildWindowOptions', () => {
  it('fullscreen 模式启用 kiosk', () => {
    const opts = buildWindowOptions('fullscreen');
    expect(opts.kiosk).toBe(true);
    expect(opts.webPreferences.partition).toBe('persist:kiosk');
    expect(opts.webPreferences.contextIsolation).toBe(true);
    expect(opts.webPreferences.nodeIntegration).toBe(false);
    expect(opts.webPreferences.sandbox).toBe(true);
  });
  it('maximized 模式不启用 kiosk', () => {
    const opts = buildWindowOptions('maximized');
    expect(opts.kiosk).toBe(false);
  });
  it('normal 模式不启用 kiosk', () => {
    const opts = buildWindowOptions('normal');
    expect(opts.kiosk).toBe(false);
  });
});

describe('shouldFocusSecondInstance', () => {
  it('已有窗口时返回 true', () => {
    expect(shouldFocusSecondInstance(true)).toBe(true);
  });
  it('无窗口时返回 false', () => {
    expect(shouldFocusSecondInstance(false)).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/main/windows.test.ts`
Expected: FAIL(modules 未定义)

- [ ] **Step 3: 实现 `src/main/windows.ts`**

```ts
import { BrowserWindowConstructorOptions } from 'electron';
import type { DisplayMode } from './settings';

export function buildWindowOptions(
  displayMode: DisplayMode
): BrowserWindowConstructorOptions & { kiosk: boolean } {
  const base: BrowserWindowConstructorOptions = {
    width: 1280,
    height: 800,
    webPreferences: {
      partition: 'persist:kiosk',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };
  return { ...base, kiosk: displayMode === 'fullscreen' };
}

export function shouldFocusSecondInstance(hasWindow: boolean): boolean {
  return hasWindow;
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run src/main/windows.test.ts`
Expected: PASS

- [ ] **Step 5: 实现 `src/main/index.ts`(单例锁、托盘、快捷键、createContentWindow)**

```ts
import { app, BrowserWindow, Tray, Menu, globalShortcut, shell } from 'electron';
import * as path from 'path';
import { buildWindowOptions } from './windows';
import { getSettings } from './settings';

let contentWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createContentWindow() {
  const settings = getSettings();
  const win = new BrowserWindow(buildWindowOptions(settings.displayMode));
  win.loadURL(settings.defaultUrl);
  contentWindow = win;
}

function createTray() {
  tray = new Tray(path.join(__dirname, '../../resources/tray.png'));
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '设置', click: () => openSettings() },
      { label: '刷新页面', click: () => contentWindow?.reload() },
      { label: '检查更新', click: () => {/* 阶段 8 接入 */} },
      { type: 'separator' },
      { label: '重启', click: () => app.relaunch() },
      { label: '退出', click: () => app.quit() },
    ])
  );
}

function openSettings() {
  /* 阶段 3 实现 createSettingsWindow */
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (contentWindow) {
      if (contentWindow.isMinimized()) contentWindow.restore();
      contentWindow.focus();
    }
  });
  app.whenReady().then(() => {
    createContentWindow();
    createTray();
    globalShortcut.register('CommandOrControl+Shift+Comma', () => openSettings());
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
```

- [ ] **Step 6: 验证 `npm run dev` 弹出加载 defaultUrl 的窗口**

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: 主进程与 Kiosk 内容窗口"
```

---

## 阶段 2:设置存储 + schema(electron-store)

**Files:**
- Create: `src/main/settings.ts`
- Test: `src/main/settings.test.ts`

- [ ] **Step 1: 写失败测试**

```ts
// src/main/settings.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { validateSettings, defaultSettings, type AppSettings } from './settings';

describe('validateSettings', () => {
  it('非法 URL 被拒', () => {
    expect(() => validateSettings({ ...defaultSettings, defaultUrl: 'not-a-url' })).toThrow();
  });
  it('非 http/https 协议被拒', () => {
    expect(() => validateSettings({ ...defaultSettings, defaultUrl: 'ftp://x' })).toThrow();
  });
  it('displayMode 枚举校验', () => {
    expect(() => validateSettings({ ...defaultSettings, displayMode: 'big' as any })).toThrow();
  });
  it('download.alwaysAsk 布尔校验', () => {
    expect(() => validateSettings({ ...defaultSettings, download: { defaultFolder: '', alwaysAsk: 'yes' as any } })).toThrow();
  });
  it('合法设置通过', () => {
    const s = validateSettings({ ...defaultSettings, defaultUrl: 'https://example.com' });
    expect(s.defaultUrl).toBe('https://example.com');
  });
  it('缺省值填充', () => {
    const s = validateSettings({} as Partial<AppSettings>);
    expect(s.displayMode).toBe('fullscreen');
    expect(s.autoStart).toBe(false);
    expect(s.download.alwaysAsk).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/main/settings.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 `src/main/settings.ts`**

```ts
import Store from 'electron-store';

export type DisplayMode = 'fullscreen' | 'maximized' | 'normal';

export interface AppSettings {
  defaultUrl: string;
  autoStart: boolean;
  displayMode: DisplayMode;
  download: { defaultFolder: string; alwaysAsk: boolean };
  update: { autoCheck: boolean; openExternalLinks: boolean };
  urlAllowlist: string[];
  gpu: { disabled: boolean };
}

export const defaultSettings: AppSettings = {
  defaultUrl: 'https://example.com',
  autoStart: false,
  displayMode: 'fullscreen',
  download: { defaultFolder: '', alwaysAsk: true },
  update: { autoCheck: true, openExternalLinks: false },
  urlAllowlist: [],
  gpu: { disabled: false },
};

const URL_RE = /^https?:\/\/.+/;
const MODES: DisplayMode[] = ['fullscreen', 'maximized', 'normal'];

export function validateSettings(input: Partial<AppSettings>): AppSettings {
  const merged = {
    ...defaultSettings,
    ...input,
    download: { ...defaultSettings.download, ...(input.download ?? {}) },
    update: { ...defaultSettings.update, ...(input.update ?? {}) },
    gpu: { ...defaultSettings.gpu, ...(input.gpu ?? {}) },
  };
  if (!URL_RE.test(merged.defaultUrl)) throw new Error('defaultUrl 必须为 http/https 地址');
  if (!MODES.includes(merged.displayMode)) throw new Error('displayMode 非法');
  if (typeof merged.download.alwaysAsk !== 'boolean') throw new Error('download.alwaysAsk 必须为布尔');
  if (typeof merged.update.autoCheck !== 'boolean') throw new Error('update.autoCheck 必须为布尔');
  return merged;
}

let store: Store<AppSettings> | null = null;

export function getSettings(): AppSettings {
  if (!store) store = new Store<AppSettings>({ defaults: defaultSettings });
  return validateSettings(store.store);
}

export function setSettings(partial: Partial<AppSettings>): AppSettings {
  if (!store) store = new Store<AppSettings>({ defaults: defaultSettings });
  const next = validateSettings({ ...store.store, ...partial });
  store.store = next;
  return next;
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run src/main/settings.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: 设置存储与 schema 校验"
```

---

## 阶段 3:设置窗口 + React 面板 + IPC 桥

**Files:**
- Create: `src/preload/settings.ts`、`src/main/ipc.ts`、`src/main/windows.ts`(增 `createSettingsWindow`)
- Create: `src/renderer/App.tsx`、`src/renderer/api.ts`、`src/renderer/components/SettingsForm.tsx`、`src/renderer/components/UpdatePanel.tsx`
- Test: `src/main/ipc.test.ts`、`src/renderer/components/__tests__/SettingsForm.test.tsx`

- [ ] **Step 1: 写 preload `src/preload/settings.ts`**

```ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('settingsApi', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: unknown) => ipcRenderer.invoke('settings:set', patch),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (cb: (status: unknown) => void) => {
    const handler = (_: unknown, status: unknown) => cb(status);
    ipcRenderer.on('update:status', handler);
    return () => ipcRenderer.removeListener('update:status', handler);
  },
  getUpdateStatus: () => ipcRenderer.invoke('update:status'),
  toggleAutoStart: (enabled: boolean) => ipcRenderer.invoke('autostart:toggle', enabled),
  clearStorage: () => ipcRenderer.invoke('storage:clear'),
  selectDownloadFolder: () => ipcRenderer.invoke('dialog:downloadFolder'),
});
```

- [ ] **Step 2: 写失败测试 `src/main/ipc.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('./settings', () => ({
  getSettings: vi.fn(() => ({ defaultUrl: 'https://example.com' })),
  setSettings: vi.fn((p) => ({ ...p, defaultUrl: 'https://example.com' })),
}));

describe('ipc handlers', () => {
  it('settings:get 返回设置', async () => {
    const { registerIpcHandlers } = await import('./ipc');
    const handlers: Record<string, (e: unknown, ...a: unknown[]) => unknown> = {};
    const fakeIpc = {
      handle: (c: string, fn: (e: unknown, ...a: unknown[]) => unknown) => { handlers[c] = fn; },
    };
    registerIpcHandlers(fakeIpc as any);
    const result = await handlers['settings:get']({});
    expect(result).toEqual({ defaultUrl: 'https://example.com' });
  });
});
```

- [ ] **Step 3: 实现 `src/main/ipc.ts`**

```ts
import { ipcMain, IpcMain, dialog } from 'electron';
import { getSettings, setSettings } from './settings';
import { setAutoStart } from './autostart';
import { clearStorage } from './storage';

export function registerIpcHandlers(ipc: IpcMain = ipcMain) {
  ipc.handle('settings:get', () => getSettings());
  ipc.handle('settings:set', (_e, patch) => setSettings(patch));
  ipc.handle('autostart:toggle', (_e, enabled: boolean) => setAutoStart(enabled));
  ipc.handle('storage:clear', () => clearStorage());
  ipc.handle('dialog:downloadFolder', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });
  // update:* 在阶段 8 接入
}
```

- [ ] **Step 4: 运行 ipc 测试验证通过**

Run: `npx vitest run src/main/ipc.test.ts`
Expected: PASS

- [ ] **Step 5: 在 `windows.ts` 增加 `createSettingsWindow`(单例、加载本地 React)**

```ts
import { BrowserWindow } from 'electron';
import * as path from 'path';

let settingsWindow: BrowserWindow | null = null;
export function createSettingsWindow() {
  if (settingsWindow) { settingsWindow.focus(); return; }
  settingsWindow = new BrowserWindow({
    width: 720, height: 640, title: '设置',
    webPreferences: {
      preload: path.join(__dirname, '../preload/settings.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false,
    },
  });
  if (process.env.ELECTREON_RENDERER_URL) {
    settingsWindow.loadURL(process.env.ELECTREON_RENDERER_URL);
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
  settingsWindow.on('closed', () => { settingsWindow = null; });
}
```

- [ ] **Step 6: 写 React 面板 `src/renderer/components/SettingsForm.tsx`(中文 UI)**

表单字段:默认地址、显示模式(select)、开机自启(checkbox)、下载默认目录(input + 「选择目录」按钮)、每次询问下载(checkbox)、外链用系统浏览器(checkbox)、关闭 GPU(checkbox)。提交按钮「保存设置」,保存调用 `window.settingsApi.setSettings`。

- [ ] **Step 7: 写失败测试 `SettingsForm.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsForm } from '../SettingsForm';

vi.mock('../../api', () => ({
  settingsApi: {
    getSettings: vi.fn(async () => ({
      defaultUrl: 'https://old.com', autoStart: false, displayMode: 'normal',
      download: { defaultFolder: '', alwaysAsk: true },
      update: { autoCheck: true, openExternalLinks: false },
      urlAllowlist: [], gpu: { disabled: false },
    })),
    setSettings: vi.fn(async (p: unknown) => p),
    selectDownloadFolder: vi.fn(async () => '/home/u/dl'),
  },
}));

describe('SettingsForm', () => {
  it('修改地址并保存', async () => {
    render(<SettingsForm />);
    const input = await screen.findByLabelText('默认地址');
    fireEvent.change(input, { target: { value: 'https://new.com' } });
    fireEvent.click(screen.getByText('保存设置'));
    await waitFor(() => {
      expect(require('../../api').settingsApi.setSettings).toHaveBeenCalledWith(
        expect.objectContaining({ defaultUrl: 'https://new.com' })
      );
    });
  });
});
```

- [ ] **Step 8: 实现 `SettingsForm.tsx` 与 `api.ts` 使测试通过**

`src/renderer/api.ts`:
```ts
export const settingsApi = (window as any).settingsApi;
```

- [ ] **Step 9: 运行渲染进程测试验证通过**

Run: `npx vitest run src/renderer`
Expected: PASS

- [ ] **Step 10: 在 `index.ts` 的 `openSettings()` 调用 `createSettingsWindow()`,并调用 `registerIpcHandlers()`**

- [ ] **Step 11: 验证 `npm run dev`:快捷键/托盘「设置」打开 React 面板**

- [ ] **Step 12: 提交**

```bash
git add -A
git commit -m "feat: 设置窗口与 React 面板"
```

---

## 阶段 4:导航锁定(Kiosk)

**Files:**
- Create: `src/main/nav-guard.ts`
- Test: `src/main/nav-guard.test.ts`
- Modify: `src/main/windows.ts`(接入守卫)

- [ ] **Step 1: 写失败测试**

```ts
// src/main/nav-guard.test.ts
import { describe, it, expect } from 'vitest';
import { isAllowedNavigation } from './nav-guard';

describe('isAllowedNavigation', () => {
  it('同 host 放行', () => {
    expect(isAllowedNavigation('https://a.com/x', 'https://a.com/', [])).toBe(true);
  });
  it('不同 host 且无 allowlist 拦截', () => {
    expect(isAllowedNavigation('https://b.com/', 'https://a.com/', [])).toBe(false);
  });
  it('allowlist 命中放行', () => {
    expect(isAllowedNavigation('https://b.com/', 'https://a.com/', ['https://b.com/'])).toBe(true);
  });
  it('allowlist 非空但未命中拦截', () => {
    expect(isAllowedNavigation('https://c.com/', 'https://a.com/', ['https://b.com/'])).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/main/nav-guard.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 `src/main/nav-guard.ts`**

```ts
export function isAllowedNavigation(
  targetUrl: string,
  defaultUrl: string,
  allowlist: string[]
): boolean {
  let target: URL;
  let def: URL;
  try { target = new URL(targetUrl); def = new URL(defaultUrl); } catch { return false; }
  if (allowlist.length === 0) return target.host === def.host;
  return allowlist.some((entry) => {
    try { return new URL(entry).host === target.host; } catch { return false; }
  });
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run src/main/nav-guard.test.ts`
Expected: PASS

- [ ] **Step 5: 在 `createContentWindow` 接入守卫**

```ts
import { isAllowedNavigation } from './nav-guard';
// 在 win 创建后:
win.webContents.on('will-navigate', (e, url) => {
  const s = getSettings();
  if (!isAllowedNavigation(url, s.defaultUrl, s.urlAllowlist)) e.preventDefault();
});
win.webContents.setWindowOpenHandler(({ url }) => {
  const s = getSettings();
  if (s.update.openExternalLinks && /^https?:/.test(url)) {
    shell.openExternal(url);
  }
  return { action: 'deny' };
});
```

- [ ] **Step 6: 验证:加载测试页,点击外链不跳转;内链可跳转**

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: Kiosk 导航锁定"
```

---

## 阶段 5:文件下载

**Files:**
- Create: `src/main/downloads.ts`
- Test: `src/main/downloads.test.ts`
- Modify: `src/main/windows.ts`(接入 will-download)

- [ ] **Step 1: 写失败测试 `resolveDownloadPath`**

```ts
// src/main/downloads.test.ts
import { describe, it, expect } from 'vitest';
import { resolveDownloadPath } from './downloads';

describe('resolveDownloadPath', () => {
  it('alwaysAsk 返回 ask 标记', () => {
    expect(resolveDownloadPath('/dl', true, 'a.zip')).toBe('ask');
  });
  it('不询问返回拼接路径', () => {
    const p = resolveDownloadPath('/dl', false, 'a.zip');
    expect(p).toBe(process.platform === 'win32' ? '\\dl\\a.zip' : '/dl/a.zip');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/main/downloads.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 `resolveDownloadPath` + `registerDownloadHandler`**

```ts
import { dialog, Notification, DownloadItem } from 'electron';
import * as path from 'path';

export function resolveDownloadPath(
  defaultFolder: string,
  alwaysAsk: boolean,
  filename: string
): string | 'ask' {
  if (alwaysAsk) return 'ask';
  return path.join(defaultFolder, filename);
}

export function registerDownloadHandler(
  session: Electron.Session,
  defaultFolder: string,
  alwaysAsk: boolean
) {
  session.on('will-download', async (_e, item: DownloadItem) => {
    if (alwaysAsk) {
      const r = await dialog.showSaveDialog({
        defaultPath: path.join(defaultFolder || '', item.getFilename()),
      });
      if (r.canceled) { item.cancel(); return; }
      item.setSavePath(r.filePath);
    } else if (defaultFolder) {
      item.setSavePath(path.join(defaultFolder, item.getFilename()));
    }
    new Notification({ title: '下载开始', body: item.getFilename() }).show();
    item.once('done', () => {
      new Notification({ title: '下载完成', body: item.getFilename() }).show();
    });
  });
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run src/main/downloads.test.ts`
Expected: PASS

- [ ] **Step 5: 在 `createContentWindow` 调用 `registerDownloadHandler(win.webContents.session, s.download.defaultFolder, s.download.alwaysAsk)`**

- [ ] **Step 6: 验证:在测试页触发下载,弹出另存为对话框**

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: 文件下载处理"
```

---

## 阶段 6:本地存储持久化 + 清除

**Files:**
- Create: `src/main/storage.ts`
- Test: `src/main/storage.test.ts`
- Confirm: `src/main/windows.ts` 使用 `persist:kiosk`

- [ ] **Step 1: 写失败测试 `buildClearOptions`**

```ts
// src/main/storage.test.ts
import { describe, it, expect } from 'vitest';
import { buildClearOptions } from './storage';

describe('buildClearOptions', () => {
  it('默认清除全部存储', () => {
    const o = buildClearOptions();
    expect(o.storages).toContain('localstorage');
    expect(o.storages).toContain('cookies');
    expect(o.storages).toContain('indexdb');
    expect(o.quotas).toContain('temporary');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/main/storage.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 `src/main/storage.ts`**

```ts
import { session } from 'electron';

export function buildClearOptions() {
  return {
    storages: ['localstorage', 'cookies', 'indexdb', 'serviceworkers', 'cachestorage'],
    quotas: ['temporary', 'persistent'],
  };
}

export function clearStorage(): Promise<void> {
  const ses = session.fromPartition('persist:kiosk');
  return ses.clearStorageData(buildClearOptions());
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run src/main/storage.test.ts`
Expected: PASS

- [ ] **Step 5: 验证内容窗口分区为 `persist:kiosk`(已在阶段 1 设置);设置面板「清除存储」按钮调用 `clearStorage` 后刷新内容窗口**

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 本地存储持久化与清除"
```

---

## 阶段 7:开机启动

**Files:**
- Create: `src/main/autostart.ts`
- Test: `src/main/autostart.test.ts`
- Modify: `src/main/index.ts`(启动时按设置初始化)、`src/main/ipc.ts`(toggle 联动设置)

- [ ] **Step 1: 写失败测试(mock auto-launch)**

```ts
// src/main/autostart.test.ts
import { describe, it, expect, vi } from 'vitest';
vi.mock('auto-launch', () => {
  return vi.fn().mockImplementation(() => ({
    isEnabled: vi.fn(async () => false),
    enable: vi.fn(async () => true),
    disable: vi.fn(async () => true),
  }));
});
import AutoLaunch from 'auto-launch';
import { setAutoStart, getAutoStart } from './autostart';

describe('autostart', () => {
  it('setAutoStart(true) 调用 enable', async () => {
    await setAutoStart(true);
    expect((AutoLaunch as any).mock.results[0]?.value?.enable).toBeTruthy();
  });
  it('getAutoStart 返回布尔', async () => {
    const v = await getAutoStart();
    expect(typeof v).toBe('boolean');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/main/autostart.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 `src/main/autostart.ts`**

```ts
import AutoLaunch from 'auto-launch';
import { app } from 'electron';

const launcher = new AutoLaunch({ name: app.getName(), path: app.getPath('exe') });

export async function setAutoStart(enabled: boolean): Promise<void> {
  if (enabled) await launcher.enable();
  else await launcher.disable();
}

export async function getAutoStart(): Promise<boolean> {
  return launcher.isEnabled();
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run src/main/autostart.test.ts`
Expected: PASS

- [ ] **Step 5: 在 `index.ts` 启动时:`if (getSettings().autoStart) setAutoStart(true)`;在 ipc `autostart:toggle` 中 `setSettings({ autoStart: enabled })` 后调用 `setAutoStart`**

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: 开机自启"
```

---

## 阶段 8:自动更新(GitHub Releases)

**Files:**
- Create: `src/main/updater.ts`
- Test: `src/main/updater.test.ts`
- Modify: `src/main/ipc.ts`(update:check/download/install/status)、`src/main/index.ts`(启动检查 + 定时)

- [ ] **Step 1: 写失败测试 `reduceUpdateEvent` 状态机**

```ts
// src/main/updater.test.ts
import { describe, it, expect } from 'vitest';
import { reduceUpdateEvent, initialUpdateState } from './updater';

describe('reduceUpdateEvent', () => {
  it('idle -> checking', () => {
    expect(reduceUpdateEvent(initialUpdateState, { type: 'checking' }).status).toBe('checking');
  });
  it('checking -> available', () => {
    const s = reduceUpdateEvent(initialUpdateState, { type: 'checking' });
    expect(reduceUpdateEvent(s, { type: 'available', version: '2.0' }).status).toBe('available');
  });
  it('available -> downloading with progress', () => {
    const s = reduceUpdateEvent(initialUpdateState, { type: 'available', version: '2.0' });
    const d = reduceUpdateEvent(s, { type: 'downloading', percent: 50 });
    expect(d.status).toBe('downloading');
    expect(d.percent).toBe(50);
  });
  it('downloading -> ready', () => {
    const s = reduceUpdateEvent(initialUpdateState, { type: 'downloading', percent: 100 });
    expect(reduceUpdateEvent(s, { type: 'downloaded' }).status).toBe('ready');
  });
  it('not-available -> idle', () => {
    const s = reduceUpdateEvent(initialUpdateState, { type: 'checking' });
    expect(reduceUpdateEvent(s, { type: 'not-available' }).status).toBe('idle');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest run src/main/updater.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 `reduceUpdateEvent` + 编排 `src/main/updater.ts`**

```ts
import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready';
  version?: string;
  percent?: number;
}
export const initialUpdateState: UpdateState = { status: 'idle' };

export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded' }
  | { type: 'error'; message: string };

export function reduceUpdateEvent(state: UpdateState, event: UpdateEvent): UpdateState {
  switch (event.type) {
    case 'checking': return { ...state, status: 'checking' };
    case 'available': return { status: 'available', version: event.version };
    case 'not-available': return { status: 'idle' };
    case 'downloading': return { status: 'downloading', percent: event.percent };
    case 'downloaded': return { status: 'ready', version: state.version };
    case 'error': return { status: 'idle' };
  }
}

let state = initialUpdateState;
const subscribers = new Set<(s: UpdateState) => void>();

function emit(s: UpdateState) { state = s; subscribers.forEach((fn) => fn(s)); }

export function getUpdateState() { return state; }
export function onUpdateStatus(fn: (s: UpdateState) => void) {
  subscribers.add(fn); return () => subscribers.delete(fn);
}

export function initUpdater(getWindows: () => BrowserWindow[]) {
  autoUpdater.on('checking-for-update', () => emit(reduceUpdateEvent(state, { type: 'checking' })));
  autoUpdater.on('update-available', (info) => emit(reduceUpdateEvent(state, { type: 'available', version: info.version })));
  autoUpdater.on('update-not-available', () => emit(reduceUpdateEvent(state, { type: 'not-available' })));
  autoUpdater.on('download-progress', (p) => emit(reduceUpdateEvent(state, { type: 'downloading', percent: Math.round(p.percent) })));
  autoUpdater.on('update-downloaded', () => emit(reduceUpdateEvent(state, { type: 'downloaded' })));
  autoUpdater.on('error', (e) => emit(reduceUpdateEvent(state, { type: 'error', message: String(e) })));
  // 转发给所有设置窗口
  onUpdateStatus((s) => getWindows().forEach((w) => w.webContents.send('update:status', s)));
}

export function checkForUpdates() { return autoUpdater.checkForUpdates(); }
export function downloadUpdate() { return autoUpdater.downloadUpdate(); }
export function installUpdate() { return autoUpdater.quitAndInstall(); }
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest run src/main/updater.test.ts`
Expected: PASS

- [ ] **Step 5: 在 `ipc.ts` 注册 `update:check`/`update:download`/`update:install`/`update:status`;在 `index.ts` 启动后 `initUpdater(...)`,若 `update.autoCheck` 则 `checkForUpdates()` + `setInterval(checkForUpdates, 4*3600*1000)`**

- [ ] **Step 6: 在 React `UpdatePanel.tsx` 订阅 `onUpdateStatus`,显示状态/版本/按钮(「检查更新」「下载更新」「重启安装」)**

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: GitHub Releases 自动更新"
```

---

## 阶段 9:打包与分发

**Files:**
- Create: `electron-builder.yml`、`resources/icon.ico`、`resources/icon.png`、`resources/icon.icns`(可选)
- Modify: `package.json`(build.publish、dist 脚本、version)

- [ ] **Step 1: 编写 `electron-builder.yml`**

```yaml
appId: com.isee.browser
productName: isee-browser
directories:
  output: release
files:
  - out/**/*
  - resources/**/*
win:
  target: nsis
  icon: resources/icon.ico
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
linux:
  target:
    - AppImage
    - deb
  icon: resources/icon.png
  category: Utility
publish:
  provider: github
  owner: ${GH_OWNER}
  repo: ${GH_REPO}
```

- [ ] **Step 2: `package.json` 增脚本**

```json
"dist:win": "electron-vite build && electron-builder --win",
"dist:linux": "electron-vite build && electron-builder --linux"
```

- [ ] **Step 3: 准备图标资源(至少 icon.png;Win 用 icon.ico;Linux 用 icon.png)**

- [ ] **Step 4: 本地验证**

Run: `npm run dist:win` → `release/` 产出 `.exe`
Expected: 安装包生成成功

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "build: 打包配置"
```

---

## 阶段 10:文档与冒烟测试

**Files:**
- Create: `README.md`(中文)
- Verify: 设计规格与计划文档已就位

- [ ] **Step 1: 写中文 README**

内容:项目简介、环境要求(Node 版本)、开发(`npm install` / `npm run dev`)、打包(`npm run dist:win` / `dist:linux`)、更新配置(GitHub Releases;私有仓库设置 `GH_TOKEN` 与 `publish.private`)、Kiosk 使用说明(托盘菜单与快捷键)、设置项说明。

- [ ] **Step 2: 冒烟矩阵**

- Win10/11:全屏 Kiosk 启动 → 加载默认地址 → 播放音视频/查看 ECharts/SVG/canvas → 下载(另存为)→ 设置面板改地址/开机自启 → 检查更新流程
- Ubuntu AppImage:同上;验证硬件加速与编解码;验证开机自启(.desktop)
- 更新流程:用 staging GitHub Release 发布高版本,验证「发现新版本 → 下载 → 重启安装」

- [ ] **Step 3: (可选)设置面板访问密码**

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "docs: 文档与冒烟测试"
```

---

## 测试策略汇总

- 纯函数优先 TDD(Vitest):`buildWindowOptions`、`validateSettings`、`isAllowedNavigation`、`resolveDownloadPath`、`buildClearOptions`、`reduceUpdateEvent`、autostart 封装
- IPC 处理器:mock 依赖单测
- React 组件:Vitest + Testing Library
- 集成/手动:Win+Linux 冒烟;更新流程用 staging GitHub Release 验证

## 风险与缓解

- Linux 专有编解码:Electron 内置;AppImage 自带依赖兜底
- GitHub 限流/私有仓库:文档化 token 配置
- Kiosk 逃逸:托盘+快捷键受控;可选设置密码

## 执行方式

逐阶段实现(subagent-driven-development),每阶段结束审查(运行测试 + 构建验证),每阶段一个 git 提交,失败测试先于实现。
