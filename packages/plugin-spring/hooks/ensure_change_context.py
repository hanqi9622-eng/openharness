#!/usr/bin/env python3
"""
ensure_change_context.py — 上下文变更保护 Hook

在 AI 写入代码文件前，检查是否有活跃的 OpenSpec change 上下文。
没有活跃 change 时禁止写代码，防止无规划的随意修改。

使用方式: 作为 Claude Code Pre-Write Hook
触发时机: AI 尝试写入代码文件时
"""

import sys
import os
import json
import subprocess

# ============================================================================
# 需要检查 change 上下文的文件模式（代码文件）
# ============================================================================
CODE_FILE_PATTERNS = [
    r'.*\.java$',
    r'.*\.kt$',
    r'.*\.ts$',
    r'.*\.tsx$',
    r'.*\.vue$',
    r'.*\.js$',
    r'.*\.jsx$',
    r'.*\.py$',
    r'.*\.sql$',
    r'.*\.xml$',
]

# 不需要检查的路径（配置/文档/测试等）
EXEMPT_PATTERNS = [
    r'.*/\.claude/.*',          # Claude 配置
    r'.*/openspec/.*',          # OpenSpec 产物（proposal/design/tasks 本身）
    r'.*/harness/.*',           # Harness 配置
    r'.*/docs/.*',              # 文档
    r'.*/README\.md$',          # README
    r'.*CLAUDE.*\.md$',         # 入口文件
    r'.*REVIEW\.md$',           # 审查文件
    r'.*/\.github/.*',          # GitHub 配置
    r'.*\.git.*',               # Git 配置
    r'.*/hooks/.*',             # Hook 脚本
]

import re

COMPILED_CODE = [re.compile(p) for p in CODE_FILE_PATTERNS]
COMPILED_EXEMPT = [re.compile(p) for p in EXEMPT_PATTERNS]


def is_code_file(file_path: str) -> bool:
    """判断是否是代码文件"""
    normalized = file_path.replace('\\', '/')
    return any(p.search(normalized) for p in COMPILED_CODE)


def is_exempt(file_path: str) -> bool:
    """判断是否豁免检查"""
    normalized = file_path.replace('\\', '/')
    return any(p.search(normalized) for p in COMPILED_EXEMPT)


def has_active_change() -> tuple[bool, list[str]]:
    """
    检查是否有活跃的 OpenSpec change。
    返回: (是否有活跃change, change名称列表)
    """
    try:
        result = subprocess.run(
            ['openspec', 'list', '--json'],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode != 0:
            # openspec 命令失败，默认允许（降级模式）
            return True, ["<openspec-unavailable>"]
        
        data = json.loads(result.stdout)
        changes = data if isinstance(data, list) else data.get('changes', [])
        
        # 过滤掉已归档的
        active = [c.get('name', str(c)) for c in changes 
                  if isinstance(c, dict) and c.get('status') != 'archived']
        
        return len(active) > 0, active
        
    except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
        # 命令不可用或超时，降级为允许
        return True, ["<fallback-mode>"]


def main():
    """
    Hook 入口。
    
    输入格式 (Claude Code Hook):
    {
      "tool_name": "Write",
      "tool_input": {
        "file_path": "path/to/file",
        "content": "..."
      }
    }
    """
    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        sys.exit(0)
    
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})
    
    # 只检查写入操作
    if tool_name not in ("Write", "Edit", "MultiEdit"):
        sys.exit(0)
    
    file_path = tool_input.get("file_path", "")
    if not file_path:
        sys.exit(0)
    
    # 只检查代码文件
    if not is_code_file(file_path):
        sys.exit(0)
    
    # 豁免的路径不检查
    if is_exempt(file_path):
        sys.exit(0)
    
    # 检查是否有活跃 change
    has_change, change_names = has_active_change()
    
    if not has_change:
        print(f"🚫 写入被拦截: {file_path}", file=sys.stderr)
        print(f"   原因: 没有活跃的 OpenSpec change 上下文", file=sys.stderr)
        print(f"   代码修改必须在某个 change 上下文中进行。", file=sys.stderr)
        print(f"   请先运行 /opsx:propose 创建一个 change。", file=sys.stderr)
        sys.exit(2)
    
    sys.exit(0)


if __name__ == "__main__":
    main()
