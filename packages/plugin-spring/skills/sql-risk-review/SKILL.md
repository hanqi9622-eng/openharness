---
name: sql-risk-review
description: SQL 和数据层风险审计。检查 SQL 注入、N+1 查询、批量操作安全、分页、索引等数据层风险。
license: MIT
---

# sql-risk-review — SQL / 数据层风险审计

## 目的

检查数据层代码中的 SQL 风险。数据层事故的修复成本极高（数据丢了就没了），所以必须在提交前严格审计。

## 触发时机

- `/opsx:apply` 后，涉及数据层代码时
- 涉及以下文件时必须运行：
  - `*Repository.java`
  - `*Mapper.xml`
  - `*Service.java`（如果包含查询逻辑）
  - `V*.sql`（数据库迁移文件）

## 检查维度

### 1. SQL 注入风险

| 检查项 | 危险模式 | 安全模式 | 严重性 |
|--------|----------|----------|--------|
| MyBatis 参数 | `${param}` | `#{param}` | 🔴 BLOCKING |
| 字符串拼接 SQL | `"SELECT * FROM " + table` | 参数化查询 | 🔴 BLOCKING |
| 动态表名/列名 | 直接拼接 | 白名单校验后使用 | 🔴 BLOCKING |

### 2. 批量操作安全

| 检查项 | 危险模式 | 安全模式 | 严重性 |
|--------|----------|----------|--------|
| UPDATE 无 WHERE | `UPDATE table SET col=val` | `UPDATE table SET col=val WHERE id=?` | 🔴 BLOCKING |
| DELETE 无 WHERE | `DELETE FROM table` | `DELETE FROM table WHERE id=?` | 🔴 BLOCKING |
| 批量大小无限制 | 一次更新全表 | 分批处理，每批 ≤ 1000 | 🟡 MAJOR |

### 3. N+1 查询风险

| 检查项 | 危险模式 | 安全模式 | 严重性 |
|--------|----------|----------|--------|
| 循环中查 DB | `for (id : ids) { repo.findById(id) }` | `repo.findAllById(ids)` | 🟡 MAJOR |
| 懒加载循环 | `order.getItems().forEach(i -> i.getProduct().getName())` | JOIN FETCH 或批量查询 | 🟡 MAJOR |
| Stream 中查 DB | `ids.stream().map(id -> repo.findById(id))` | 批量查询 + 内存映射 | 🟡 MAJOR |

### 4. 分页和结果集

| 检查项 | 危险模式 | 安全模式 | 严重性 |
|--------|----------|----------|--------|
| 无分页查询 | `findAll()` 返回 List | `findAll(Pageable)` 返回 Page | 🟡 MAJOR |
| SELECT * | `SELECT * FROM table` | 明确列出需要的列 | 🟢 MINOR |
| 大结果集导出 | 一次性加载到内存 | 流式处理或分页 | 🟡 MAJOR |

### 5. 索引和性能

| 检查项 | 危险模式 | 安全模式 | 严重性 |
|--------|----------|----------|--------|
| 查询无索引 | `WHERE non_indexed_col = ?` | 确保查询字段有索引 | 🟡 MAJOR |
| 函数导致索引失效 | `WHERE LOWER(col) = ?` | `WHERE col = LOWER(?)` | 🟢 MINOR |
| 隐式类型转换 | `WHERE varchar_col = 123` | 类型匹配 | 🟢 MINOR |

### 6. 数据库迁移

| 检查项 | 危险模式 | 安全模式 | 严重性 |
|--------|----------|----------|--------|
| DROP TABLE | `DROP TABLE xxx` | 软删除 + 延迟清理 | 🔴 BLOCKING |
| DROP COLUMN | `DROP COLUMN xxx` | 废弃标记 + 延迟删除 | 🔴 BLOCKING |
| 数据迁移无事务 | 迁移 SQL 无事务保护 | 使用事务块包裹 | 🟡 MAJOR |
| 迁移无回滚方案 | 无回滚脚本 | 必须提供回滚脚本 | 🟡 MAJOR |

### 7. 事务安全

| 检查项 | 危险模式 | 安全模式 | 严重性 |
|--------|----------|----------|--------|
| 长事务 | 方法内循环 + 多次 DB 操作 | 缩小事务范围 | 🟡 MAJOR |
| 嵌套事务 | REQUIRES_NEW 滥用 | 谨慎使用，明确语义 | 🟢 MINOR |
| 事务中调远程 | 事务内调 RPC/HTTP | 远程调用移到事务外 | 🟡 MAJOR |

## 执行步骤

### 1. 识别数据层变更

```bash
# 获取变更的数据层文件
git diff --name-only HEAD~1 -- '*Repository.java' '*Mapper.xml' '*Entity.java' '*.sql'
```

### 2. 逐文件扫描

对每个变更文件按上述检查维度逐项扫描：

```bash
# 检查 MyBatis ${} 注入
grep -rE '\$\{[^}]+\}' backend/src/main/resources --include='*.xml'

# 检查无 WHERE 的 UPDATE/DELETE
grep -rE 'UPDATE.*SET|DELETE.*FROM' backend/src --include='*.java' --include='*.xml' -A 5

# 检查循环中的 DB 调用
grep -rE 'for\s*\(|\.forEach\(' backend/src/main/java --include='*.java' -A 5 | grep -E '\.find|\.save|\.delete'

# 检查无分页查询
grep -rE 'List<.*>\s+findAll\(\)|List<.*>\s+findBy' backend/src/main/java --include='*Repository.java'
```

### 3. 产出审计报告

```markdown
## SQL Risk Audit Report

### 扫描范围
[变更文件列表]

### 检查结果

| # | 类别 | 文件 | 行号 | 严重性 | 问题描述 | 修复建议 |
|---|------|------|------|--------|----------|----------|
| 1 | SQL 注入 | OrderMapper.xml | L45 | 🔴 BLOCKING | 使用 ${orderId} | 改为 #{orderId} |
| 2 | N+1 查询 | OrderService.java | L78 | 🟡 MAJOR | 循环中调用 findById | 改用 findAllById |
| 3 | 无分页 | UserRepository.java | L12 | 🟡 MAJOR | findAll() 返回 List | 改为分页查询 |
| 4 | 批量无限制 | ProductMapper.xml | L23 | 🟡 MAJOR | UPDATE 无 WHERE | 增加 WHERE 条件 |

### 修复优先级
1. 🔴 BLOCKING 必须修复后才能提交
2. 🟡 MAJOR 建议修复，可标记为 tech-debt
3. 🟢 MINOR 建议改进，不影响提交

### 隐性约定检查
[对照 implicit-contracts.md 中与数据相关的约定]
```

## 注意

- 本 skill 只做审计，不修改代码
- BLOCKING 级问题必须修复后才能继续
- 审计结果供 reviewer agent 参考
- 与 gate-v2.sh Section 9 互补：gate 做基础检查，skill 做深度审计
