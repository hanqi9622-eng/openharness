#!/bin/bash
# ============================================================================
# gate-v2.sh - 融合版增强门禁脚本
# 基于 Harness v4.0 gate.sh + OpenSpec 一致性检查 + Spring/SQL 专项检查
# ============================================================================
# 用法: ./gate-v2.sh [--skip-api-check] [--skip-openspec] [--skip-spring] [--skip-sql]
# 退出码: 0 = 全部通过, 1 = 有失败项
# ============================================================================

set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$SCRIPT_DIR/.logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/gate-$TIMESTAMP.log"

mkdir -p "$LOG_DIR"

# 命令行参数
SKIP_API_CHECK=false
SKIP_OPENSPEC=false
SKIP_SPRING=false
SKIP_SQL=false

for arg in "$@"; do
  case $arg in
    --skip-api-check) SKIP_API_CHECK=true ;;
    --skip-openspec)  SKIP_OPENSPEC=true ;;
    --skip-spring)    SKIP_SPRING=true ;;
    --skip-sql)       SKIP_SQL=true ;;
  esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

FAILED=0
WARNINGS=0
TOTAL=0

log() {
    echo -e "${BLUE}[LOG]${NC} $1" | tee -a "$LOG_FILE"
}

pass() {
    echo -e "${GREEN}[PASS]${NC} $1" | tee -a "$LOG_FILE"
}

