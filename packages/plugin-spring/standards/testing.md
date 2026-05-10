# 测试规范

> 告诉 AI 怎么写测试、什么算测试通过。

---

## 覆盖率要求

| 维度 | 最低要求 | 目标 |
|------|---------|------|
| 行覆盖率 | 80% | 85% |
| 分支覆盖率 | 70% | 80% |

## 测试分层

### 后端测试

| 层级 | 框架 | 范围 | 命名 |
|------|------|------|------|
| 单元测试 | JUnit 5 + Mockito | Service 逻辑 | `*Test.java` |
| 集成测试 | Spring Boot Test | Controller → Service → DB | `*IT.java` |
| 架构测试 | ArchUnit (可选) | 分层规范 | `*ArchitectureTest.java` |

### 前端测试

| 层级 | 框架 | 范围 |
|------|------|------|
| 单元测试 | Vitest | 工具函数、Store actions |
| 组件测试 | Vue Test Utils | 组件行为 |
| E2E 测试 | Playwright (可选) | 关键流程 |

## 测试命名规范

```
后端: should_{预期行为}_when_{条件}
  例: shouldReturn401_whenPasswordIsIncorrect()

前端: describe('{模块}') + it('should {预期行为} when {条件}')
```

## 测试必须覆盖的场景

每个功能点至少覆盖：

- [ ] Happy path（正常流程）
- [ ] 异常输入（null, empty, 超长, 特殊字符）
- [ ] 边界条件（0, 最大值, 最小值）
- [ ] 权限校验（未登录、无权限）
- [ ] 并发场景（如果涉及共享资源）

## 禁止的测试反模式

- ❌ 只测 happy path
- ❌ 测试方法名用 test1/test2/test3
- ❌ 用 Thread.sleep 等待异步结果
- ❌ 测试间有隐式依赖（执行顺序敏感）
- ❌ Mock 了被测对象本身
- ❌ 断言用 assertEquals 而不说明预期值

---

*测试规范 v1.0*
