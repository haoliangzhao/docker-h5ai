# docker-h5ai Fork Changes

本 README 仅记录此 fork 相对于上游项目
[awesometic/docker-h5ai](https://github.com/awesometic/docker-h5ai) 的新增与调整。

## 界面功能

### 深色与浅色主题

- 在标题栏的 “powered by h5ai” 左侧增加主题切换按钮。
- 浅色模式显示太阳图标，深色模式显示月亮图标。
- 图标切换包含旋转、缩放和淡入淡出动画。
- 首次访问时自动跟随浏览器或操作系统的主题偏好。
- 手动选择保存在浏览器 `localStorage` 中，并支持跨标签页同步。
- 深色主题使用中性深灰配色，覆盖标题栏、侧边栏、文件列表、搜索框和 Info 栏等主要区域。
- 遵循系统的“减少动态效果”设置。

### 侧边栏布局

- 左侧边栏从覆盖式布局改为页面布局中的独立列。
- 展开侧边栏时，文件内容区域会自动缩窄并向右调整，不再被遮挡。
- 展开和收起带有平滑过渡动画。
- 当页面宽度不超过 `700px` 时，侧边栏不显示 Tree 和 Info 选项，避免出现无法操作的入口。

### 文件选择样式

- 文件选中标记由 `22px` 缩小为 `16px`。
- 内部勾选图标调整为 `14px`，减少对文件图标和名称的遮挡。

### Info 栏复制链接

- 在 Info 栏二维码下方增加 `Copy link` 按钮。
- 可将当前文件或目录链接复制到系统剪贴板。
- 复制成功或失败时，反馈直接显示在按钮文字中。
- 在 Clipboard API 不可用时自动使用兼容复制方案。
- 按钮同时适配浅色和深色主题。

## 本地开发模式

- 增加 `compose.dev.yml`，提供独立的 Docker Compose 开发环境。
- PHP、JavaScript 和 CSS 源码通过 bind mount 实时映射到容器。
- 修改前端或 PHP 文件后只需刷新浏览器，无需重新构建镜像或容器。
- PHP Opcache 在开发模式下会立即检查文件更新时间。
- h5ai 生成的缓存保存在临时内存挂载中，不会修改宿主机源码权限。
- 预览服务仅监听 `127.0.0.1:8080`。

启动开发预览：

```bash
docker compose -f compose.dev.yml up --build -d
```

访问：<http://127.0.0.1:8080/>

常用命令：

```bash
docker compose -f compose.dev.yml logs -f
docker compose -f compose.dev.yml restart
docker compose -f compose.dev.yml stop
```
