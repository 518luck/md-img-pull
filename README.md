# md-img-pull

一个用于将 Markdown 中的网络图片下载到本地、统一重写引用路径并对超大图片进行压缩的命令行工具。适合将笔记、博客中的媒体资源"本地化"，让内容更可移植、更易备份。

## 功能概述

- 递归扫描文件夹或处理单个 `.md` 文件
- 仅处理以 `http` 开头的图片链接，已本地化的相对/本地路径会跳过
- 将图片保存到目标 Markdown 同级的 `assets/` 目录，文件名为内容哈希
- 所有非 SVG 图片统一转为 WebP 格式，大幅减小文件体积；超大图片自动压缩
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
  - 保存为 `assets/<hash>.webp` 并将 Markdown 中的 URL 改为相对路径 `./assets/<hash>.webp`
- 并发与大图串行
  - 总并发槽位数为 5
  - 普通图片占用 1 槽位并发下载
  - 超大图片（> 20MB）会"独占"全部槽位，串行下载与压缩，避免内存与带宽拥塞
- 格式转换与压缩
  - 所有非 SVG 图片统一转换为 WebP 格式（quality≈80），大幅减小文件体积
  - 超过 10MB 的大图会进行渐进式压缩：首先转 WebP；仍超出则缩放至最大宽度 2560px 并降低质量；最后"保底"极限压缩（quality≈60）
  - SVG 矢量图保持原格式不变
- 进度与日志
  - 使用优雅的命令行进度动画显示当前下载项目与累计进度
  - 处理完成后在输出目录生成 `image-log-*.txt`，记录成功/失败、尺寸变化与汇总统计

## 常见问答

- 已有本地图片会被重复处理吗？不会，工具仅处理 `http` 链接。
- 动图是否保留？在支持的情况下，WebP 保留原始 GIF/APNG 的动画（由 `sharp` 处理）。
- 我能调整并发或压缩阈值吗？可以，修改源码中的常量后重新构建：
  - 并发与大图阈值：[`utils/Semaphore.ts`](./utils/Semaphore.ts)
  - 压缩目标与质量：[`utils/imageCompression.ts`](./utils/imageCompression.ts)

## 代码入口与关键模块

- CLI 入口与交互：[`main.ts`](./main.ts)
- Markdown 解析与图片节点收集：[`utils/processSingleMarkdown.ts`](./utils/processSingleMarkdown.ts)
- 下载、本地化与重写：[`utils/downloader.ts`](./utils/downloader.ts)
- 图片压缩与格式转换：[`utils/imageCompression.ts`](./utils/imageCompression.ts)
- 并发控制（信号量）：[`utils/Semaphore.ts`](./utils/Semaphore.ts)
- 下载进度动画：[`utils/downloadProgress.ts`](./utils/downloadProgress.ts)
- 压缩进度动画：[`utils/compressionProgress.ts`](./utils/compressionProgress.ts)
- 处理日志管理：[`utils/imageLog.ts`](./utils/imageLog.ts)

## 构建与发布

- 使用 `esbuild` 打包为 CJS，并通过 `bin` 暴露命令 `md-img-p`
- 打包脚本：`pnpm build`
- 包配置与入口：[`package.json`](./package.json)

## 更新日志

### v1.1.0

- **新功能**：所有非 SVG 图片统一转换为 WebP 格式，大幅减小产物体积
- **优化**：新增压缩进度管理器，修复多个大图同时压缩时 spinner 冲突的问题
- **优化**：添加 `image/webp` MIME 类型支持

### v1.0.1

- **修复**：优化大图下载并发控制，避免死锁问题

### v1.0.0

- 初始版本发布
- 支持 Markdown 图片本地化
- 支持超大图片自动压缩
- 并发下载与进度显示

## 许可

ISC License
