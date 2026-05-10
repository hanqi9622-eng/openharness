#!/usr/bin/env python3
"""
guard_write.py — 文件写入保护 Hook

在 AI 写入文件前，校验目标路径是否在保护列表中。
受保护的路径禁止 AI 直接修改，需要人工确认。

使用方式: 作为 Claude Code Pre-Write Hook
触发时机: AI 尝试写入文件时
"""

import sys
import os
import re

# ============================================================================
# 受保护的文件路径模式
# ============================================================================
PROTECTED_PATTERNS = [
    # 生产环境配置
    r'^application-prod\.yml$',
    r'^application-prod\.yaml$',
    r'^application-prod\.properties$',
    # 数据库迁移
    r'.*/db/migration/.*',
    # SQL 脚本
    r'.*/sql/.*',
    # 部署配置
    r'.*/deploy/.*',
    r'.*/k8s/.*',
    r'.*/docker-compose.*\.yml$',
    # 密钥和凭证
    r'.*/secrets/.*',
    r'.*\.env$',
    r'.*\.env\.',
    r'.*\.pem$',
    r'.*\.key$',
    r'.*\.p12$',
    r'.*\.jks$',
    # CI/CD
    r'.*/\.github/workflows/.*',
    r'.*/Jenkinsfile$',
    # 安全配置
    r'.*SecurityConfig\.java$',
    # Harness 核心文件（规则变更需走流程）
    r'.*/harness/HARNESS\.md$',
    r'.*/harness/board\.json$',
    # OpenSpec 主 spec（应通过 archive 同步，不应直接修改）
    r'.*/openspec/specs/.*/spec\.md$',
]

# 编译正则
COMPILED_PATTERNS = [re.compile(p) for p in PROTECTED_PATTERNS]


def check_path(file_path: str) -> tuple[bool, str]:
    """
    检查文件路径是否受保护。
    返回: (是否允许写入, 原因说明)
    """
    # 规范化路径
    normalized = file_path.replace('\\', '/')
    
    for i, pattern in enumerate(COMPILED_PATTERNS):
        if pattern.search(normalized):
            category = get_category(i)
            return False, f"文件路径匹配保护规则 [{category}]: {PROTECTED_PATTERNS[i]}"
    
    return True, ""


def get_category(pattern_index: int) -> str:
    """根据模式索引返回保护类别"""
    categories = [
        "生产配置", "生产配置", "生产配置",
        "数据库迁移",
        "SQL脚本",
        "部署配置", "部署配置", "部署配置",
        "密钥凭证", "密钥凭证", "密钥凭证", "密钥凭证", "密钥凭证", "密钥凭证",
        "CI/CD", "CI/CD",
        "安全配置",
        "Harness核心", "Harness核心",
        "OpenSpec主Spec",
    ]
    if pattern_index < len(categories):
        return categories[pattern_index]
    return "未知"


def main():
    """
    Hook 入口。
    从 stdin 读取 JSON，检查 file_path 是否受保护。
    
    输入格式 (Claude Code Hook):
    {
      "tool_name": "Write",
      "tool_input": {
        "file_path": "path/to/file",
        "content": "..."
      }
    }
    
    输出:
    - 退出码 0: 允许写入
    - 退出码 2: 阻止写入
    """
    import json
    
    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        # 无法解析输入，默认允许
        sys.exit(0)
    
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    
    # 只检查写入操作
    if tool_name not in ("Write", "Edit", "MultiEdit"):
        sys.exit(0)
    
    file_path = tool_input.get("file_path", "")
    if not file_path:
        sys.exit(0)
    
    allowed, reason = check_path(file_path)
    
    if not allowed:
        print(f"🚫 写入被拦截: {file_path}", file=sys.stderr)
        print(f"   原因: {reason}", file=sys.stderr)
        print(f"   如果确实需要修改此文件，请人工确认后操作。", file=sys.stderr)
        sys.exit(2)
    
    sys.exit(0)


if __name__ == "__main__":
    main()
