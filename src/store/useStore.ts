// ============================================================
// DraftMind - 全局状态管理 Store
// 使用 Zustand + persist 中间件实现 LocalStorage 持久化
// 【重构版】实现任务提示词与风格记忆双层编排矩阵
// ============================================================

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Store,
  StoreState,
  UserSettings,
  Article,
  ProviderType,
  ProviderConfig,
  ModelInfo,
  StyleMemory,
  WorkflowStage,
  ThemeMode,
} from "@/types/store";
import {
  MODEL_PRESETS,
  DEFAULT_BASE_URLS,
} from "@/types/store";
import { streamOpenRouterChat } from "@/lib/openrouter";

// ============================================================
// 【硬编码】阶段任务提示词矩阵
// ============================================================

const STAGE_TASK_PROMPTS: Record<WorkflowStage, string> = {
  material: `你是写作者的观点教练。你的工作是施压测试——不是反驳观点，而是找到薄弱点并给出加固建议。

请根据用户提供的素材质量，分层响应：

【第一层：素材充分（有明确论点 + 证据）】
→ 直接施压测试 + 盲区扫描 + 提炼核心问题

【第二层：素材半成型（有方向但缺论据）】
→ 肯定已清晰的部分 → 指出缺失的论据 → 给出可补充的方向

【第三层：素材碎片（想法散乱，没有明确主张）】
→ 帮用户澄清方向：「你真正想表达的是什么？」
→ 提炼 2-3 个可能的核心论点供选择
→ 用提问代替分析。目的是帮用户找到方向，不是替用户编一个方向

输出结构：

## 压力测试
逐个检查素材中的论点。每个质疑后必须跟一句加固建议：「如果要站住脚，需要补充：……」

## 盲区扫描
素材没提到但文章应该考虑的维度。格式：「这里缺〔XX视角〕——加上会让论证更完整，因为……」

## 核心问题
提炼一个问题。这个问题如果回答清楚了，这篇文章的论证方向就明确了。下一阶段将围绕这个问题构建文章结构。

核心约束：
- 永远不要替用户编造观点。如果素材不足以支撑分析，诚实告诉用户哪里需要补充
- 禁止以「但是」「然而」「问题在于」开头
- 用编辑和作者聊天的语气，不是填模板`,

  framework: `你是文章结构设计师。上一步材料分析提出了一个核心问题和若干加固建议。你的任务是基于它们设计文章的论证路径。

请先阅读材料分析中的「## 核心问题」，你的「## 论证主线」需要直接回答这个问题。

输出结构：

## 论证主线
用 1-2 句话确定文章的核心论点。必须回答材料分析中提出的核心问题。

## 段落大纲
设计 4-6 个段落的序列。每段包含：
- 段落标题（简短，5 字以内）
- 论证任务（一句话：这个段落在论证链条中起什么作用）
- 可用素材（从材料分析中可用的论据）

## 标题建议
基于论证主线，提供 2-3 个标题选项。要求：简短（15字以内）、不用感叹号、不用反问句、不夸张。给出每个标题适合的场景（如「适合公众号推文」「适合技术博客」）。

设计原则：
- 不是罗列要点，是设计读者的认知路径——先建立什么认知 → 再推翻什么假设 → 最后留下什么结论
- 每个段落的论证任务必须不同，不能重复覆盖同一论点

用编辑和作者讨论的语气，不要用模板格式。不要写完整段落。`,

  writing: `你是文风对齐专家。上一步逻辑框架给出了段落大纲，每个段落有标题、论证任务和可用素材。

用户会指定要展开的段落（可能用编号、标题或论证任务描述来指代）。请将该段落展开为完整初稿。

要求：
- 严格保持该段在框架中的「论证任务」不丢失
- 句式、节奏、措辞必须对齐用户设定的写作风格
- 不要添加框架外的观点或新素材
- 输出为纯段落，不要加标题或编号`,

  coaching: `你是写作者的刻意练习教练。请从三个维度审查当前段落，并将问题关联回材料分析中对应的论点：

1. 🧠 素材溯源性：论证使用的素材是否真的支撑论点？逻辑链中是否存在跳跃？是否曲解了原始素材？
2. ✂️ 简洁性：哪些词/句是多余的？哪些修饰在削弱论证力度？砍掉后会更强吗？
3. 🎨 风格一致性：是否存在偏离设定文风的表达？句式结构是否统一？

列出问题并说明原因，由用户自己来改。不要替用户写修改后的版本。`
};

