"use client";

import { useState } from "react";
import { useStore } from "@/store";

// ============================================================
// ArticleSidebar — 文档管理侧边栏
// 提供文章列表、新建、删除等功能
// ============================================================

interface ArticleSidebarProps {
  /** 侧边栏是否展开 */
  expanded: boolean;
  /** 切换展开/收起状态的回调 */
  onToggle: () => void;
}

export function ArticleSidebar({ expanded, onToggle }: ArticleSidebarProps) {
  // Store 订阅
  const articles = useStore((s) => s.articles);
  const currentArticleId = useStore((s) => s.currentArticleId);
  const setCurrentArticle = useStore((s) => s.setCurrentArticle);
  const createNewArticle = useStore((s) => s.createNewArticle);
  const deleteArticleById = useStore((s) => s.deleteArticleById);

  // 本地状态
  const [hoveredArticleId, setHoveredArticleId] = useState<string | null>(null);

  // 创建新文章
  const handleCreateNewArticle = () => {
    const newId = createNewArticle();
    setCurrentArticle(newId);
  };

  // 删除文章
  const handleDeleteArticle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡到文章项点击事件
    if (articles.length <= 1) return; // 至少保留一篇文章
    
    deleteArticleById(id);
    
    // 如果删除的是当前文章，则切换到第一篇文章
    if (id === currentArticleId && articles.length > 1) {
      const remainingArticles = articles.filter(a => a.id !== id);
      if (remainingArticles.length > 0) {
        setCurrentArticle(remainingArticles[0].id);
      }
    }
  };

  // 切换到指定文章
  const handleSelectArticle = (id: string) => {
    setCurrentArticle(id);
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`flex flex-col h-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-r border-zinc-200 dark:border-zinc-800 flex-shrink-0 ${expanded ? "w-60" : "w-12"}`}>
      {expanded ? (
        <>
          {/* 顶部操作栏 */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={handleCreateNewArticle}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-medium"
            >
              <span className="text-lg">+</span>
              <span>新建文章</span>
            </button>
          </div>

          {/* 文章列表 */}
          <div className="flex-1 overflow-y-auto p-2">
            {articles.length === 0 ? (
              <div className="text-center text-zinc-400 dark:text-zinc-500 text-sm py-8">
                暂无文章
              </div>
            ) : (
              <ul className="space-y-1">
                {articles.map((article) => (
                  <li
                    key={article.id}
                    className={`group flex items-center justify-between rounded-lg p-2 cursor-pointer transition-colors ${
                      currentArticleId === article.id
                        ? "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                    }`}
                    onClick={() => handleSelectArticle(article.id)}
                    onMouseEnter={() => setHoveredArticleId(article.id)}
                    onMouseLeave={() => setHoveredArticleId(null)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-medium">
                        {article.title}
                      </div>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                        {formatTime(article.updatedAt)}
                      </div>
                    </div>
                    {hoveredArticleId === article.id && articles.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteArticle(article.id, e)}
                        className="ml-2 p-1.5 rounded text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label="删除文章"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 折叠按钮 */}
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={onToggle}
              className="w-full py-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors text-sm"
            >
              ← 收起
            </button>
          </div>
        </>
      ) : (
        // 收起状态：只显示展开按钮
        <div className="flex flex-col h-full items-center justify-center overflow-hidden">
          <button
            onClick={onToggle}
            className="p-2 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors group flex-shrink-0"
            aria-label="展开侧边栏"
          >
            <ExpandIcon className="h-5 w-5 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
          </button>
          <div className="mt-4 text-xs font-medium text-zinc-400 dark:text-zinc-500 whitespace-nowrap tracking-widest" style={{ writingMode: 'vertical-rl' }}>
            文档管理
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 图标组件
// ============================================================

function TrashIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}