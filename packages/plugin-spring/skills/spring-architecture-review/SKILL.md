---
name: spring-architecture-review
description: Spring Boot 分层架构审计。检查 Controller/Service/Repository/Entity 的分层规范是否被遵守。
license: MIT
---

# spring-architecture-review — Spring 分层架构审计

## 目的

检查 Spring Boot 项目的分层架构是否被正确遵守。核心原则：**Controller 薄、Service 厚、Repository 只做数据访问**。

## 触发时机

- `/opsx:apply` 后，涉及后端代码时
- `gate-v2.sh` 的 Section 8 是自动版，本 skill 是深度审计版

## 检查维度

### 1. Controller 层

| 检查项 | 通过条件 | 失败说明 |
|--------|----------|----------|
| 无业务逻辑 | Controller 中不调用 Repository | Controller 只做参数校验和响应转换 |
| 无 @Transactional | Controller 中不出现事务注解 | 事务应在 Service 层 |
| 使用 DTO | 方法参数和返回值不直接使用 Entity | Entity 是内部实现，不应暴露 |
| 参数校验 | 使用 @Valid / @Validated | 手动 if-else 校验应移到 Service |
| 统一响应格式 | 返回 ApiResponse 包装 | 不直接返回裸数据 |

### 2. Service 层

| 检查项 | 通过条件 | 失败说明 |
|--------|----------|----------|
| 业务逻辑在此 | 所有业务逻辑在 Service 中 | Controller 不应包含业务逻辑 |
| 事务标注 | 写操作方法有 @Transactional | 缺少事务可能导致数据不一致 |
| 事务粒度 | @Transactional 在方法级别 | 类级别事务粒度太粗 |
| 构造器注入 | 使用构造器注入而非 @Autowired | @Autowired 字段注入不利于测试 |
| 无静态方法 | Service 方法不是 static | static 方法无法被代理和事务管理 |

### 3. Repository 层

| 检查项 | 通过条件 | 失败说明 |
|--------|----------|----------|
| 接口定义 | Repository 是接口 | 不应有实现类（JPA 代理） |
| 查询方法命名 | 遵循 Spring Data 命名规范 | 自定义查询用 @Query |
| 无业务逻辑 | Repository 不包含业务逻辑 | 逻辑应上移到 Service |

### 4. Entity 层

| 检查项 | 通过条件 | 失败说明 |
|--------|----------|----------|
| 标准 ID | 有 id 字段 | — |
| 时间戳 | 有 created_at, updated_at | 审计需要 |
| 软删除 | 有 is_deleted, deleted_at | 物理删除应避免 |
| 无业务逻辑 | Entity 不包含业务方法 | 逻辑应上移到 Service |
| 关联合理 | 不出现 N+1 的 FetchType.EAGER | 关联使用 LAZY |

### 5. DTO 层

| 检查项 | 通过条件 | 失败说明 |
|--------|----------|----------|
| Request/Response 分离 | 入参和出参使用不同 DTO | 不应用同一个 DTO |
| 校验注解 | Request DTO 字段有 @NotNull/@Size 等 | 缺少校验导致脏数据 |
| 无敏感字段 | Response DTO 不包含密码/密钥 | 安全要求 |

## 执行步骤

### 1. 扫描变更文件

```bash
# 获取变更的 Java 文件列表
git diff --name-only HEAD~1 -- '*.java'
```

### 2. 按层分类

将变更文件分类为 Controller / Service / Repository / Entity / DTO / Other。

### 3. 逐文件检查

对每个变更文件按上述检查维度逐项检查。

### 4. 产出审计报告

```markdown
## Spring Architecture Audit Report

### 变更文件分类
- Controller: [文件列表]
- Service: [文件列表]
- Repository: [文件列表]
- Entity: [文件列表]
- DTO: [文件列表]

### 检查结果

| # | 层级 | 文件 | 检查项 | 结果 | 说明 |
|---|------|------|--------|------|------|
| 1 | Controller | AuthController.java | 无业务逻辑 | ✅ | — |
| 2 | Controller | AuthController.java | 使用 DTO | ❌ | login() 方法直接返回 Entity |
| 3 | Service | OrderService.java | 事务标注 | ⚠️ | cancelOrder() 缺少 @Transactional |
| ... | ... | ... | ... | ... | ... |

### 问题汇总
[BLOCKING / MAJOR / MINOR 分级]

### 建议
[具体修复建议]
```

## 注意

- 本 skill 只做审计，不修改代码
- 审计结果供 reviewer agent 参考
- 与 gate-v2.sh Section 8 互补：gate 做基础检查，skill 做深度审计
