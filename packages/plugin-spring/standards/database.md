# 数据库与 SQL 规范

> 告诉 AI 怎么写 SQL、怎么管理数据库迁移。

---

## 迁移规范

### 命名

```
V{major}_{minor}__{description}.sql

例:
V1_0__create_user_table.sql
V2_1__add_order_item_table.sql
V3_0__add_phone_to_user.sql
```

### 规则

- ✅ 所有 schema 变更通过 Flyway 迁移
- ✅ 每个迁移只做一件事
- ❌ **绝不**修改或删除已有迁移文件
- ❌ **绝不**使用 `DROP TABLE`（除非人工审批）
- ❌ **绝不**使用 `DROP COLUMN`（除非人工审批）

### 表结构要求

每张表必须包含：

```sql
id           BIGSERIAL PRIMARY KEY,
created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
is_deleted   BOOLEAN  NOT NULL DEFAULT FALSE,
deleted_at   TIMESTAMP NULL
```

## 查询规范

### 必须使用参数化查询

```java
// ✅ 正确
@Query("SELECT u FROM User u WHERE u.email = :email")
User findByEmail(@Param("email") String email);

// ❌ 错误（SQL 注入风险）
@Query("SELECT u FROM User u WHERE u.email = '" + email + "'")
```

### MyBatis 参数

```xml
<!-- ✅ 正确 -->
WHERE id = #{id}

<!-- ❌ 错误（SQL 注入风险） -->
WHERE id = ${id}
```

### 分页查询

```java
// ✅ 正确
Page<User> findAll(Pageable pageable);

// ❌ 错误（大结果集 OOM 风险）
List<User> findAll();
```

### 批量操作

```sql
-- ✅ 正确：有 WHERE 条件
UPDATE orders SET status = 'CANCELLED' WHERE id IN (:ids) AND status = 'PENDING';

-- ❌ 错误：无 WHERE 条件
UPDATE orders SET status = 'CANCELLED';
```

## 索引规范

| 场景 | 建议 |
|------|------|
| WHERE 条件字段 | 必须有索引 |
| JOIN 关联字段 | 必须有索引 |
| ORDER BY 字段 | 建议有索引 |
| 外键字段 | 必须有索引 |
| 联合查询 | 使用复合索引 |

## 数据类型规范

| Java 类型 | 数据库类型 | 说明 |
|-----------|-----------|------|
| String | VARCHAR(n) | 明确长度，不用 TEXT |
| BigDecimal | DECIMAL(19,2) | 金额必须用 DECIMAL |
| LocalDateTime | TIMESTAMP | 统一 UTC 存储 |
| Boolean | BOOLEAN | — |
| Long / BigInteger | BIGINT | — |

---

*数据库规范 v1.0*
