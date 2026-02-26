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
  - 单文件模式：在同目录生成 `foo_localized/part_1/`，并包含 `assets/`
  - 目录模式：在同级生成 `Notes_localized/part_X/`，保持原有层级结构与 `assets/`
  - 每个分区约 50MB，超过后自动创建新分区（当前文件会处理完再切换）
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
  - 单行实时进度显示：`⠼ ░░░░░░░░░░░░░░░░░░░░ 0/86 | 分区1 (12MB) | 文件名.md (5s) | ↓ 4/7 | 30s`
  - 显示内容：总进度、分区大小、当前文件、下载/压缩状态、累计时间
  - 处理完成后在输出目录生成 `image-log-*.txt`，记录成功/失败、尺寸变化与汇总统计

## 常见问答

- 已有本地图片会被重复处理吗？不会，工具仅处理 `http` 链接。
- 动图是否保留？在支持的情况下，WebP 保留原始 GIF/APNG 的动画（由 `sharp` 处理）。
- 我能调整并发或压缩阈值吗？可以，修改源码中的常量后重新构建：
  - 并发与大图阈值：[`utils/Semaphore.ts`](./utils/Semaphore.ts)
  - 压缩目标与质量：[`utils/imageCompression.ts`](./utils/imageCompression.ts)
  - 分区大小限制：[`main.ts`](./main.ts) 中的 `PARTITION_SIZE_LIMIT`

## 代码入口与关键模块

- CLI 入口与交互：[`main.ts`](./main.ts)
- Markdown 解析与图片节点收集：[`utils/processSingleMarkdown.ts`](./utils/processSingleMarkdown.ts)
- 下载、本地化与重写：[`utils/downloader.ts`](./utils/downloader.ts)
- 图片压缩与格式转换：[`utils/imageCompression.ts`](./utils/imageCompression.ts)
- 并发控制（信号量）：[`utils/Semaphore.ts`](./utils/Semaphore.ts)
- 统一进度管理：[`utils/progressManager.ts`](./utils/progressManager.ts)
- 处理日志管理：[`utils/imageLog.ts`](./utils/imageLog.ts)
- 文件夹大小计算：[`utils/getFolderSize.ts`](./utils/getFolderSize.ts)

## 构建与发布

- 使用 `esbuild` 打包为 CJS，并通过 `bin` 暴露命令 `md-img-p`
- 打包脚本：`pnpm build`
- 包配置与入口：[`package.json`](./package.json)

## 更新日志

### v1.2.3

- **优化**: 移除console.log语句

### v1.2.2

- **优化**：在 `getFilesRecursive` 中对读取的子项进行自然排序，使数字按数值大小排序（避免 1, 10, 2 的字典序问题）

### v1.2.1

- **修复**：优化进度显示稳定性，减少刷新频率，解决抖动问题
- **优化**：缩短进度条和文件名显示，避免终端换行导致的显示异常

### v1.2.0

- **新功能**：分区输出 - 自动将输出按约 50MB 分割为多个 `part_X` 文件夹，方便管理和传输
- **优化**：全新的单行进度显示，实时显示分区大小、下载/压缩状态、累计时间
- **优化**：精简日志输出，移除冗余信息

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
