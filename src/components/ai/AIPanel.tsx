"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useStore } from "@/store";
import { SettingsModal } from "@/components/SettingsModal";
import { WorkflowStage } from "@/types/store";

// ============================================================
// AIPanel — AI 诊断面板
// 位于右侧 40% 区域，支持 light/dark mode
// 支持划词诊断、SSE 流式输出、中止请求、清空诊断
// ============================================================

export function AIPanel() {
  // ---- 设置面板显隐 ----
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ---- 原地编辑状态 ----
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);
  const [editDraft, setEditDraft] = useState('');

  // ---- 主题 ----
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  // ---- 工作流状态 ----
  const activeStage = useStore((s) => s.activeStage);
  const setActiveStage = useStore((s) => s.setActiveStage);
  const coachMode = useStore((s) => s.coachMode);
  const setCoachMode = useStore((s) => s.setCoachMode);

  // ---- 写作风格 & 模型 ----
  const activeStyleId = useStore((s) => s.activeStyleId);
  const writingStyles = useStore((s) => s.writingStyles);
  const setActiveStyle = useStore((s) => s.setActiveStyle);
  const activeProvider = useStore((s) => s.userSettings.activeProvider);
  const activeModel = useStore((s) => s.userSettings.activeModel);
  const configMode = useStore((s) => s.configMode);
  const proxyConfig = useStore((s) => s.proxyConfig);
  const activeStyle = writingStyles.find((s) => s.id === activeStyleId);
  
  // ---- 诊断状态 & 操作 ----
  const diagnosisStream = useStore((s) => s.diagnosisStream);
  const isStreaming = useStore((s) => s.isStreaming);
  const diagnosisError = useStore((s) => s.diagnosisError);
  const startDiagnosis = useStore((s) => s.startDiagnosis);
  const abortDiagnosis = useStore((s) => s.abortDiagnosis);
  const clearDiagnosis = useStore((s) => s.clearDiagnosis);
  const updateWorkbenchOutput = useStore((s) => s.updateWorkbenchOutput);
  const currentArticle = useStore((s) =>
    s.currentArticleId
      ? s.articles.find((a) => a.id === s.currentArticleId) ?? null
      : null
  );

  // ---- 写作工作台 ----
  const workbench = useStore((s) => s.workbench);
  const stages: WorkflowStage[] = ['material', 'framework', 'writing', 'coaching'];
  const activeStageIndex = stages.indexOf(activeStage);
  const stageLabels: Record<WorkflowStage, string> = {
    material: '素材分析', framework: '逻辑框架', writing: '段落展开', coaching: '红队教练'
  };

  // 获取当前阶段模型名称
  const getModelName = (stage: WorkflowStage) => {
    if (configMode === 'proxy') {
      // 中转站模式：根据阶段和代理提供商确定模型
      const proxyModels = {
        material: proxyConfig.provider === 'aihubmix' ? 'kimi-k2.6' : 'moonshotai/moonshot-v1-8k',
        framework: proxyConfig.provider === 'aihubmix' ? 'claude-opus-4-6' : 'anthropic/claude-opus-4',
        writing: proxyConfig.provider === 'aihubmix' ? 'claude-opus-4-6' : 'anthropic/claude-3.5-sonnet',
        coaching: 'gpt-5.5'
      };
      return proxyModels[stage];
    } else {
      // 官方直连模式：保持原有逻辑
      const models = {
        material: "Moonshot v1-8k",
        framework: "Claude Opus 4",
        writing: "Claude 3.5 Sonnet",
        coaching: "GPT-4o"
      };
      return models[stage];
    }
  };

  // ---- 划词选中 ----
  const selectedText = useStore((s) => s.selectedText);

  // ---- 组件卸载时中止进行中的请求 ----
  useEffect(() => {
    return () => {
      // cleanup：如果流还在进行中，中止它
      abortDiagnosis();
    };
    // abortDiagnosis 是稳定引用，无需加入 deps
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================================
  // 主题切换：light → dark → system 循环
  // ============================================================
  const handleThemeToggle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  // ============================================================
  // 诊断按钮点击处理
  // ============================================================
  const handleDiagnose = () => {
    if (isStreaming) return;
    // 优先使用选中文本，否则使用编辑器全文
    const textToAnalyze = selectedText || currentArticle?.content?.trim() || '';
    if (!textToAnalyze) return;
    startDiagnosis(textToAnalyze);
  };

  const handleAbort = () => {
    abortDiagnosis();
  };

  // ============================================================
  // 渲染辅助：Markdown 诊断内容
  // ============================================================
  const renderMarkdownContent = (content: string) => {
    if (!content) {
      return (
        <span className="inline-block text-zinc-400 dark:text-zinc-500">
          等待响应...
        </span>
      );
    }
    return (
      <div className="prose prose-sm max-w-none
        prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100
        prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
        prose-p:text-zinc-700 dark:prose-p:text-zinc-300 prose-p:leading-relaxed
        prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100 prose-strong:font-semibold
        prose-em:text-zinc-700 dark:prose-em:text-zinc-300
        prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
        prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-700
        prose-blockquote:border-l-blue-500/50 prose-blockquote:text-zinc-500 dark:prose-blockquote:text-zinc-400
        prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
        prose-li:text-zinc-700 dark:prose-li:text-zinc-300 prose-li:marker:text-zinc-400 dark:prose-li:marker:text-zinc-500
        prose-hr:border-zinc-200 dark:prose-hr:border-zinc-700
        prose-table:border-separate prose-th:text-zinc-900 dark:prose-th:text-zinc-100 prose-td:text-zinc-700 dark:prose-td:text-zinc-300
      ">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  };

  // ============================================================
  // 渲染辅助：诊断结果区域
  // ============================================================
  const renderDiagnosisArea = () => {
    // --- 流式中：react-markdown 实时渲染 + 加载指示器 ---
    if (isStreaming) {
      return (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-zinc-800/50 px-4 py-4">
          <div className="mb-3 flex items-center gap-2">
            {/* 旋转加载动画 */}
            <svg
              className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              分析中...
            </span>
          </div>
          {renderMarkdownContent(diagnosisStream)}
          {/* 闪烁光标 */}
          <span className="ml-0.5 inline-block h-4 w-0.5 bg-blue-600 dark:bg-blue-400 align-text-bottom" />
        </div>
      );
    }

    // --- 错误状态 ---
    if (diagnosisError) {
      return (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 px-4 py-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-red-600 dark:text-red-400">诊断失败</span>
          </div>
          <p className="text-sm leading-relaxed text-red-600 dark:text-red-400">
            {diagnosisError}
          </p>
          <ClearDiagnosisButton onClick={clearDiagnosis} />
        </div>
      );
    }

    // --- 诊断完成：react-markdown 渲染完整结果（支持原地编辑）---
    if (diagnosisStream) {
      const isEditingThis = editingStage === activeStage;
      
      return (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 px-4 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              诊断完成
            </span>
            {!isEditingThis && (
              <button
                onClick={() => {
                  setEditDraft(diagnosisStream);
                  setEditingStage(activeStage);
                }}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                编辑
              </button>
            )}
          </div>
          
          {isEditingThis ? (
            <div className="space-y-3">
              <textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                className="w-full min-h-[200px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono resize-y focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    updateWorkbenchOutput(activeStage, editDraft);
                    setEditingStage(null);
                  }}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingStage(null)}
                  className="rounded-md border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            renderMarkdownContent(diagnosisStream)
          )}
          
          {!isEditingThis && (
            <>
              <ClearDiagnosisButton onClick={clearDiagnosis} />
              <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
                💡 建议审核 AI 输出，编辑修改后再进入下一阶段
              </p>
              {activeStageIndex < stages.length - 1 && (() => {
                const nextStage = stages[activeStageIndex + 1];
                const nextStageDone = workbench.completedStages.includes(nextStage);
                
                return (
                  <button
                    onClick={() => {
                      if (nextStageDone) {
                        setActiveStage(nextStage);
                      } else {
                        clearDiagnosis();
                        setActiveStage(nextStage);
                        const textToAnalyze = selectedText || currentArticle?.content?.trim() || '';
                        if (textToAnalyze) {
                          setTimeout(() => {
                            startDiagnosis(textToAnalyze);
                          }, 50);
                        }
                      }
                    }}
                    className={`mt-2 w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                      nextStageDone
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    → 进入{stageLabels[nextStage]}
                  </button>
                );
              })()}
            </>
          )}
        </div>
      );
    }

    // --- 空闲状态：占位提示 ---
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30 px-4 py-8 text-center">
        {activeStage === 'material' && (
          <>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">素材分析</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">👉 在编辑器中输入素材，AI 会对论点进行压力测试，找出薄弱点并给出加固建议。</p>
          </>
        )}
        {activeStage === 'framework' && (
          <>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">逻辑框架</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">👉 基于素材分析结果，AI 会设计读者的认知路径，输出文章结构大纲。</p>
          </>
        )}
        {activeStage === 'writing' && (
          <>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">段落展开</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">👉 在编辑器中指定要展开的段落，AI 按设定文风扩展为完整初稿。</p>
          </>
        )}
        {activeStage === 'coaching' && (
          <>
            <p className="text-sm text-zinc-400 dark:text-zinc-500">红队教练</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">👉 从素材溯源性 / 简洁性 / 风格一致性三个维度审查全文。</p>
          </>
        )}
        {!selectedText && !currentArticle?.content?.trim() && (
          <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
            在编辑器中输入内容后，点击诊断按钮
          </p>
        )}
      </div>
    );
  };

  // ============================================================
  // 渲染辅助：主题图标
  // ============================================================
  const renderThemeIcon = () => {
    if (theme === 'light') {
      // 太阳图标
      return (
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
        </svg>
      );
    }
    if (theme === 'dark') {
      // 月亮图标
      return (
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
      );
    }
    // system — 电脑图标
    return (
      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
      </svg>
    );
  };

  // ============================================================
  // 渲染
  // ============================================================
  return (
    <div className="flex h-full flex-col bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      {/* ---- 面板顶部标题和工作流切换 ---- */}
      <header className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="mb-3">
          <div className="flex gap-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 p-0.5">
            {stages.map((stage) => {
              const stageIndex = stages.indexOf(stage);
              const prevStage = stageIndex > 0 ? stages[stageIndex - 1] : null;
              const isLocked = prevStage !== null && !workbench.completedStages.includes(prevStage);
              const isDisabled = isStreaming || isLocked;
              
              return (
                <button
                  key={stage}
                  onClick={() => !isDisabled && setActiveStage(stage)}
                  disabled={isDisabled}
                  title={isLocked ? `请先完成「${stageLabels[prevStage!]}」阶段` : undefined}
                  className={`flex-1 rounded py-2 text-center text-sm font-medium transition-colors ${
                    activeStage === stage
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  } ${
                    isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {isLocked && (
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    )}
                    {stageLabels[stage]}
                  </span>
                </button>
              );
            })}
          </div>
          {/* 管道进度指示器 */}
          <div className="mt-2 flex items-center gap-1 justify-center">
            {stages.map((stage, i) => (
              <div key={stage} className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    workbench.completedStages.includes(stage)
                      ? 'bg-emerald-500'
                      : activeStage === stage
                      ? 'bg-blue-500 ring-2 ring-blue-500/30'
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                />
                {i < stages.length - 1 && (
                  <div className={`w-3 h-px ${
                    workbench.completedStages.includes(stage) ? 'bg-emerald-400' : 'bg-zinc-300 dark:bg-zinc-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
            当前驱动模型: {getModelName(activeStage)}
          </div>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              AI 诊断
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">写作辅助 · 智能分析</p>
          </div>
          <div className="flex items-center gap-1">
            {/* 主题切换按钮 */}
            <button
              onClick={handleThemeToggle}
              className={`rounded-md p-1.5 text-zinc-400 dark:text-zinc-500 transition-colors ${
                isStreaming ? 'opacity-50 cursor-not-allowed' : 'hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              disabled={isStreaming}
              aria-label={`切换主题（当前：${theme}）`}
              title={`当前主题：${theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '跟随系统'}`}
            >
              {renderThemeIcon()}
            </button>
            {/* 设置按钮 */}
            <button
              onClick={() => setSettingsOpen(true)}
              disabled={isStreaming}
              className={`rounded-md p-1.5 text-zinc-400 dark:text-zinc-500 transition-colors ${
                isStreaming ? 'opacity-50 cursor-not-allowed' : 'hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              aria-label="打开设置"
            >
              <svg
                className="h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ---- 诊断主体区域 ---- */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="space-y-4">
          {/* ---- 状态指示 ---- */}
          <StatusBadge
            isStreaming={isStreaming}
            hasError={!!diagnosisError}
            hasResult={!!diagnosisStream && !isStreaming}
          />



          {/* ---- 写作风格管理器 ---- */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                写作风格
              </h3>
            </div>
            
            {/* 风格切换下拉菜单 */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">选择风格</label>
              <select
                value={activeStyleId ?? ''}
                onChange={(e) => {
                  if (e.target.value) {
                    setActiveStyle(e.target.value);
                  }
                }}
                className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2
                  text-sm text-zinc-900 dark:text-zinc-100
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                  transition-colors appearance-none
                  bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke%3D%22%2371717a%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m2%204%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')]
                  bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-8"
              >
                {writingStyles.map((style) => (
                  <option key={style.id} value={style.id} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                    {style.name} {style.isCustom ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 当前风格详情 */}
            <div className="mb-3">
              <p className="text-sm text-zinc-900 dark:text-zinc-100">
                {activeStyle?.name || "未选择"}
              </p>
              {activeStyle && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                  {activeStyle.systemPrompt.substring(0, 80)}{activeStyle.systemPrompt.length > 80 ? '...' : ''}
                </p>
              )}
            </div>
            
            {/* 新建自定义风格表单 */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">创建我的专属文风</span>
                  <svg className="h-4 w-4 text-zinc-400 dark:text-zinc-500 transition-transform group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="mt-3 space-y-3">
                  <input
                    type="text"
                    placeholder="文风名称（例如：我的科技周报风）"
                    className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                      px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                      focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                      transition-colors"
                    id="custom-style-name"
                  />
                  
                  <textarea
                    placeholder="风格描述（System Prompt）"
                    rows={3}
                    className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                      px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                      focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                      transition-colors resize-none"
                    id="custom-style-prompt"
                  />
                  
                  <textarea
                    placeholder="优秀范文（Few-Shots，支持输入1-2段示例）"
                    rows={2}
                    className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800
                      px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                      focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20
                      transition-colors resize-none"
                    id="custom-style-fewshots"
                  />
                  
                  <button
                    onClick={() => {
                      const name = (document.getElementById('custom-style-name') as HTMLInputElement)?.value;
                      const prompt = (document.getElementById('custom-style-prompt') as HTMLTextAreaElement)?.value;
                      const fewShotsStr = (document.getElementById('custom-style-fewshots') as HTMLTextAreaElement)?.value;
                      
                      if (!name || !prompt) {
                        alert('请填写文风名称和风格描述');
                        return;
                      }
                      
                      const fewShots = fewShotsStr.split('\n').filter(s => s.trim());
                      
                      const store = useStore.getState();
                      // 使用store中的addCustomStyle方法来添加自定义风格
                      store.addCustomStyle(name, prompt, fewShots);
                      
                      // 清空表单
                      (document.getElementById('custom-style-name') as HTMLInputElement).value = '';
                      (document.getElementById('custom-style-prompt') as HTMLTextAreaElement).value = '';
                      (document.getElementById('custom-style-fewshots') as HTMLTextAreaElement).value = '';
                      
                      console.log(`自定义文风 "${name}" 已创建`);
                    }}
                    className="w-full rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-2.5
                      text-sm font-semibold text-white dark:text-zinc-900
                      transition-colors
                      hover:bg-zinc-800 dark:hover:bg-zinc-200"
                  >
                    提交创建
                  </button>
                </div>
              </details>
            </div>
            
            {/* 自定义风格列表（带删除按钮） */}
            {writingStyles.some(style => style.isCustom) && (
              <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <h4 className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">我的自定义风格</h4>
                <div className="space-y-1">
                  {writingStyles
                    .filter(style => style.isCustom)
                    .map(style => (
                      <div
                        key={style.id}
                        className={`flex items-center justify-between p-2 rounded-md ${
                          activeStyleId === style.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'bg-zinc-50 dark:bg-zinc-800/50 border border-transparent'
                        }`}
                      >
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">{style.name}</span>
                        <button
                          onClick={() => {
                            if (confirm(`确定要删除文风 "${style.name}" 吗？`)) {
                              // 使用store中的deleteCustomStyle方法来删除自定义风格
                              const store = useStore.getState();
                              store.deleteCustomStyle(style.id);
                            }
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 ml-2 p-1"
                          aria-label="删除文风"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
          
          {/* 教练模式开关 */}
          {activeStage === 'coaching' && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    教练对抗模式
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    仅提供逻辑漏洞和修改建议
                  </p>
                </div>
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={coachMode}
                    onChange={(e) => setCoachMode(e.target.checked)}
                    disabled={isStreaming}
                  />
                  <div className={`w-11 h-6 rounded-full peer ${
                    coachMode
                      ? 'bg-blue-600 dark:bg-blue-500'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  } ${isStreaming ? 'opacity-50' : ''} peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500 peer-disabled:opacity-50`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      coachMode ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---- 操作按钮区域 ---- */}
          {isStreaming ? (
            <button
              onClick={handleAbort}
              className="w-full rounded-md border border-red-300 dark:border-red-800 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              中止诊断
            </button>
          ) : (selectedText || currentArticle?.content?.trim()) ? (
            <button
              onClick={handleDiagnose}
              className="w-full rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 py-3 text-sm font-semibold text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              {selectedText ? '诊断选中文段' : '诊断全文'}
            </button>
          ) : null}

          {/* ---- 诊断结果区域 ---- */}
          {renderDiagnosisArea()}
        </div>
      </div>

      {/* ---- 底部状态栏 ---- */}
      <footer className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 px-6 py-2.5">
        <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
          <span>DraftMind v0.1</span>
          <span>Powered by Multi-Provider</span>
        </div>
      </footer>

      {/* ---- 设置模态框 ---- */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

// ============================================================
// 子组件：状态指示徽章
// ============================================================

function StatusBadge({
  isStreaming,
  hasError,
  hasResult,
}: {
  isStreaming: boolean;
  hasError: boolean;
  hasResult: boolean;
}) {
  let dotColor: string;
  let label: string;

  if (isStreaming) {
    dotColor = "bg-blue-500";
    label = "分析中...";
  } else if (hasError) {
    dotColor = "bg-red-500";
    label = "诊断出错";
  } else if (hasResult) {
    dotColor = "bg-emerald-500";
    label = "诊断完成";
  } else {
    dotColor = "bg-emerald-500";
    label = "就绪，等待内容分析...";
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-4 py-3">
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`}
        />
      </span>
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
    </div>
  );
}

// ============================================================
// 子组件：「清空诊断」按钮
// ============================================================

function ClearDiagnosisButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-4 w-full rounded-md border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
    >
      清空诊断
    </button>
  );
}
