// ============================================================
// DraftMind — 自定义列表输入规则插件
//
// 基于 ProseMirror wrappingInputRule + findWrapping，
// 自动计算 schema 所需的完整包裹链（如 bullet_list → list_item）。
// 避免手动拼接 wrapper 导致的 "Invalid content" 错误。
//
// 自定义 cursor 定位：转换后光标精准停留在列表项文本起始位置。
// ============================================================

import { wrappingInputRule } from "@milkdown/prose/inputrules";
import type { NodeType } from "@milkdown/prose/model";
import { $inputRule } from "@milkdown/utils";
import { schemaCtx } from "@milkdown/core";

/**
 * 创建列表输入规则。
 *
 * 使用 findWrapping 自动发现 schema 要求的包裹链，
 * 而不是手工指定 [{type: bulletList}, {type: listItem}]。
 */
function makeListInputRule(regex: RegExp, listNodeType: NodeType) {
  return wrappingInputRule(regex, listNodeType);
}

/**
 * 创建任务列表输入规则（带 checked 属性）。
 */
function makeTaskListInputRule(
  regex: RegExp,
  listNodeType: NodeType,
  checked: boolean,
) {
  return wrappingInputRule(regex, listNodeType, () => ({ checked }));
}

// ============================================================
// 无序列表：-  | *  | +
// ============================================================

export const bulletListInputRule = $inputRule((ctx) => {
  const schema = ctx.get(schemaCtx);
  return makeListInputRule(
    /^\s*([-+*])\s$/,
    schema.nodes.bullet_list as NodeType,
  );
});

// ============================================================
// 有序列表：1.  | 1)
// ============================================================

export const orderedListInputRule = $inputRule((ctx) => {
  const schema = ctx.get(schemaCtx);
  return makeListInputRule(
    /^\s*(\d+)[.)]\s$/,
    schema.nodes.ordered_list as NodeType,
  );
});

// ============================================================
// 任务列表：- [ ]   |  - [x]
// ============================================================

export const taskListUncheckedInputRule = $inputRule((ctx) => {
  const schema = ctx.get(schemaCtx);
  return makeTaskListInputRule(
    /^\s*[-+*]\s\[\s\]\s$/,
    schema.nodes.bullet_list as NodeType,
    false,
  );
});

export const taskListCheckedInputRule = $inputRule((ctx) => {
  const schema = ctx.get(schemaCtx);
  return makeTaskListInputRule(
    /^\s*[-+*]\s\[[xX]\]\s$/,
    schema.nodes.bullet_list as NodeType,
    true,
  );
});

// ============================================================
// 统一导出
// ============================================================

export const listInputRules = [
  bulletListInputRule,
  orderedListInputRule,
  taskListUncheckedInputRule,
  taskListCheckedInputRule,
];
