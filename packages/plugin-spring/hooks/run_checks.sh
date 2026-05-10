#!/bin/bash
# ============================================================================
# run_checks.sh — 写入后自动检查 Hook
# ============================================================================
# 在 AI 写入文件后，自动运行编译和测试，确保修改不会破坏构建。
#
# 使用方式: 作为 Claude Code Post-Write Hook
# 触发时机: AI 写入文件后
# ============================================================================

set +e

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
CHANGED_FILE="$1"

# ============================================================================
# 判断变更文件类型，决定运行哪些检查
# ============================================================================

NEED_BACKEND_CHECK=false
NEED_FRONTEND_CHECK=false
NEED_MIGRATION_CHECK=false

if echo "$CHANGED_FILE" | grep -qE '\.java$|pom\.xml$'; then
    NEED_BACKEND_CHECK=true
fi

if echo "$CHANGED_FILE" | grep -qE '\.ts$|\.vue$|\.tsx$|package\.json$'; then
    NEED_FRONTEND_CHECK=true
fi

if echo "$CHANGED_FILE" | grep -qE '\.sql$|db/migration/'; then
    NEED_MIGRATION_CHECK=true
fi

# 如果不是代码文件，跳过检查
if [ "$NEED_BACKEND_CHECK" = false ] && [ "$NEED_FRONTEND_CHECK" = false ] && [ "$NEED_MIGRATION_CHECK" = false ]; then
    exit 0
fi

# ============================================================================
# 运行检查
# ============================================================================

CHECKS_PASSED=true

cd "$PROJECT_ROOT"

# Backend 检查
if [ "$NEED_BACKEND_CHECK" = true ] && [ -d "backend" ]; then
    echo "🔧 Running backend compile check..." >&2
    
    cd backend
    
    # 编译检查
    if ! mvn compile -q -DskipTests 2>/dev/null; then
        echo "❌ Backend compile failed" >&2
        CHECKS_PASSED=false
    else
        echo "✅ Backend compile passed" >&2
        
        # 编译通过后跑单元测试
        if ! mvn test -q 2>/dev/null; then
            echo "⚠️  Backend unit tests failed (non-blocking for hook)" >&2
            # 测试失败不阻止写入，但给出警告
        else
            echo "✅ Backend unit tests passed" >&2
        fi
    fi
    
    cd "$PROJECT_ROOT"
fi

# Frontend 检查
if [ "$NEED_FRONTEND_CHECK" = true ] && [ -d "frontend" ]; then
    echo "🔧 Running frontend type check..." >&2
    
    cd frontend
    
    # TypeScript 类型检查
    if ! npx vue-tsc --noEmit 2>/dev/null; then
        echo "❌ Frontend type check failed" >&2
        CHECKS_PASSED=false
    else
        echo "✅ Frontend type check passed" >&2
    fi
    
    cd "$PROJECT_ROOT"
fi

# Migration 检查
if [ "$NEED_MIGRATION_CHECK" = true ] && [ -d "backend" ]; then
    echo "🔧 Running migration check..." >&2
    
    cd backend
    
    # 检查 Flyway 迁移是否可执行
    if ! mvn flyway:validate -q 2>/dev/null; then
        echo "⚠️  Flyway validation failed (non-blocking for hook)" >&2
    else
        echo "✅ Flyway validation passed" >&2
    fi
    
    cd "$PROJECT_ROOT"
fi

# ============================================================================
# 输出结果
# ============================================================================

if [ "$CHECKS_PASSED" = true ]; then
    echo "✅ All auto-checks passed after write" >&2
    exit 0
else
    echo "❌ Some auto-checks failed after write - please fix before proceeding" >&2
    # 不阻止写入（让 AI 有机会修复），但给出明确警告
    exit 0
fi