fail() {
    echo -e "${RED}[FAIL]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

check() {
    local name="$1"
    local cmd="$2"
    local optional="${3:-false}"

    TOTAL=$((TOTAL + 1))
    echo "" | tee -a "$LOG_FILE"
    echo "========================================" | tee -a "$LOG_FILE"
    echo "[CHECK] $name" | tee -a "$LOG_FILE"
    echo "========================================" | tee -a "$LOG_FILE"

    local output
    output=$(eval "$cmd" 2>&1)
    local exit_code=$?

    echo "$output" >> "$LOG_FILE"

    if [ $exit_code -eq 0 ]; then
        pass "$name"
        return 0
    else
        if [ "$optional" = "true" ]; then
            warn "$name (optional)"
            WARNINGS=$((WARNINGS + 1))
            return 0
        else
            fail "$name"
            echo "       Command: $cmd" | tee -a "$LOG_FILE"
            FAILED=$((FAILED + 1))
            return 1
        fi
    fi
}

# ============================================================================
# HEADER
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "╔════════════════════════════════════════════════════════════╗" | tee -a "$LOG_FILE"
echo "║       HARNESS FUSION GATE CHECK - v2.0                   ║" | tee -a "$LOG_FILE"
echo "║       $(date '+%Y-%m-%d %H:%M:%S')                           ║" | tee -a "$LOG_FILE"
echo "╚════════════════════════════════════════════════════════════╝" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Log file: $LOG_FILE" | tee -a "$LOG_FILE"
echo "Project root: $PROJECT_ROOT" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

cd "$PROJECT_ROOT"

# ============================================================================
# SECTION 1: PRE-COMMIT CHECKS (原 v4.0)
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "┌─────────────────────────────────────┐" | tee -a "$LOG_FILE"
echo "│ SECTION 1: Pre-Commit Checks       │" | tee -a "$LOG_FILE"
echo "└─────────────────────────────────────┘" | tee -a "$LOG_FILE"

check "Git: 无敏感文件" \
    "! git status --porcelain | grep -E '^\?\?.*\.env$'"

check "Git: .gitignore 存在且合理" \
    "[ -f .gitignore ] && grep -qE '(node_modules|target|dist)' .gitignore"

check "Git: .env 未跟踪" \
    "! git ls-files --others --exclude-standard | grep -q '^\.env$'" || true

# ============================================================================
# SECTION 2: BACKEND CHECKS (原 v4.0)
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "┌─────────────────────────────────────┐" | tee -a "$LOG_FILE"
echo "│ SECTION 2: Backend Checks (Java)   │" | tee -a "$LOG_FILE"
echo "└─────────────────────────────────────┘" | tee -a "$LOG_FILE"

if [ -d "backend" ]; then
    (
        cd backend || exit 1

        check "Backend: Maven 编译" \
            "mvn clean compile -q -DskipTests"

        check "Backend: 单元测试" \
            "mvn test -q"

        check "Backend: 集成测试" \
            "mvn verify -q"

        if [ -f "pom.xml" ] && grep -q "jacoco" pom.xml 2>/dev/null; then
            check "Backend: 覆盖率 ≥ 80%" \
                "mvn jacoco:check -q" "true"
        fi

        if [ -f "pom.xml" ] && grep -q "dependency-check" pom.xml 2>/dev/null; then
            check "Backend: 安全依赖检查" \
                "mvn dependency-check:check -q" "true"
        fi
    )
else
    warn "No backend directory found - skipping backend checks"
fi

# ============================================================================
# SECTION 3: FRONTEND CHECKS (原 v4.0)
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "┌─────────────────────────────────────┐" | tee -a "$LOG_FILE"
echo "│ SECTION 3: Frontend Checks (Vue)    │" | tee -a "$LOG_FILE"
echo "└─────────────────────────────────────┘" | tee -a "$LOG_FILE"

if [ -d "frontend" ]; then
    (
        cd frontend || exit 1

        check "Frontend: npm 依赖安装" \
            "[ -d node_modules ] || npm install"

        check "Frontend: TypeScript 类型检查" \
            "npx vue-tsc --noEmit"

        check "Frontend: ESLint 检查" \
            "npm run lint"

        check "Frontend: 构建测试" \
            "npm run build"
    )
else
    warn "No frontend directory found - skipping frontend checks"
fi

# ============================================================================
# SECTION 4: GIT CHECKS (原 v4.0)
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "┌─────────────────────────────────────┐" | tee -a "$LOG_FILE"
echo "│ SECTION 4: Git Checks               │" | tee -a "$LOG_FILE"
echo "└─────────────────────────────────────┘" | tee -a "$LOG_FILE"

check "Git: 工作区干净或仅有预期变更" \
    "git diff-index --quiet HEAD -- || git diff --cached --stat | grep -q ."

check "Git: commit 消息格式" \
    "git log -1 --format='%s' | grep -qE '^(Task|feat|fix|docs|chore|style|test|refactor|perf|ci|build|revert):'"

check "Git: 无大文件 (>5MB)" \
    "! git ls-files | xargs -I {} sh -c 'git ls-tree -r HEAD {} 2>/dev/null | awk \"\\\$3 > 5000000 { print \\\$4 }\"' | grep -q ." "true"

# ============================================================================
# SECTION 5: CODE QUALITY CHECKS (原 v4.0)
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "┌─────────────────────────────────────┐" | tee -a "$LOG_FILE"
echo "│ SECTION 5: Code Quality Checks      │" | tee -a "$LOG_FILE"
echo "└─────────────────────────────────────┘" | tee -a "$LOG_FILE"

check "代码: 无 TODO/FIXME 残留" \
    "! grep -rE 'TODO|FIXME|HACK|XXX' --include='*.java' --include='*.ts' --include='*.vue' backend/src frontend/src 2>/dev/null" \
    "true"

if [ -d "backend/src" ]; then
    check "Backend: 无 System.out.println" \
        "! grep -r 'System\.out\.println' backend/src --include='*.java' --exclude-dir=test 2>/dev/null"
fi

if [ -d "frontend/src" ]; then
    check "Frontend: 无 console.log" \
        "! grep -r 'console\.log' frontend/src --include='*.ts' --include='*.vue' 2>/dev/null"
fi

# ============================================================================
# SECTION 6: DATABASE MIGRATION CHECKS (原 v4.0)
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "┌─────────────────────────────────────┐" | tee -a "$LOG_FILE"
echo "│ SECTION 6: Database Migration       │" | tee -a "$LOG_FILE"
echo "└─────────────────────────────────────┘" | tee -a "$LOG_FILE"

if [ -d "backend/src/main/resources/db/migration" ]; then
    check "Database: 迁移文件命名规范" \
        "ls backend/src/main/resources/db/migration/V*.sql | grep -qE 'V[0-9]+_[0-9]+__.+\.sql'" "true"

    check "Database: 无 DROP TABLE 在迁移中" \
        "! grep -rE 'DROP TABLE|DROP COLUMN' backend/src/main/resources/db/migration/*.sql 2>/dev/null" "true"
fi

# ============================================================================
# SECTION 7: SECURITY CHECKS (原 v4.0)
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "┌─────────────────────────────────────┐" | tee -a "$LOG_FILE"
echo "│ SECTION 7: Security Checks          │" | tee -a "$LOG_FILE"
echo "└─────────────────────────────────────┘" | tee -a "$LOG_FILE"

check "Security: 无明显硬编码密钥" \
    "! grep -rE 'password\s*=\s*[\"'\''a-zA-Z0-9]{8,}|apiKey\s*=\s*[\"'\''a-zA-Z0-9]{20,}' backend/src frontend/src --exclude-dir=test --exclude-dir=__tests__ 2>/dev/null" \
    "true"

# ============================================================================
# SECTION 8: SPRING ARCHITECTURE CHECKS (v2.0 新增)
# ============================================================================
if [ "$SKIP_SPRING" = false ]; then
echo "" | tee -a "$LOG_FILE"
echo "┌─────────────────────────────────────────────┐" | tee -a "$LOG_FILE"
echo "│ SECTION 8: Spring Architecture Checks (NEW) │" | tee -a "$LOG_FILE"
echo "└─────────────────────────────────────────────┘" | tee -a "$LOG_FILE"

if [ -d "backend/src" ]; then
    # 检查 Controller 是否包含业务逻辑
    check "Spring: Controller 无业务逻辑" \
        "! grep -rE '@Transactional|\.save\(|\.delete\(|\.findById\(' backend/src/main/java --include='*Controller.java' 2>/dev/null"

    # 检查 Service 是否标注 @Transactional
    check "Spring: Service 方法标注 @Transactional" \
        "! grep -rl 'class.*Service' backend/src/main/java --include='*.java' | xargs grep -L '@Transactional' 2>/dev/null | grep -q 'Service'" "true"

    # 检查 Controller 是否直接使用 Entity 而非 DTO
    check "Spring: Controller 使用 DTO 而非 Entity" \
        "! grep -rE 'public.*ResponseEntity<Entity|@RequestBody\s+Entity' backend/src/main/java --include='*Controller.java' 2>/dev/null" "true"

    # 检查是否有 @Autowired 字段注入（应使用构造器注入）
    check "Spring: 无 @Autowired 字段注入" \
        "! grep -rE '@Autowired' backend/src/main/java --include='*.java' | grep -v 'constructor\|//' | grep -v 'test' 2>/dev/null" "true"

    # 检查异常处理是否有 GlobalExceptionHandler
    check "Spring: 有全局异常处理" \
        "grep -rl '@ControllerAdvice\|@RestControllerAdvice' backend/src/main/java --include='*.java' 2>/dev/null | grep -q ." "true"
else
    warn "No backend/src directory found - skipping Spring checks"
fi
fi

# ============================================================================
# SECTION 9: SQL / DATA LAYER RISK CHECKS (v2.0 新增)
# ============================================================================
if [ "$SKIP_SQL" = false ]; then
echo "" | tee -a "$LOG_FILE"
echo "┌──────────────────────────────────────────────┐" | tee -a "$LOG_FILE"
echo "│ SECTION 9: SQL / Data Layer Risk Checks (NEW) │" | tee -a "$LOG_FILE"
echo "└──────────────────────────────────────────────┘" | tee -a "$LOG_FILE"

if [ -d "backend/src" ]; then
    # 检查批量更新是否有 WHERE 限制
    check "SQL: UPDATE/DELETE 有 WHERE 子句" \
        "! grep -rE '(UPDATE|update).*SET.*=.+(?!.*WHERE)' backend/src/main/java --include='*.java' --include='*.xml' 2>/dev/null | head -5 | grep -qv 'WHERE\|where' || ! grep -rE '<update|<delete' backend/src/main/resources --include='*.xml' -A 10 2>/dev/null | grep -E '(update|delete)' | grep -qv 'where\|WHERE'" "true"

    # 检查 MyBatis XML Mapper 中是否有 ${} 注入风险
    check "SQL: 无 \${} 字符串拼接（MyBatis 注入风险）" \
        "! grep -rE '\\$\\{[^}]+\\}' backend/src/main/resources --include='*.xml' 2>/dev/null | grep -v 'select\|where\|if\|foreach\|set\|trim\|choose\|when\|otherwise\|include\|sql'" "true"

    # 检查是否有 N+1 查询风险（循环中调用 Repository）
    check "SQL: 无循环内调用 Repository（N+1 风险）" \
        "! grep -rE '(for\s*\(|while\s*\(|\.forEach\(|\.stream\(\)\.map)' backend/src/main/java --include='*.java' -A 5 2>/dev/null | grep -E '\.findById\(|\.save\(|\.findAll\(|\.getOne\(' | grep -qv '//'" "true"

    # 检查大结果集是否分页
    check "SQL: 查询方法使用分页" \
        "! grep -rE 'List<.*> findAll\(\)|List<.*> findBy.*\(\)' backend/src/main/java --include='*Repository.java' 2>/dev/null | grep -v 'Pageable\|Page<\|limit'" "true"

    # 检查是否有 SELECT * 
    check "SQL: 无 SELECT * 查询" \
        "! grep -rE 'SELECT\s+\*' backend/src/main/resources --include='*.xml' --include='*.sql' 2>/dev/null" "true"

    # 检查索引使用（查找 @Index 注解或 idx_ 命名）
    check "SQL: Entity 查询字段有索引" \
        "grep -rE '@Table|@Index|@Column' backend/src/main/java --include='*.java' 2>/dev/null | grep -c '@Index' | awk '{if(\$1>0) exit 0; else exit 1}'" "true"
else
    warn "No backend/src directory found - skipping SQL checks"
fi
fi

# ============================================================================
# SECTION 10: API COMPATIBILITY CHECKS (v2.0 新增，微服务场景)
# ============================================================================
if [ "$SKIP_API_CHECK" = false ]; then
echo "" | tee -a "$LOG_FILE"
echo "┌──────────────────────────────────────────────────┐" | tee -a "$LOG_FILE"
echo "│ SECTION 10: API Compatibility Checks (NEW)       │" | tee -a "$LOG_FILE"
echo "└──────────────────────────────────────────────────┘" | tee -a "$LOG_FILE"

if [ -d "contracts" ]; then
    # 检查 contracts 目录结构
    check "API: contracts/ 目录存在且包含 OpenAPI 文件" \
        "find contracts/ -name '*.yaml' -o -name '*.yml' | grep -q ."

    # 检查 OpenAPI YAML 语法（如果安装了 swagger-cli 或 openapi-generator）
    if command -v npx &> /dev/null; then
        check "API: OpenAPI YAML 语法正确" \
            "find contracts/openapi -name '*.yaml' -o -name '*.yml' | head -1 | xargs -I {} npx @redocly/cli lint {} 2>/dev/null" "true"
    fi

    # 检查 API 版本号是否在 path 中
    check "API: 接口路径包含版本号 (/api/vN/)" \
        "grep -rE 'paths:|/api/v[0-9]+/' contracts/openapi/*.yaml 2>/dev/null | grep -q '/api/v[0-9]+'" "true"

    # 检查是否有 BREAKING CHANGE 标注
    check "API: 变更文件中标注了变更类型" \
        "! git diff --cached --name-only | grep 'contracts/' | grep -q . || git diff --cached -- contracts/ | grep -qE 'BREAKING|ADDITIVE|MODIFYING'" "true"
else
    info "No contracts/ directory found - skipping API compatibility checks (monolith mode)"
fi
fi

# ============================================================================
# SECTION 11: OPENSPEC CONSISTENCY CHECKS (v2.0 新增)
# ============================================================================
if [ "$SKIP_OPENSPEC" = false ]; then
echo "" | tee -a "$LOG_FILE"
echo "┌────────────────────────────────────────────────────┐" | tee -a "$LOG_FILE"
echo "│ SECTION 11: OpenSpec Consistency Checks (NEW)      │" | tee -a "$LOG_FILE"
echo "└────────────────────────────────────────────────────┘" | tee -a "$LOG_FILE"

if [ -d "openspec/changes" ]; then
    # 检查是否有活跃 change
    ACTIVE_CHANGES=$(find openspec/changes -mindepth 1 -maxdepth 1 -type d 2>/dev/null | grep -v archive | wc -l)
    
    if [ "$ACTIVE_CHANGES" -gt 0 ]; then
        info "Found $ACTIVE_CHANGES active change(s)"

        # 检查 task.json 与活跃 change 的关联
        if [ -f "task.json" ]; then
            check "OpenSpec: task.json 关联了活跃 change" \
                "grep -q 'openspecChange' task.json 2>/dev/null" "true"
        fi

        # 检查隐性约定是否被检查
        if [ -f "docs/architecture/implicit-contracts.md" ]; then
            check "OpenSpec: implicit-contracts.md 存在" \
                "[ -f docs/architecture/implicit-contracts.md ]"
        fi
    else
        info "No active changes found"
    fi
else
    info "No openspec/changes/ directory found - skipping OpenSpec checks"
fi
fi

# ============================================================================
# SECTION 12: TEST QUALITY CHECKS (v2.0 新增)
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "┌────────────────────────────────────────────┐" | tee -a "$LOG_FILE"
echo "│ SECTION 12: Test Quality Checks (NEW)      │" | tee -a "$LOG_FILE"
echo "└────────────────────────────────────────────┘" | tee -a "$LOG_FILE"

if [ -d "backend/src/test" ]; then
    # 检查测试是否有 happy path 之外的场景
    check "Test: 测试文件存在异常场景测试" \
        "! find backend/src/test -name '*.java' -exec grep -l '@Test' {} \; | xargs grep -l 'Exception\|Error\|Invalid\|Null\|Empty\|Fail' 2>/dev/null | wc -l | awk '{if(\$1>0) exit 0; else exit 1}'" "true"

    # 检查测试方法命名是否描述场景
    check "Test: 测试方法名包含场景描述" \
        "! find backend/src/test -name '*.java' -exec grep -E '@Test' {} \; -A 1 2>/dev/null | grep -E 'void\s+test[0-9]+\(\)|void\s+test\(\)' | grep -q ." "true"
fi

# ============================================================================
# FINAL RESULTS
# ============================================================================
echo "" | tee -a "$LOG_FILE"
echo "╔════════════════════════════════════════════════════════════╗" | tee -a "$LOG_FILE"
echo "║                    GATE RESULTS                          ║" | tee -a "$LOG_FILE"
echo "╚════════════════════════════════════════════════════════════╝" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "  Total Checks: $TOTAL" | tee -a "$LOG_FILE"
echo "  Checks Failed: $FAILED" | tee -a "$LOG_FILE"
echo "  Warnings: $WARNINGS" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║               GATE PASSED                                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log "All checks passed. You may proceed with commit."
    echo ""
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║               GATE FAILED                                ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Please fix the failed checks before committing."
    echo ""
    echo "For debugging, check the log file:"
    echo "  $LOG_FILE"
    echo ""
    exit 1
fi