// ============================================================
// 模型路由映射矩阵
// ============================================================

const MODEL_MAPPING: Record<WorkflowStage, Record<ProviderType, string>> = {
  material: {
    aihubmix: 'moonshot-v1-8k',
    openrouter: 'moonshotai/moonshot-v1-8k',
    openai: 'moonshot-v1-8k'
  },
  framework: {
    aihubmix: 'claude-opus-4-6',
    openrouter: 'anthropic/claude-opus-4',
    openai: 'claude-opus-4-6'
  },
  writing: {
    aihubmix: 'claude-3-5-sonnet-20241022',
    openrouter: 'anthropic/claude-3.5-sonnet',
    openai: 'claude-3-5-sonnet-20241022'
  },
  coaching: {
    aihubmix: 'gpt-4o',
    openrouter: 'gpt-4o',
    openai: 'gpt-4o'
  }
};

// ============================================================
// 模型温度控制矩阵
// ============================================================

const TEMPERATURE_MAPPING: Record<WorkflowStage, number> = {
  material: 0.7,
  framework: 0.3,
  writing: 0.3,
  coaching: 0.3
};

// ============================================================
// 模型选择映射矩阵（硬编码）
// ============================================================

const FIXED_MODEL_MAPPING: Record<WorkflowStage, string> = {
  material: 'kimi-k2.6', // 锁定为 Moonshot/Kimi
  framework: 'claude-opus-4-6', // 锁定为 Claude
  writing: 'claude-opus-4-6', // 锁定为 Claude
  coaching: 'gpt-5.5' // 锁定为 GPT
};

// ============================================================
// 模块级变量（不进入 Zustand state，不可序列化）
// ============================================================

/** 当前诊断请求的 AbortController，用于中止流式请求 */
let diagnosisAbortController: AbortController | null = null;

// ============================================================
// 工具函数
// ============================================================

/** 生成唯一 ID：优先使用 crypto.randomUUID，回退到时间戳 + 随机数 */
function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 回退方案
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** 获取当前 ISO 8601 时间戳 */
function nowISO(): string {
  return new Date().toISOString();
}

/** 防抖工具函数 */
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

// ============================================================
// 默认值
// ============================================================

/** 创建各 Provider 的默认空配置 */
function createDefaultProviderConfig(): Record<ProviderType, ProviderConfig> {
  return {
    openrouter: { apiKey: "", baseUrl: "" },
    aihubmix: { apiKey: "", baseUrl: "" },
    openai: { apiKey: "", baseUrl: "" },
  };
}

const DEFAULT_USER_SETTINGS: UserSettings = {
  // 旧字段（向后兼容）
  openRouterApiKey: "",
  defaultModelId: "claude-3-5-sonnet-20241022", // 对应 aihubmix 的默认模型
  availableModels: MODEL_PRESETS["aihubmix"],

  // 新字段
  activeProvider: "aihubmix", // 默认激活 aihubmix
  activeModel: "claude-3-5-sonnet-20241022", // aihubmix 的首模型
  providers: createDefaultProviderConfig(),
};

const DEFAULT_NAVAL_STYLE: StyleMemory = {
  id: "style_naval",
  name: "Naval 认知哲学",
  isCustom: false,
  systemPrompt: '你的文风清晰、直接。说人话，不炫技。用具体的例子而不是抽象的概念。允许有不完美的表达——真实的思考比完美的句子更重要。避免短句堆砌、避免每句话都想成为金句、避免"X已死"式的断言。',
  fewShots: [
    '互联网让每个人都能发表内容，但大部分人的表达方式是从别处抄来的。这不是道德问题——是你还没找到自己的声音。这个过程可能需要写很多篇垃圾，没关系。',
    '我认识的最好的写作者，他们的草稿通常很乱。有语法错误，有逻辑跳跃，有时候一整段都在自相矛盾。但他们发出来的东西读起来像在跟你聊天，不像在发表演讲。'
  ]
};

