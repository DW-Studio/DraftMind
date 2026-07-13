// ============================================================
// DraftMind - OpenRouter API SSE 流式请求工具函数
// ============================================================

// Dynamic API endpoint will be passed as parameter

// ============================================================
// 类型定义
// ============================================================

/** 单条消息 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** streamOpenRouterChat 参数 */
export interface StreamChatParams {
  /** API 端点 URL */
  baseUrl: string;
  /** API Key */
  apiKey: string;
  /** 模型 ID，如 "openai/gpt-4o" 或 "gpt-4o" */
  model: string;
  /** 消息数组（system + user，不含 stream 选项） */
  messages: ChatMessage[];
  /** 温度 0-2 */
  temperature: number;
  /** 最大 Token 数 */
  maxTokens: number;
  /** Top-P 采样 0-1 */
  topP?: number;
  /** AbortSignal 用于取消请求 */
  signal: AbortSignal;
  /** 每收到一个 token 时回调 */
  onToken: (token: string) => void;
  /** 流正常结束时回调 */
  onDone: () => void;
  /** 发生错误时回调 */
  onError: (error: Error) => void;
}

// ============================================================
// SSE 流解析器
// ============================================================

/**
 * 解析单行 SSE data，提取 delta.content
 * @returns token 字符串，若为 [DONE] 返回 null（表示流结束），若非 data 行返回 undefined
 */
function parseSSELine(
  line: string
): string | null | undefined {
  // 只处理 "data: " 开头的行
  if (!line.startsWith("data: ")) {
    return undefined;
  }

  const data = line.slice(6).trim();

  // 流结束标记
  if (data === "[DONE]") {
    return null;
  }

  // 跳过空 data
  if (data === "") {
    return undefined;
  }

  try {
    const parsed = JSON.parse(data);
    const content = parsed?.choices?.[0]?.delta?.content;
    // content 可能是空字符串（某些模型的第一个 chunk），也要返回
    if (typeof content === "string") {
      return content;
    }
  } catch {
    // JSON 解析失败，跳过该行（非致命错误）
    console.warn("[OpenRouter] 无法解析 SSE 数据行:", data.slice(0, 100));
  }

  return undefined;
}

// ============================================================
// 主函数
// ============================================================

/**
 * 通过 OpenRouter API 发送流式聊天请求（SSE）
 *
 * 使用 Fetch API + ReadableStream reader 逐块读取 SSE 事件，
 * 通过 onToken / onDone / onError 回调通知调用方。
 * 传入的 AbortSignal 可用于中途取消请求。
 *
 * @example
 * ```ts
 * const controller = new AbortController();
 * await streamOpenRouterChat({
 *   apiKey: "sk-...",
 *   model: "openai/gpt-4o",
 *   messages: [
 *     { role: "system", content: "你是写作助手" },
 *     { role: "user", content: "诊断这段文字..." },
 *   ],
 *   temperature: 0.7,
 *   maxTokens: 4096,
 *   topP: 0.9,
 *   signal: controller.signal,
 *   onToken: (token) => console.log(token),
 *   onDone: () => console.log("完成"),
 *   onError: (err) => console.error(err),
 * });
 * ```
 */
export async function streamOpenRouterChat(
  params: StreamChatParams
): Promise<void> {
  const {
    apiKey,
    model,
    messages,
    temperature,
    maxTokens,
    topP,
    signal,
    onToken,
    onDone,
    onError,
  } = params;

  // ---- 1. 发送 POST 请求 ----
  let response: Response;
  // 浏览器环境通过 Next.js API 代理转发，绕过 CORS
  const isBrowser = typeof window !== 'undefined';
  const apiEndpoint = isBrowser
    ? '/api/ai/chat/completions'
    : `${params.baseUrl}/chat/completions`;
  try {
    response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // OpenRouter 可选头：标识客户端
        "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
        "X-Title": "DraftMind",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
      }),
      signal,
    });
  } catch (error) {
    // AbortError → 静默处理（调用方已在 abortDiagnosis 中设置状态）
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    onError(
      error instanceof Error ? error : new Error("网络请求失败，请检查网络连接")
    );
    return;
  }

  // ---- 2. 检查 HTTP 状态码 ----
  if (!response.ok) {
    let errorMessage = `API 请求失败 (HTTP ${response.status})`;
    try {
      const errorBody = await response.text();
      const parsed = JSON.parse(errorBody);
      // OpenRouter 错误格式：{ error: { message: "...", code: ... } }
      if (parsed?.error?.message) {
        errorMessage = parsed.error.message;
      } else if (parsed?.message) {
        errorMessage = parsed.message;
      }
    } catch {
      // 无法解析错误 body，使用默认错误消息
    }
    onError(new Error(errorMessage));
    return;
  }

  // ---- 3. 检查 response.body ----
  const body = response.body;
  if (!body) {
    onError(new Error("响应体为空，无法读取流式数据"));
    return;
  }

  // ---- 4. 读取 SSE 流 ----
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  /** 跨 chunk 缓冲区：处理一个 data 行被拆分到两次 read() 的情况 */
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // 流读取完毕
        break;
      }

      // 解码当前 chunk
      buffer += decoder.decode(value, { stream: true });

      // 按换行分割，处理完整的行
      const lines = buffer.split("\n");
      // 最后一行可能不完整，保留到下次
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "") {
          continue;
        }

        const result = parseSSELine(trimmed);

        if (result === null) {
          // [DONE] 标记
          onDone();
          return;
        }

        if (result !== undefined) {
          // token 内容（可能是空字符串）
          onToken(result);
        }
        // undefined → 非 data 行或解析失败，跳过
      }
    }

    // ---- 5. 流自然结束（reader done 但未收到 [DONE]） ----
    // 处理 buffer 中可能残留的最后一行
    if (buffer.trim()) {
      const result = parseSSELine(buffer.trim());
      if (result !== undefined && result !== null) {
        onToken(result);
      }
    }
    onDone();
  } catch (error) {
    // AbortError → 静默处理
    if (error instanceof DOMException && error.name === "AbortError") {
      return;
    }
    onError(
      error instanceof Error ? error : new Error("流式读取过程中发生未知错误")
    );
  } finally {
    // 确保 reader 被释放
    reader.releaseLock();
  }
}
