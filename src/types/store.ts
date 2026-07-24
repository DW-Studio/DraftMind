// ============================================================
// DraftMind - 全局 Store 类型定义
// ============================================================

// ---------- 模型信息 ----------
export interface ModelInfo {
  /** 模型唯一标识，如 "openai/gpt-4o" */
  id: string;
  /** 模型显示名称，如 "GPT-4o" */
  name: string;
  /** 模型提供商 */
  provider: string;
}

// ---------- 多服务商配置 ---------

/** 支持的 AI 服务商 */
export type ProviderType = "openrouter" | "aihubmix" | "openai";

/** 工作流程阶段 */
export type WorkflowStage = 'material' | 'framework' | 'writing' | 'coaching';

/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 风格记忆层接口 */
export interface StyleMemory {
  /** 唯一标识 */
  id: string;
  /** 风格名称 */
  name: string;
  /** 逆向出的风格说明书 */
  systemPrompt: string;
  /** 少样本语料 */
  fewShots: string[];
  /** 是否为自定义文风（可选，默认为 false） */
  isCustom?: boolean;
}

/** 单个 Provider 的独立配置 */
export interface ProviderConfig {
  /** API 密钥 */
  apiKey: string;
  /** 自定义 Base URL（空字符串表示使用官方默认域名） */
  baseUrl: string;
}