const DEFAULT_INDIHACKER_STYLE: StyleMemory = {
  id: "style_indie_hacker",
  name: "硬核技术与独立开发",
  isCustom: false,
  systemPrompt: '你的文风充满极客精神与 Builder（建设者）气质。句式短促有力，多用主动语态。逻辑递进采取"痛点 -> 底层机制拆解 -> 杠杆效应"的模型。倾向于使用精准的技术术语，但会用极其通俗的比喻去解释复杂架构。拒绝任何"在当今快速发展的时代"、"众所周知"等毫无信息熵的废话。',
  fewShots: [
    '传统的开发模式需要庞大的团队进行流水线作业。但有了 AI 辅助编程，代码不再是阻碍，而是零边际成本的杠杆。不要去重复造底层的轮子，去定义业务的边界。',
    '这个工具的核心不在于它用了什么高级的框架，而在于它通过纯前端的本地存储，彻底砍掉了后端的维护成本。数据只在用户的浏览器里流转，隐私和速度兼得。'
  ]
};

const DEFAULT_SYSTEM_REVIEW_STYLE: StyleMemory = {
  id: "style_system_review",
  name: "系统复盘与原子习惯",
  isCustom: false,
  systemPrompt: '你的文风极其客观、严谨，像外科医生解剖系统一样解剖生活和学习习惯。注重因果关系和数据反馈。多使用对比、列表和步骤拆解。情感温度极低，认为动机是不可靠的，只有环境设计和系统机制才是长效的。',
  fewShots: [
    '动机是极其不可靠的系统变量，而环境是恒定的。每天强迫自己背50个单词依赖的是高耗能的意志力；但修改默认的主页，让浏览器每天自动弹出单词卡片，依赖的是低摩擦的环境设计。',
    '降低启动阻力，是养成任何习惯的唯一解。今天写出的代码极其糟糕，但这不重要。重要的是我把"打开编辑器"这个动作的阻力降到了零。'
  ]
};

const DEFAULT_WILD_NOMAD_STYLE: StyleMemory = {
  id: "style_wild_nomad",
  name: "旷野游牧与生活纪实",
  isCustom: false,
  systemPrompt: '你的文风充满"在路上"的生命力与松弛感。句式错落有致，富有极强的画面感和现场感。情感温度中高，真实不做作，展现自由但又不失深度的探索精神。善于捕捉微小的环境细节（如光线、声音、温度）来烘托氛围。',
  fewShots: [
    '海风把键盘吹得发烫，旁边的冰美式刚融化一半。今天没有跑通完美的业务逻辑，但戴上运动相机去追了一场没有计划的落日。生活不是在一个固定的工位上死磕，而是在不同的旷野里寻找自己。',
    '清晨的校园带着一种凌冽的自由感。没有带沉重的设备，只用最基础的镜头记录下了这个瞬间。追求极致的画质往往会让人错过真实的颗粒感。'
  ]
};

/** 创建一篇空白文章 */
function createEmptyArticle(): Article {
  const now = nowISO();
  return {
    id: generateId(),
    title: "未命名文章",
    content: "",
    createdAt: now,
    updatedAt: Date.now(),
  };
}

// ============================================================
// 初始状态工厂（每次调用重新生成，确保默认文章有新鲜的时间戳）
// ============================================================

function getInitialState(): StoreState {
  const defaultArticle = createEmptyArticle();

  return {
    userSettings: DEFAULT_USER_SETTINGS,
    writingStyles: [
      DEFAULT_NAVAL_STYLE,
      DEFAULT_INDIHACKER_STYLE,
      DEFAULT_SYSTEM_REVIEW_STYLE,
      DEFAULT_WILD_NOMAD_STYLE
    ],
    activeStyleId: DEFAULT_NAVAL_STYLE.id,
    articles: [defaultArticle],
    currentArticleId: defaultArticle.id,
    selectedText: null,
    diagnosisStream: "",
    isStreaming: false,
    diagnosisError: null,
    activeStage: 'material',
    coachMode: true,
    configMode: 'proxy',
    proxyConfig: {
      provider: 'aihubmix',
      apiKey: '',
      baseUrl: ''
    },
    officialConfig: {
      openai: { apiKey: '', baseUrl: '' },
      anthropic: { apiKey: '', baseUrl: '' },
      moonshot: { apiKey: '', baseUrl: '' }
    },
    theme: 'system',
    workbench: {
      materialOutput: '',
      frameworkOutput: '',
      writingOutput: '',
      coachingOutput: '',
      completedStages: [],
    },
  };
}

