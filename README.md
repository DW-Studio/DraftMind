# DraftMind

> 你主导，AI 辅助 —— 一个让写作者保持控制权的 AI 写作工作台。

DraftMind 不是帮你代写文章的 AI 工具。它像一个坐在你旁边的编辑：压力测试你的论点、帮你设计文章结构、按你的风格展开段落、最后做红队审查。每一步的输出你都可以编辑修改，AI 不是流水线，你是驾驶座上的那个人。

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

---

## 四阶段工作流

```
素材分析          →     逻辑框架         →     段落展开         →     红队教练
(AI 压力测试)         (AI 设计结构)          (AI 展开初稿)          (三维审查)
     ↓ 你审核编辑           ↓ 你审核编辑
```

| 阶段 | 做什么 | 驱动模型 |
|------|--------|---------|
| **素材分析** | 对你的论点进行压力测试，找出薄弱点、盲区，提炼核心问题 | Kimi K2.6 |
| **逻辑框架** | 基于核心问题设计论证路径，输出 4-6 段的结构大纲 | Claude Opus 4 |
| **段落展开** | 按你的写作风格，将指定段落展开为完整初稿 | Claude Opus 4 |
| **红队教练** | 从素材溯源性、简洁性、风格一致性三个维度审查 | GPT-5.5 |

每阶段 AI 输出后，你可以在右侧面板**原地编辑**——修改、删减、重写——修改后的版本自动流入下一阶段。

---

## 快速开始

### 前置条件

- Node.js 18+
- [AIHubMix API Key](https://aihubmix.com)
- 或[OpenRouter API Key](https://openrouter.ai/)
- 或官方

### 安装

```bash
git clone https://github.com/DW-Studio/DraftMind.git
cd DraftMind
npm install
npm run dev
```

打开 http://localhost:3000（端口被占用时自动使用 3001）

### 配置

首次打开会弹出配置向导，填入API Key 和 Base URL：

```
API Key:  sk-xxxxxxxx
Base URL: https://aihubmix.com
```

---



## 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand (persist → localStorage)
- **编辑器**: Milkdown (ProseMirror)
- **AI 接入**: SSE 流式请求 → Next.js API 代理 → AIHubMix

---

## 你的数据在哪？

**全部在你的浏览器 localStorage 里。** 文章、API Key、工作台输出都不会上传到任何服务器。

换浏览器或清除缓存会丢失数据——建议导出为 Markdown 文件备份。

---

## 写作风格

内置 4 种风格，支持自定义：

| 风格 | 文风特点 |
|------|---------|
| Naval 认知哲学 | 极简、短句、第一性原理 |
| 硬核技术与独立开发 | 痛点→机制→杠杆 |
| 系统复盘与原子习惯 | 客观、因果、环境设计 |
| 旷野游牧与生活纪实 | 松弛、画面感、在路上 |

---

## 项目结构

```
src/
├── app/
│   ├── page.tsx                    # 入口页
│   └── api/ai/chat/completions/    # API 代理路由
├── components/
│   ├── ai/AIPanel.tsx              # 右侧 AI 面板
│   ├── editor/MarkdownEditor.tsx   # 编辑器
│   └── layout/MainLayout.tsx       # 三栏布局
├── store/useStore.ts               # Zustand 全局状态
├── types/store.ts                  # 类型定义
└── lib/openrouter.ts              # SSE 流式请求工具
```

---

## License

MIT
