---
name: prepare-review
description: Review 前变更审计 — 整理变更摘要，方便人 review。在 /opsx:apply 后、人工 review 前使用。
license: MIT
---

# prepare-review — 变更摘要生成

## 目的

在代码实现完成后、人工 review 之前，自动整理一份变更摘要。让 reviewer 快速了解改了什么、为什么改、影响范围。

**这不是代码审查**，只是整理信息。

## 触发时机

- `/opsx:apply` 完成后
- 人审之前
- `/opsx:verify` 之前

## 输入

- 当前活跃的 OpenSpec change name（从 `openspec list` 获取）
- git 变更列表（`git diff --stat`）

## 步骤

### 1. 确定变更范围

```bash
# 获取当前活跃 change
openspec list --json

# 获取 git 变更统计
git diff --stat HEAD~1
git diff --stat --cached
```

### 2. 读取 change artifacts

```bash
# 读取 proposal 了解变更动机
cat openspec/changes/{change-name}/proposal.md

# 读取 tasks 了解具体任务
cat openspec/changes/{change-name}/tasks.md

# 读取 design 了解技术决策
cat openspec/changes/{change-name}/design.md
```

### 3. 整理变更摘要

产出以下信息：

```markdown
## 变更摘要: {change-name}

### 变更动机
[from proposal.md 的 Why 部分]

### 变更内容
[from tasks.md 的已完成项和 proposal.md 的 What Changes]

### 涉及文件
[from git diff --stat]

- 新增文件: [列表]
- 修改文件: [列表]
- 删除文件: [列表]

### 关键技术决策
[from design.md 的 Decisions 部分，3-5 条最重要的]

### 影响范围
[from proposal.md 的 Impact 部分]

### 隐性约定检查
[对照 implicit-contracts.md，列出可能受影响的约定]

### 待关注项
[自动识别的潜在风险点]
```

### 4. 输出

将摘要展示给用户，建议下一步：

- 建议跑 `/spring-architecture-review`（如果涉及后端代码）
- 建议跑 `/sql-risk-review`（如果涉及数据层）
- 建议跑 reviewer agent（综合审查）

## 注意

- **不要审查代码质量**，只整理信息
- **不要修改任何文件**
- 摘要应该简洁，1-2 页
- 重点是让 reviewer 能快速定位重点