// ============================================================
// Zustand Store
// ============================================================

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      // ---- 初始状态 ----
      const initialState = getInitialState();
      
      // 初始化时确保包含所有默认写作风格
      const initializeStyles = (currentStyles: StyleMemory[]) => {
        const defaultStyles = [
          DEFAULT_NAVAL_STYLE,
          DEFAULT_INDIHACKER_STYLE,
          DEFAULT_SYSTEM_REVIEW_STYLE,
          DEFAULT_WILD_NOMAD_STYLE
        ];
        
        // 检查哪些默认风格缺失
        const existingIds = currentStyles.map((style: StyleMemory) => style.id);
        const missingStyles = defaultStyles.filter((defaultStyle: StyleMemory) =>
          !existingIds.includes(defaultStyle.id)
        );
        
        // 如果有缺失的默认风格，添加它们
        if (missingStyles.length > 0) {
          return [...currentStyles, ...missingStyles];
        }
        
        return currentStyles;
      };

      // 在初始状态下也确保包含所有默认风格
      const initializedState = {
        ...initialState,
        writingStyles: initializeStyles(initialState.writingStyles)
      };

      // 确保激活的风格ID有效
      if (!initializedState.writingStyles.some((style: StyleMemory) => style.id === initializedState.activeStyleId)) {
        initializedState.activeStyleId = DEFAULT_NAVAL_STYLE.id;
      }

      return {
        ...initializedState,

        // ========================
        // 用户设置 Actions（旧接口，向后兼容）
        // ========================

        setOpenRouterApiKey: (key: string) =>
          set((state) => ({
            userSettings: {
              ...state.userSettings,
              openRouterApiKey: key,
              providers: {
                ...state.userSettings.providers,
                openrouter: {
                  ...state.userSettings.providers.openrouter,
                  apiKey: key,
                },
              },
            },
          })),

        setDefaultModelId: (modelId: string) =>
          set((state) => ({
            userSettings: { ...state.userSettings, defaultModelId: modelId },
          })),

        setAvailableModels: (models) =>
          set((state) => ({
            userSettings: { ...state.userSettings, availableModels: models },
          })),

        // ========================
        // 多服务商配置 Actions（新接口）
        // ========================

        setProviderKeys: (provider, apiKey, baseUrl) =>
          set((state) => ({
            userSettings: {
              ...state.userSettings,
              providers: {
                ...state.userSettings.providers,
                [provider]: { apiKey, baseUrl },
              },
              // 向后兼容：若为 openrouter，同步旧字段
              ...(provider === "openrouter"
                ? { openRouterApiKey: apiKey }
                : {}),
            },
          })),

        switchProvider: (provider) => {
          const presetModels = MODEL_PRESETS[provider];
          const firstModel = presetModels[0]?.id ?? "";

          set((state) => ({
            userSettings: {
              ...state.userSettings,
              activeProvider: provider,
              activeModel: firstModel,
              availableModels: presetModels,
              defaultModelId: firstModel, // 向后兼容
            },
          }));
        },

        switchModel: (modelId) =>
          set((state) => ({
            userSettings: {
              ...state.userSettings,
              activeModel: modelId,
              defaultModelId: modelId, // 向后兼容
            },
          })),

        getActiveApiKey: () => {
          const { userSettings } = get();
          if (userSettings.activeProvider === "openrouter") {
            return userSettings.openRouterApiKey;
          }
          return userSettings.providers[userSettings.activeProvider].apiKey;
        },

        getActiveBaseUrl: () => {
          const { userSettings } = get();
          const customUrl =
            userSettings.providers[userSettings.activeProvider].baseUrl;
          if (customUrl) {
            return customUrl;
          }
          return DEFAULT_BASE_URLS[userSettings.activeProvider];
        },

        // ========================
        // 写作风格 Actions（扩展支持自定义文风）
        // ========================

        addWritingStyle: (styleInput) => {
          const id = generateId();
          const newStyle: StyleMemory = { 
            id, 
            ...styleInput, 
            isCustom: true // 标记为自定义文风
          };
          set((state) => ({
            writingStyles: [...state.writingStyles, newStyle],
          }));
          return id;
        },

        updateWritingStyle: (id, updates) =>
          set((state) => ({
            writingStyles: state.writingStyles.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            ),
          })),

        removeWritingStyle: (id) => {
          const { writingStyles, activeStyleId } = get();

          // 禁止删除默认预设（非自定义风格）
          const target = writingStyles.find((s) => s.id === id);
          if (target && !target.isCustom) return;

          const filtered = writingStyles.filter((s) => s.id !== id);

          // 如果删除的是当前选中的风格，自动切换到第一个可用风格
          const newActiveStyleId =
            activeStyleId === id
              ? filtered.length > 0
                ? filtered[0].id
                : null
              : activeStyleId;

          set({
            writingStyles: filtered,
            activeStyleId: newActiveStyleId,
          });
        },

        setActiveStyle: (id) => set({ activeStyleId: id }),
        
        // ========================
        // 自定义文风 Actions（新增）
        // ========================
        
        addCustomStyle: (name: string, systemPrompt: string, fewShots: string[]) => {
          const id = generateId();
          const newStyle: StyleMemory = {
            id,
            name,
            systemPrompt,
            fewShots,
            isCustom: true
          };
          
          set((state) => ({
            writingStyles: [...state.writingStyles, newStyle],
            activeStyleId: id // 自动切换为当前激活文风
          }));
          
          return id;
        },
        
        deleteCustomStyle: (id: string) => {
          const { writingStyles, activeStyleId } = get();

          // 只允许删除自定义文风（内置文风不允许删除）
          const target = writingStyles.find((s) => s.id === id);
          if (!target || !target.isCustom) return;

          const filtered = writingStyles.filter((s) => s.id !== id);

          // 如果删除的是当前选中的风格，自动切换到第一个可用风格
          const newActiveStyleId =
            activeStyleId === id
              ? filtered.length > 0
                ? filtered[0].id
                : null
              : activeStyleId;

          set({
            writingStyles: filtered,
            activeStyleId: newActiveStyleId,
          });
        },

        // ========================
        // 文章 Actions (旧方法，保留向后兼容)
        // ========================

        createArticle: (title) => {
          const now = nowISO();
          const id = generateId();
          const newArticle: Article = {
            id,
            title: title ?? "未命名文章",
            content: "",
            createdAt: now,
            updatedAt: Date.now(),
          };
          set((state) => ({
            articles: [...state.articles, newArticle],
            // 自动切换到新创建的文章
            currentArticleId: id,
          }));
          return id;
        },

        updateArticle: (id, updates) =>
          set((state) => ({
            articles: state.articles.map((a) =>
              a.id === id
                ? { ...a, ...updates, updatedAt: Date.now() }
                : a
            ),
          })),

        deleteArticle: (id) => {
          const { articles, currentArticleId } = get();
          const filtered = articles.filter((a) => a.id !== id);

          // 如果删除的是当前文章，切换到第一篇（没有则为 null）
          const newCurrentId =
            currentArticleId === id
              ? filtered.length > 0
                ? filtered[0].id
                : null
              : currentArticleId;

          set({
            articles: filtered,
            currentArticleId: newCurrentId,
          });
        },

        setCurrentArticle: (id) => set({ currentArticleId: id }),

        setSelectedText: (text) => set({ selectedText: text }),

        getCurrentArticle: () => {
          const { articles, currentArticleId } = get();
          return articles.find((a) => a.id === currentArticleId);
        },

        // ========================
        // 配置模式 Actions
        // ========================
        
        setConfigMode: (mode: 'proxy' | 'official') => set({ configMode: mode }),
        
        updateProxyConfig: (config: { provider: 'aihubmix' | 'openrouter'; apiKey: string; baseUrl: string }) =>
          set((state) => ({
            proxyConfig: { ...state.proxyConfig, ...config }
          })),
        
        updateOfficialConfig: (service: keyof StoreState['officialConfig'],
                              config: { apiKey: string; baseUrl: string }) =>
          set((state) => ({
            officialConfig: {
              ...state.officialConfig,
              [service]: { ...state.officialConfig[service], ...config }
            }
          })),

        // ========================
        // 多文档管理 Actions
        // ========================
        
        createNewArticle: () => {
          const now = Date.now();
          const id = generateId();
          const newArticle: Article = {
            id,
            title: "未命名文章",
            content: "",
            createdAt: nowISO(),
            updatedAt: now,
          };
          
          set((state) => ({
            articles: [...state.articles, newArticle],
            currentArticleId: id,
            // 重置工作台和诊断状态
            workbench: {
              materialOutput: '',
              frameworkOutput: '',
              writingOutput: '',
              coachingOutput: '',
              completedStages: [],
            },
            diagnosisStream: '',
            diagnosisError: null,
            activeStage: 'material',
          }));
          
          return id;
        },

        deleteArticleById: (id: string) => {
          set((state) => {
            const articles = state.articles.filter(a => a.id !== id);
            const currentArticleId =
              state.currentArticleId === id
                ? articles[0]?.id || null
                : state.currentArticleId;
                
            return { articles, currentArticleId };
          });
        },

        updateCurrentArticle: debounce((title: string, content: string) => {
          set((state) => {
            if (!state.currentArticleId) return state;
            
            return {
              ...state,
              articles: state.articles.map(a =>
                a.id === state.currentArticleId
                  ? { ...a, title, content, updatedAt: Date.now() }
                  : a
              )
            };
          });
        }, 500),

        // ========================
        // 工作流程 Actions
        // ========================

        setActiveStage: (stage: WorkflowStage) => {
          const wb = get().workbench;
          const outputKey = `${stage}Output` as 'materialOutput' | 'frameworkOutput' | 'writingOutput' | 'coachingOutput';
          const savedOutput = wb[outputKey] || '';
          set({ 
            activeStage: stage,
            diagnosisStream: savedOutput,
            diagnosisError: null,
            isStreaming: false,
          });
        },
        
        setCoachMode: (enabled: boolean) => set({ coachMode: enabled }),

        /** 原地编辑：更新指定阶段的工作台输出，同时同步到 diagnosisStream */
        updateWorkbenchOutput: (stage: WorkflowStage, content: string) => {
          const outputKey = `${stage}Output` as 'materialOutput' | 'frameworkOutput' | 'writingOutput' | 'coachingOutput';
          set((s) => ({
            workbench: { ...s.workbench, [outputKey]: content },
            diagnosisStream: content,
          }));
        },

        // ========================
        // 主题 Actions
        // ========================

        setTheme: (theme: ThemeMode) => set({ theme }),

        // ========================
        // AI 诊断 Actions
        // ========================

        startDiagnosis: async (selectedText: string) => {
          // 1. 熔断旧请求
          if (diagnosisAbortController) {
            diagnosisAbortController.abort();
            diagnosisAbortController = null;
          }

          // 2. 清空上次结果，标记流式开始
          set({ diagnosisStream: "", diagnosisError: null, isStreaming: true });

          // 3. 从 state 读取参数
          const state = get();
          const activeStage = state.activeStage;
          const coachMode = state.coachMode;
          
          // 4. 确定模型配置（根据阶段硬编码）
          let apiConfig: { apiKey: string; baseUrl: string; model: string };
          
          if (state.configMode === 'proxy') {
            // 中转站模式：根据配置的provider获取API配置
            const { provider, apiKey, baseUrl } = state.proxyConfig;
            // 使用硬编码的模型映射（基于阶段而非provider）
            const fixedModel = FIXED_MODEL_MAPPING[activeStage];
            apiConfig = { apiKey, baseUrl, model: fixedModel };
          } else {
            // 官方直连模式：根据阶段获取API配置
            switch (activeStage) {
              case 'material':
                apiConfig = {
                  ...state.officialConfig.moonshot,
                  model: FIXED_MODEL_MAPPING[activeStage] // 锁定为 Moonshot
                };
                break;
              case 'writing':
                apiConfig = {
                  ...state.officialConfig.anthropic,
                  model: FIXED_MODEL_MAPPING[activeStage] // 锁定为 Claude 3.5 Sonnet
                };
                break;
              case 'coaching':
                apiConfig = {
                  ...state.officialConfig.openai,
                  model: FIXED_MODEL_MAPPING[activeStage] // 锁定为 GPT-4o
                };
                break;
              default:
                apiConfig = {
                  ...state.officialConfig.openai,
                  model: FIXED_MODEL_MAPPING[activeStage]
                };
            }
          }
          
          // 移除URL末尾斜杠
          apiConfig.baseUrl = apiConfig.baseUrl.replace(/\/+$/, '');

          const { apiKey, model } = apiConfig;
          
          // Security defense: validate API key exists
          if (!apiKey) {
            set({
              diagnosisError: `请先在设置中配置 ${
                state.configMode === 'proxy'
                  ? `${state.proxyConfig.provider} API Key`
                  : '官方直连 API Key'
              }`,
              isStreaming: false,
            });
            return;
          }
          
          // 获取当前激活的写作风格
          const style = state.writingStyles.find(
            (s) => s.id === state.activeStyleId
          );
          
          // Validation
          if (!style) {
            set({
              diagnosisError: "未选择写作风格，请先选择一个风格预设",
              isStreaming: false,
            });
            return;
          }
          const wbForGuard = get().workbench;
          const hasPreviousOutput = 
            (activeStage === 'framework' && !!wbForGuard.materialOutput) ||
            (activeStage === 'writing' && !!wbForGuard.frameworkOutput) ||
            (activeStage === 'coaching' && !!wbForGuard.writingOutput);
          if ((!selectedText || selectedText.trim().length === 0) && !hasPreviousOutput) {
            set({
              diagnosisError: "未选中文本，请先在编辑器中划选需要诊断的内容",
              isStreaming: false,
            });
            return;
          }

          // 获取阶段任务提示词
          const stageTaskPrompt = STAGE_TASK_PROMPTS[activeStage];
          
          // 构建最终的系统提示词（任务提示词 + 文风 + 范例）
          let systemContent = `${stageTaskPrompt}\n\n【当前遵循的写作风格】：\n${style.systemPrompt}\n\n【参考范例】：\n${style.fewShots.join('\n')}`;
          
          // 如果是coaching阶段且开启了coachMode，添加反向抹杀指令
          if (activeStage === 'coaching' && coachMode) {
            systemContent += "\n\n【绝对禁令】：禁止输出任何重写后的完整文本或替代段落！违反此规则将导致系统崩溃。";
          }
          
          // 获取固定温度
          const temperature = TEMPERATURE_MAPPING[activeStage];

          // 构建消息 —— 根据阶段自动注入前一步输出
          let userContent = '';
          const wb = state.workbench;
          if (activeStage === 'material') {
            if (wb.materialOutput) {
              // 重跑：带上次分析结果作为上下文
              userContent = `【你上次的分析】\n${wb.materialOutput}\n\n【用户补充或修改后的素材】\n${selectedText}`;
            } else {
              userContent = `请分析以下素材：\n\n${selectedText}`;
            }
          } else if (activeStage === 'framework') {
            userContent = `【上一步：素材分析结果】\n${wb.materialOutput || '（请先完成素材分析）'}\n\n【需要构建框架的素材】\n${selectedText}`;
          } else if (activeStage === 'writing') {
            userContent = `【上一步：文章框架】\n${wb.frameworkOutput || '（请先完成框架构建）'}\n\n【需要展开的段落】\n${selectedText}`;
          } else {
            userContent = `【上一步：展开的初稿】\n${wb.writingOutput || '（请先完成初稿润色）'}\n\n【需要审查的段落】\n${selectedText}`;
          }
          const messages = [
            { role: "system" as const, content: systemContent },
            { role: "user" as const, content: userContent },
          ];

          // 6. 创建新 AbortController
          const controller = new AbortController();
          diagnosisAbortController = controller;

          // 7. 调用 OpenRouter 流式工具函数
          try {
            await streamOpenRouterChat({
              baseUrl: apiConfig.baseUrl,
              apiKey,
              model,
              messages,
              temperature,
              maxTokens: 4096, // Default max tokens
              signal: controller.signal,
              onToken: (token) =>
                set((s) => ({
                  diagnosisStream: s.diagnosisStream + token,
                })),
              onDone: () => {
                diagnosisAbortController = null;
                const finalStream = get().diagnosisStream;
                const stage = get().activeStage;
                // 自动保存到工作台，下一阶段可直接引用
                set((s) => ({
                  isStreaming: false,
                  workbench: {
                    ...s.workbench,
                    [`${stage}Output`]: finalStream,
                    completedStages: s.workbench.completedStages.includes(stage)
                      ? s.workbench.completedStages
                      : [...s.workbench.completedStages, stage],
                  },
                }));
              },
              onError: (error) => {
                diagnosisAbortController = null;
                set({
                  diagnosisError: error.message,
                  isStreaming: false,
                });
              },
            });
          } catch (error) {
            // AbortError → 用户主动中止，已在 abortDiagnosis 中设置 isStreaming: false
            if (
              error instanceof DOMException &&
              error.name === "AbortError"
            ) {
              return;
            }
            diagnosisAbortController = null;
            set({
              diagnosisError:
                error instanceof Error
                  ? error.message
                  : "诊断请求发生未知错误",
              isStreaming: false,
            });
          }
        },

        abortDiagnosis: () => {
          if (diagnosisAbortController) {
            diagnosisAbortController.abort();
            diagnosisAbortController = null;
          }
          set({ isStreaming: false });
        },

        clearDiagnosis: () => {
          // 先中止可能进行中的请求
          if (diagnosisAbortController) {
            diagnosisAbortController.abort();
            diagnosisAbortController = null;
          }
          set({
            diagnosisStream: "",
            diagnosisError: null,
            isStreaming: false,
          });
        },
      };
    },
    {
      // ========================
      // Persist 中间件配置
      // ========================
      name: "draftmind-store",

      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") {
          return localStorage;
        }
        // SSR 回退：noop storage
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),

      // 选择性持久化：排除 actions（函数），只持久化数据状态
      partialize: (state) => ({
        userSettings: state.userSettings,
        writingStyles: state.writingStyles,
        activeStyleId: state.activeStyleId,
        articles: state.articles,
        currentArticleId: state.currentArticleId,
        activeStage: state.activeStage,
        coachMode: state.coachMode,
        configMode: state.configMode,
        proxyConfig: state.proxyConfig,
        officialConfig: state.officialConfig,
        theme: state.theme,
        workbench: state.workbench,
      }),

      // 版本控制：当数据结构变化时升级版本号触发重新水合
      version: 7, // 版本升级：增加主题状态

      // 水合完成后的回调：补全缺失的默认写作风格
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error("[DraftMind Store] 水合失败:", error);
            return;
          }
          if (!state) return;

          // 水合后再次确保所有默认风格都存在
          const defaultStyles = [
            DEFAULT_NAVAL_STYLE,
            DEFAULT_INDIHACKER_STYLE,
            DEFAULT_SYSTEM_REVIEW_STYLE,
            DEFAULT_WILD_NOMAD_STYLE,
          ];
          const existingIds = state.writingStyles.map((s: StyleMemory) => s.id);
          const missingStyles = defaultStyles.filter(
            (ds: StyleMemory) => !existingIds.includes(ds.id)
          );
          if (missingStyles.length > 0) {
            state.writingStyles = [...state.writingStyles, ...missingStyles];
          }

          // 确保激活的风格 ID 仍然有效
          if (
            !state.activeStyleId ||
            !state.writingStyles.some((s: StyleMemory) => s.id === state.activeStyleId)
          ) {
            state.activeStyleId = DEFAULT_NAVAL_STYLE.id;
          }
        };
      },
    }
  )
);
