# md-img-pull

一个用于将 Markdown 中的网络图片下载到本地、统一重写引用路径并对超大图片进行压缩的命令行工具。适合将笔记、博客中的媒体资源“本地化”，让内容更可移植、更易备份。

## 功能概述

- 递归扫描文件夹或处理单个 `.md` 文件
- 仅处理以 `http` 开头的图片链接，已本地化的相对/本地路径会跳过
- 将图片保存到目标 Markdown 同级的 `assets/` 目录，文件名为内容哈希
- 对超过阈值的图片自动压缩，必要时统一转为 WebP，尽量保留动画
- 使用并发控制与进度动画，清晰显示下载/压缩过程
- 输出详细的处理日志（成功/失败、尺寸变化）到目标目录

## 安装

- 全局安装（如果已发布到 npm）：
  - `npm i -g @duoyun/md-img-pull` 或 `pnpm add -g @duoyun/md-img-pull`
  - 命令：`md-img-p`
- 本地构建运行（当前仓库）：
  - 安装依赖：`pnpm i`
  - 构建：`pnpm build`
  - 运行：`node dist/main.cjs`

环境要求：推荐 Node.js ≥ 18。依赖 `sharp`，在常见平台会自动下载所需的 libvips。

## 使用说明

- 运行后按提示输入源路径，可以是：
  - 某个 Markdown 文件路径，例如 `C:\Notes\foo.md`
  - 某个目录路径，例如 `C:\Notes`
- 输出位置：
  - 单文件模式：在同目录生成 `foo_localized/`，并包含 `assets/`
  - 目录模式：在同级生成 `Notes_localized/`，保持原有层级结构与 `assets/`
- 若目标目录已存在，会进行交互确认；按回车或输入 `y/yes` 继续，输入 `n` 取消

示例（本地构建后运行）：

```bash
node dist/main.cjs
# 请输入或粘贴需要处理的源文件夹路径: C:\Users\me\Desktop\Notes
```

## 处理策略

- 下载与重写
  - 遍历 Markdown AST 中的 `image` 节点，仅处理 `http` 开头的链接
  - 保存为 `assets/<hash>.<ext>` 并将 Markdown 中的 URL 改为相对路径 `./assets/<hash>.<ext>`
- 并发与大图串行
  - 总并发槽位数为 5
  - 普通图片占用 1 槽位并发下载
  - 超大图片（> 20MB）会“独占”全部槽位，串行下载与压缩，避免内存与带宽拥塞
- 压缩与格式
  - 基准目标：将图片控制在 10MB 内
  - 首先尝试转 WebP（quality≈80）；仍超出则缩放至最大宽度 2560 并再压缩；最后“保底”极限压缩（quality≈60）
  - 如果发生压缩/转码，最终扩展名会改为 `.webp`；SVG 不参与压缩与改码
- 进度与日志
  - 使用优雅的命令行进度动画显示当前下载项目与累计进度
  - 处理完成后在输出目录生成 `image-log-*.txt`，记录成功/失败、尺寸变化与汇总统计

## 常见问答

- 已有本地图片会被重复处理吗？不会，工具仅处理 `http` 链接。
- 动图是否保留？在支持的情况下，WebP 保留原始 GIF/APNG 的动画（由 `sharp` 处理）。
- 我能调整并发或压缩阈值吗？可以，修改源码中的常量后重新构建：
  - 并发与大图阈值：[`Semaphore.ts`](file:///c:/Users/37524/Desktop/md-img-pull/utils/Semaphore.ts)
  - 压缩目标与质量：[`imageCompression.ts`](file:///c:/Users/37524/Desktop/md-img-pull/utils/imageCompression.ts)

## 代码入口与关键模块

- CLI 入口与交互：[`main.ts`](file:///c:/Users/37524/Desktop/md-img-pull/main.ts)
- Markdown 解析与图片节点收集：[`processSingleMarkdown.ts`](file:///c:/Users/37524/Desktop/md-img-pull/utils/processSingleMarkdown.ts)
- 下载、本地化与重写：[`downloader.ts`](file:///c:/Users/37524/Desktop/md-img-pull/utils/downloader.ts)
- 并发控制（信号量）：[`Semaphore.ts`](file:///c:/Users/37524/Desktop/md-img-pull/utils/Semaphore.ts)
- 下载进度动画：[`downloadProgress.ts`](file:///c:/Users/37524/Desktop/md-img-pull/utils/downloadProgress.ts)
- 处理日志管理：[`imageLog.ts`](file:///c:/Users/37524/Desktop/md-img-pull/utils/imageLog.ts)

## 构建与发布

- 使用 `esbuild` 打包为 CJS，并通过 `bin` 暴露命令 `md-img-p`
- 打包脚本：`pnpm build`
- 包配置与入口：[`package.json`](file:///c:/Users/37524/Desktop/md-img-pull/package.json)

## 许可

ISC License