/** 模型预设：按 Provider 分组的可用模型列表 */
export const MODEL_PRESETS: Record<ProviderType, ModelInfo[]> = {
  openrouter: [
    { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
    { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek V3", provider: "DeepSeek" },
    { id: "meta-llama/llama-3.1-70b", name: "Llama 3.1 70B", provider: "Meta" },
  ],
  aihubmix: [
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google" },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
    { id: "o1", name: "o1", provider: "OpenAI" },
    { id: "o1-mini", name: "o1 Mini", provider: "OpenAI" },
  ],
};

/** 各 Provider 的官方默认 Base URL */
export const DEFAULT_BASE_URLS: Record<ProviderType, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  aihubmix: "https://aihubmix.com/v1",
  openai: "https://api.openai.com/v1",
};

// ---------- 用户设置 ----------
export interface UserSettings {
  // === 保留字段（向后兼容） ===
  /** OpenRouter API Key（@deprecated 使用 providers["openrouter"].apiKey） */
  openRouterApiKey: string;
  /** 默认选中的模型 ID（@deprecated 使用 activeModel） */
  defaultModelId: string;
  /** 可用模型列表（@deprecated 使用 MODEL_PRESETS[activeProvider]） */
  availableModels: ModelInfo[];

  // === 新增字段 ===
  /** 当前激活的 AI 服务商 */
  activeProvider: ProviderType;
  /** 当前激活的模型 ID */
  activeModel: string;
  /** 各 Provider 独立配置（API Key + Base URL） */
  providers: Record<ProviderType, ProviderConfig>;
}

// ---------- 写作风格预设 ----------
export interface WritingStyle {
  /** 唯一标识（nanoid） */
  id: string;
  /** 风格名称 */
  name: string;
  /** 简短描述 */
  description: string;
  /** 完整的 AI system prompt */
  systemPrompt: string;
  /** 温度参数 0-2 */
  temperature: number;
  /** 最大 Token 数 */
  maxTokens: number;
  /** Top-P 采样 0-1 */
  topP: number;
  /** 风格/语调标签 */
  toneTags: string[];
  /** 是否为系统默认预设（不可删除） */
  isDefault: boolean;
}

// ---------- 文章草稿 ----------
export interface Article {
  /** 唯一标识（nanoid） */
  id: string;
  /** 文章标题 */
  title: string;
  /** Markdown 内容 */
  content: string;
  /** 创建时间（ISO 8601） */
  createdAt: string;
  /** 最后修改时间（时间戳） */
  updatedAt: number;
}

// ============================================================
// Store 完整类型
// ============================================================

/** Store 状态（可序列化部分） */
export interface StoreState {
  /** 用户设置 */
  userSettings: UserSettings;
  /** 写作风格预设列表 */
  writingStyles: StyleMemory[];
  /** 当前选中的写作风格 ID */
  activeStyleId: string | null;
  /** 文章草稿列表 */
  articles: Article[];
  /** 当前编辑的文章 ID */
  currentArticleId: string | null;
  /** 用户在编辑器中选中的文本（>10 字符时非空，否则为 null） */
  selectedText: string | null;
  /** 诊断流式输出累积文本 */
  diagnosisStream: string;
  /** 是否正在流式接收诊断结果 */
  isStreaming: boolean;
  /** 诊断错误信息（null = 无错误） */
  diagnosisError: string | null;
  /** 当前工作流程阶段 */
  activeStage: WorkflowStage;
  /** 教练模式开关 */
  coachMode: boolean;
  /** 配置模式：proxy(中转站) 或 official(官方直连) */
  configMode: 'proxy' | 'official';
  /** 中转站配置 */
  proxyConfig: {
    provider: 'aihubmix' | 'openrouter';
    apiKey: string;
    baseUrl: string;
  };
  /** 官方直连配置 */
  officialConfig: {
    openai: { apiKey: string; baseUrl: string; };
    anthropic: { apiKey: string; baseUrl: string; };
    moonshot: { apiKey: string; baseUrl: string; };
  };
  /** 主题模式 */
  theme: ThemeMode;
  /** 写作工作台——保存每个阶段的 AI 输出，自动流入下一阶段 */
  workbench: {
    materialOutput: string;
    frameworkOutput: string;
    writingOutput: string;
    coachingOutput: string;
    completedStages: WorkflowStage[];
    /** 用户选定的文章意图，影响所有阶段的 prompt 行为 */
    articleIntent: string | null;
    /** 写作阶段模式：expand=展开段落, append=接续写作 */
    writingMode: 'expand' | 'append';
  };
}

/** Store 操作（不可序列化部分） */
export interface StoreActions {
  // --- 用户设置（旧接口，向后兼容） ---
  /** 设置 OpenRouter API Key（@deprecated 使用 setProviderKeys） */
  setOpenRouterApiKey: (key: string) => void;
  /** 设置默认模型 ID（@deprecated 使用 switchModel） */
  setDefaultModelId: (modelId: string) => void;
  /** 设置可用模型列表（@deprecated 使用 switchProvider） */
  setAvailableModels: (models: ModelInfo[]) => void;

  // --- 多服务商配置（新接口） ---
  /** 设置指定 Provider 的 API Key 和 Base URL */
  setProviderKeys: (
    provider: ProviderType,
    apiKey: string,
    baseUrl: string,
  ) => void;
  /** 切换当前激活的 Provider，自动联动切换默认模型 */
  switchProvider: (provider: ProviderType) => void;
  /** 切换当前激活的模型 */
  switchModel: (modelId: string) => void;
  /** 获取当前有效的 API Key（按 activeProvider 路由） */
  getActiveApiKey: () => string;
  /** 获取当前有效的 Base URL（用户自定义或官方默认） */
  getActiveBaseUrl: () => string;

  // --- 写作风格 ---
  /** 添加新的写作风格，返回生成的 id */
  addWritingStyle: (style: Omit<StyleMemory, "id">) => string;
  /** 更新指定写作风格 */
  updateWritingStyle: (id: string, updates: Partial<StyleMemory>) => void;
  /** 删除指定写作风格（默认预设不可删除） */
  removeWritingStyle: (id: string) => void;
  /** 切换当前选中的写作风格 */
  setActiveStyle: (id: string) => void;
  
  // --- 自定义文风 ---
  /** 添加自定义文风 */
  addCustomStyle: (name: string, systemPrompt: string, fewShots: string[]) => string;
  /** 删除自定义文风 */
  deleteCustomStyle: (id: string) => void;

  // --- 文章 ---
  /** 创建新文章，返回生成的 id */
  createArticle: (title?: string) => string;
  /** 更新指定文章的标题/内容，自动更新 updatedAt */
  updateArticle: (
    id: string,
    updates: Partial<Pick<Article, "title" | "content">>
  ) => void;
  /** 删除指定文章 */
  deleteArticle: (id: string) => void;
  /** 切换当前编辑的文章 */
  setCurrentArticle: (id: string | null) => void;
  /** 获取当前正在编辑的文章 */
  getCurrentArticle: () => Article | undefined;
  /** 设置编辑器中的划词选中文本（>10 字符时非空） */
  setSelectedText: (text: string | null) => void;

  // --- 主题 ---
  /** 切换主题模式 */
  setTheme: (theme: ThemeMode) => void;

  // --- 配置模式 ---
  /** 切换配置模式 */
  setConfigMode: (mode: 'proxy' | 'official') => void;
  /** 更新中转站配置 */
  updateProxyConfig: (config: {
    provider: 'aihubmix' | 'openrouter';
    apiKey: string;
    baseUrl: string;
  }) => void;
  /** 更新官方配置 */
  updateOfficialConfig: (service: keyof StoreState['officialConfig'],
                         config: { apiKey: string; baseUrl: string }) => void;

  // --- 多文档管理 ---
  /** 创建新文章，返回生成的 id (使用默认标题) */
  createNewArticle: () => string;
  /** 删除指定文章ID */
  deleteArticleById: (id: string) => void;
  /** 更新当前文章标题和内容，自动防抖保存 */
  updateCurrentArticle: (title: string, content: string) => void;

  // --- 工作流程 ---
  /** 切换当前工作流程阶段 */
  setActiveStage: (stage: WorkflowStage) => void;
  /** 切换教练模式 */
  setCoachMode: (enabled: boolean) => void;
  /** 设置文章意图（新建文章时选定，影响所有阶段 prompt） */
  setArticleIntent: (intent: string) => void;
  /** 原地编辑：更新指定阶段的工作台输出 */
  updateWorkbenchOutput: (stage: WorkflowStage, content: string) => void;
  /** 切换写作阶段模式（展开段落 / 接续写作） */
  setWritingMode: (mode: 'expand' | 'append') => void;

  // --- AI 诊断 ---
  /** 发起流式诊断请求（自动熔断旧请求、清空上次结果） */
  startDiagnosis: (selectedText: string) => Promise<void>;
  /** 中止当前正在进行的诊断请求 */
  abortDiagnosis: () => void;
  /** 清空诊断结果、错误信息，重置为就绪状态 */
  clearDiagnosis: () => void;
}

/** 完整 Store 类型 */
export type Store = StoreState & StoreActions;
