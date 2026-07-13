"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Editor, rootCtx } from "@milkdown/core";
import { commonmark } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { nord } from "@milkdown/theme-nord";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { replaceAll } from "@milkdown/utils";
import { history } from "@milkdown/plugin-history";
import { useStore } from "@/store";
import { listInputRules } from "@/editor/plugins/list-inputrules";

// ============================================================
// MarkdownEditor — Obsidian 风格单窗格 Markdown 编辑器
// 基于 Milkdown（ProseMirror 引擎），输入 Markdown 语法后
// 在同一窗格内即时渲染为排版效果（标题、加粗、列表等）
//
// 架构：
// 1. Editor.make() 初始化 → 挂载到 containerRef
// 2. listener.markdownUpdated → 防抖同步到 Zustand Store
// 3. replaceAll() → 切换文章时替换全部内容
// ============================================================

const DEBOUNCE_MS = 300;

export function MarkdownEditor() {
  // ---- Zustand Store 订阅 ----
  const currentArticleId = useStore((s) => s.currentArticleId);
  const currentArticle = useStore((s) =>
    s.currentArticleId
      ? s.articles.find((a) => a.id === s.currentArticleId) ?? null
      : null
  );
  const updateArticle = useStore((s) => s.updateArticle);
  const setSelectedText = useStore((s) => s.setSelectedText);

  // ---- 本地标题状态 ----
  const [localTitle, setLocalTitle] = useState(currentArticle?.title ?? "");
  const [copySuccess, setCopySuccess] = useState(false);
  // 本地内容状态：立即响应输入，避免 placeholder 因防抖延迟消失
  const [hasLocalContent, setHasLocalContent] = useState(!!currentArticle?.content);

  // ---- 编辑器相关 ref ----
  const editorRef = useRef<Editor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  /** 标记是否为内部 replaceAll 触发的 markdownUpdated，避免循环同步 */
  const isInternalChange = useRef(false);
  /** 选区防抖定时器 */
  const selectionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 保存最新 currentArticleId 供闭包使用 */
  const articleIdRef = useRef(currentArticleId);
  articleIdRef.current = currentArticleId;

  // ---- 初始化 Milkdown 编辑器（仅挂载时执行一次） ----
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const editor = Editor.make()
      .config(nord)
      .config((ctx) => {
        ctx.set(rootCtx, container);
        // 监听 markdown 内容变化 → 防抖同步到 Store
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          setHasLocalContent(markdown.trim().length > 0);
          if (isInternalChange.current) return;
          scheduleContentSync(markdown);
        });
      })
      .use(listInputRules)
      .use(commonmark)
      .use(gfm)
      .use(history as any)
      .use(listener);

    editor.create().then(() => {
      editorRef.current = editor;
      // 设置初始内容（如果有）
      if (currentArticle?.content) {
        isInternalChange.current = true;
        editor.action(replaceAll(currentArticle.content, true));
        isInternalChange.current = false;
      }
    });

    return () => {
      editor.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 粘贴时立即隐藏 placeholder（DOM 操作，绕过 React 渲染延迟） ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const hide = () => {
      setHasLocalContent(true);
      if (placeholderRef.current) {
        placeholderRef.current.style.display = 'none';
      }
    };
    el.addEventListener('paste', hide);
    return () => el.removeEventListener('paste', hide);
  }, []);

  // ---- 切换文章时替换编辑器内容 ----
  const prevArticleIdRef = useRef(currentArticleId);
  useEffect(() => {
    if (currentArticleId !== prevArticleIdRef.current) {
      prevArticleIdRef.current = currentArticleId;
      setLocalTitle(currentArticle?.title ?? "");
      // 替换编辑器内容
      if (editorRef.current) {
        isInternalChange.current = true;
        editorRef.current.action(
          replaceAll(currentArticle?.content ?? "", true)
        );
        isInternalChange.current = false;
      }
    }
  }, [currentArticleId, currentArticle]);

  // ---- 防抖同步 ----
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const localTitleRef = useRef(localTitle);
  localTitleRef.current = localTitle;

  const syncTitle = useCallback(() => {
    if (!currentArticleId) return;
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      updateArticle(articleIdRef.current!, { title: localTitleRef.current });
    }, DEBOUNCE_MS);
  }, [currentArticleId, updateArticle]);

  /** 防抖同步 markdown 内容到 Store */
  const scheduleContentSync = useCallback(
    (markdown: string) => {
      if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
      contentDebounceRef.current = setTimeout(() => {
        if (articleIdRef.current) {
          updateArticle(articleIdRef.current, { content: markdown });
        }
      }, DEBOUNCE_MS);
    },
    [updateArticle]
  );

  // 卸载时清理定时器
  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
      if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
      if (selectionDebounceRef.current) clearTimeout(selectionDebounceRef.current);
    };
  }, []);

  // ---- 复制到剪贴板功能 ----
  const copyToClipboard = async () => {
    if (!currentArticle) return;
    
    try {
      await navigator.clipboard.writeText(currentArticle.content);
      setCopySuccess(true);
      
      // 重置成功状态
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('复制失败，请手动复制');
    }
  };

  // ---- 划词选中监听（轻量，防抖 150ms，仅 >10 字符时更新 Store） ----
  useEffect(() => {
    const MIN_SELECTION_LENGTH = 10;
    const SELECTION_DEBOUNCE_MS = 150;

    const handleSelectionChange = () => {
      if (selectionDebounceRef.current) {
        clearTimeout(selectionDebounceRef.current);
      }

      selectionDebounceRef.current = setTimeout(() => {
        const sel = window.getSelection();

        // 无选区或选区已折叠 → 清空
        if (!sel || sel.isCollapsed) {
          setSelectedText(null);
          return;
        }

        // 选区不在编辑器容器内 → 忽略（避免影响标题栏等）
        if (!containerRef.current?.contains(sel.anchorNode)) {
          return;
        }

        const text = sel.toString().trim();
        setSelectedText(text.length >= MIN_SELECTION_LENGTH ? text : null);
      }, SELECTION_DEBOUNCE_MS);
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (selectionDebounceRef.current) {
        clearTimeout(selectionDebounceRef.current);
      }
    };
  }, [setSelectedText]);

  // ---- 最后保存时间 ----
  const lastSavedText = useMemo(() => {
    if (!currentArticle?.updatedAt) return "";
    return new Date(currentArticle.updatedAt).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [currentArticle?.updatedAt]);

  // ---- 字数统计（先剥 Markdown，中文按字、英文按词） ----
  const wordCount = useMemo(() => {
    let text = currentArticle?.content || '';
    if (!text.trim()) return 0;
    
    // 去掉 Markdown 语法标记，保留纯文本
    text = text
      .replace(/```[\s\S]*?```/g, ' ')       // 代码块
      .replace(/`[^`]*`/g, ' ')              // 行内代码
      .replace(/!\[.*?\]\(.*?\)/g, ' ')      // 图片
      .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // 链接保留文字
      .replace(/^#{1,6}\s+/gm, '')           // 标题标记
      .replace(/[*_~>]{1,3}/g, '')           // 粗体/斜体/删除线/引用
      .replace(/^\s*[-*+]\s+/gm, '')         // 无序列表
      .replace(/^\s*\d+\.\s+/gm, '');        // 有序列表
    
    // 中文字符每个算 1 字
    const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uF900-\uFAFF]/g) || []).length;
    // 去掉中文后，英文按词计
    const noCjk = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uF900-\uFAFF]/g, ' ');
    const en = noCjk.trim()
      ? noCjk.split(/\s+/).filter(w => /[a-zA-Z0-9]/.test(w)).length
      : 0;
    
    return cjk + en;
  }, [currentArticle?.content]);

  // ---- 空状态 ----
  if (!currentArticle) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center text-zinc-400 dark:text-zinc-500">
          <p className="text-lg font-medium">没有打开的文章</p>
          <p className="mt-1 text-sm">点击「新建文章」开始写作</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* ---- 顶部标题栏 ---- */}
      <header className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="flex justify-between items-start">
          <input
            type="text"
            value={localTitle}
            onChange={(e) => {
              setLocalTitle(e.target.value);
              syncTitle();
            }}
            placeholder="未命名文章"
            className="w-full text-xl font-semibold text-zinc-900 dark:text-zinc-100
                       placeholder:text-zinc-300 dark:placeholder:text-zinc-600
                       bg-transparent border-0 outline-none mr-4"
          />
          <button
            onClick={copyToClipboard}
            className={`p-2 rounded-md transition-colors ${
              copySuccess
                ? 'bg-emerald-500 text-white'
                : 'border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
            title="一键复制"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-clipboard"
            >
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            </svg>
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
          Markdown 实时渲染 · {wordCount} 字 · 最后保存：{lastSavedText}
        </p>
      </header>

      {/* ---- 编辑器区域容器（相对定位）---- */}
      <div className="flex-1 min-h-0 relative">
        {/* ---- Milkdown 编辑器（单窗格，输入即渲染）---- */}
        <div
          ref={containerRef}
          className={`h-full w-full overflow-auto milkdown-editor ${!currentArticle?.content ? 'empty-editor' : ''} [&_.ProseMirror]:break-words [&_.ProseMirror]:overflow-wrap-anywhere`}
        />
        {/* 显示步骤提示，当编辑器内容为空时 */}
        {!hasLocalContent && (
          <div ref={placeholderRef} className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
            <div className="text-center max-w-lg w-full px-4 text-zinc-400 dark:text-zinc-500">
              <h3 className="text-lg font-medium mb-4">【DraftMind — 你主导，AI 辅助】</h3>
              <div className="text-left space-y-2">
                <p className="flex items-start">
                  <span className="inline-block w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">1</span>
                  <span>在编辑器中写下或粘贴你的素材、想法、引用——无需格式。</span>
                </p>
                <p className="flex items-start">
                  <span className="inline-block w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">2</span>
                  <span>右侧选择「素材分析」→ AI 对你的论点进行压力测试，找出薄弱点和盲区。</span>
                </p>
                <p className="flex items-start">
                  <span className="inline-block w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">3</span>
                  <span>审核 AI 分析结果 → 编辑修改 → 进入「逻辑框架」→ AI 设计文章结构。</span>
                </p>
                <p className="flex items-start">
                  <span className="inline-block w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">4</span>
                  <span>在「段落展开」中扩展为初稿 → 用「红队教练」审查打磨 → 完成。</span>
                </p>
              </div>
              <p className="mt-6 text-sm">开始输入你的第一行素材...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
