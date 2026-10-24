# 今天吃什么？

一个零依赖、手机优先的随机选餐 PWA。功能：菜品增删改查、搜索、随机抽签、JSON 导入导出、离线访问。

## 1. 本地运行（Windows / VS Code）

1. 解压文件，进入 `what-to-eat` 文件夹。
2. 用 VS Code 打开整个文件夹，菜单“终端 → 新建终端”。
3. 执行 `py -m http.server 5500`（如没有 `py`，改用 `python -m http.server 5500`）。
4. 浏览器打开 http://localhost:5500 ，即可试用。
5. 在终端按 Ctrl+C 停止服务。

注意：不要直接双击打开 `index.html`。PWA / Service Worker 需要 `localhost` 或 HTTPS 才能正常工作。

## 2. 发布到 GitHub Pages

1. 在 GitHub 创建**公开**仓库 `what-to-eat`（可以先不添加 README）。
2. 在项目目录打开终端，执行：

```powershell
git init
git add .
git commit -m "Initial food picker"
git branch -M main
git remote add origin git@github.com:你的GitHub用户名/what-to-eat.git
git push -u origin main
```

如果本地已有 Git 仓库，请按实际情况调整命令；使用 HTTPS 地址也可以。

3. GitHub 仓库 → Settings → Pages → Build and deployment → Source 选 `Deploy from a branch`，Branch 选 `main`、文件夹选 `/(root)` → Save。
4. 访问 `https://你的GitHub用户名.github.io/what-to-eat/`（等待 Pages 部署成功）。

## 3. 添加到手机桌面

- Android：用 Chrome 打开发布网址 → 右上角菜单 → “安装应用”或“添加到主屏幕”。
- iPhone：Safari 打开网址 → 分享 → “添加到主屏幕”。

注：不同浏览器和系统版本菜单名称略有差异。

## 4. 数据与备份

- 菜单仅保存于**当前浏览器环境的 localStorage**，不同手机、浏览器以及 PWA 安装后可能使用不同存储空间，不自动同步。
- 初次进入提供 7 道演示菜品，可直接修改或删除。
- 「我的食谱」底部可导出 JSON，之后可导入恢复；导入将**覆盖**当前食谱，并会请求确认。
- 网站不包含帐号、后端或分析 SDK，也不会将食谱上传到 GitHub。
- 发布的是网页源码及默认演示菜品，而非你添加的个人菜品。
- 清除浏览器网站数据或删除应用可能导致食谱丢失，请定期导出。

## 5. 文件结构

```text
what-to-eat/
├── index.html             页面结构
├── styles.css             页面样式
├── app.js                 菜单管理、存储、抽签逻辑
├── manifest.webmanifest   PWA 安装配置
├── sw.js                  断网缓存
├── .nojekyll              告诉 GitHub Pages 不走 Jekyll 构建
└── icons/
        ├── icon-192.png
        ├── icon-512.png
        └── icon.svg             粉色猫咪图标源文件
```

修改发布代码后推送 GitHub 即可部署新版本；若 Service Worker 的预缓存列表有变更，记得同步更新 `sw.js` 及其 `APP_CACHE` 版本号。
