#!/usr/bin/env python3
"""认知类长文自检：只报可量化的文风信号，不判断观点好坏。

用法:
  python3 lint.py <草稿.md> [--motif 主线类比词] [--strict] [--json]

无外部依赖。WARN 是提示不是硬指标，别为了过检查把句子写坏。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ABSTRACT = [
    "流程", "机制", "价值", "通道", "形态", "维度", "体系", "路径", "赋能",
    "闭环", "底层逻辑", "方法论", "范式", "生态", "抓手", "格局", "势能",
    "框架", "模型", "层面", "系统性", "结构性",
]
GUIDES = [
    "你想想", "说到底", "反过来讲", "你发现没有", "其实", "本质上",
    "值得注意的是", "不难发现", "众所周知", "换句话说", "由此可见",
]
SUMMARY = [
    "总之", "综上", "总的来说", "归根结底", "由此可见", "因此", "所以",
    "可见", "综上所述", "总结一下", "说到底",
]
JUDGE = ["不该", "才是", "就是", "不在于", "而是", "不等于", "只需要", "得", "并不是"]


def strip_markup(text: str) -> str:
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end > 0:
            text = text[end + 4:]
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    text = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"^\s{0,3}#{1,6}\s+", "", text, flags=re.M)
    text = re.sub(r"^\s*\|.*\|\s*$", "", text, flags=re.M)
    # 保留 #，供后面统计 hex 色值；行首标题已在上面单独清掉
    text = re.sub(r"[*_`>]", "", text)
    return text.strip()


def count_hits(text: str, words: list[str]) -> Counter:
    return Counter({w: text.count(w) for w in words if text.count(w)})


def concrete_density(text: str) -> float:
    hits = 0
    hits += len(re.findall(r"\d+(?:\.\d+)?\s*(?:px|KB|MB|GB|rem|em|vw|vh|%|秒|分钟|年|月|日|个|次|条|篇|章|节|倍|字|文件|页|帧|点|枚|道)?", text))
    hits += len(re.findall(r"「[^」]{1,30}」|《[^》]{1,30}》|『[^』]{1,30}』", text))
    hits += len(re.findall(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b", text))
    hits += len(re.findall(r"\b[A-Za-z_][\w.-]{2,}\b", text))
    han = len(re.findall(r"[\u4e00-\u9fff]", text)) or 1
    return round(hits / han * 1000, 1)


def main() -> int:
    ap = argparse.ArgumentParser(description="认知类长文文风自检")
    ap.add_argument("path", help="草稿 Markdown 路径")
    ap.add_argument("--motif", default="", help="主线类比词，统计出现次数")
    ap.add_argument("--strict", action="store_true", help="有 WARN 时返回非零退出码")
    ap.add_argument("--json", action="store_true", help="输出 JSON")
    args = ap.parse_args()

    p = Path(args.path)
    if not p.exists():
        print(f"文件不存在: {p}", file=sys.stderr)
        return 2

    raw = p.read_text(encoding="utf-8")
    body = strip_markup(raw)
    paras = [x.strip() for x in re.split(r"\n\s*\n", body) if x.strip()]
    opening = body[:200]
    tail = body[-100:]
    han = len(re.findall(r"[\u4e00-\u9fff]", body))

    abstract_all = count_hits(body, ABSTRACT)
    abstract_open = count_hits(opening, ABSTRACT)
    guides = count_hits(body, GUIDES)
    summary_tail = count_hits(tail, SUMMARY)
    motif_n = body.count(args.motif) if args.motif else 0

    last_sentences = []
    for para in paras:
        sent = [s for s in re.split(r"[。！？\n]", para) if s.strip()]
        if sent:
            last_sentences.append(sent[-1])
    judged = sum(1 for s in last_sentences if any(w in s for w in JUDGE))

    checks: list[tuple[str, str, str]] = []

    def add(level: str, label: str, detail: str) -> None:
        checks.append((level, label, detail))

    n_open = sum(abstract_open.values())
    add("PASS" if n_open == 0 else "WARN", "开篇 200 字抽象名词",
        f"{n_open} 处" + (f"（{abstract_open.most_common(3)}）" if n_open else ""))

    guide_n = sum(guides.values())
    add("PASS" if guide_n <= 2 else "WARN", "引导词合计",
        f"{guide_n} 处" + (f"（{guides.most_common(4)}）" if guide_n else ""))

    n_find = guides.get("你发现没有", 0)
    add("PASS" if n_find <= 1 else "WARN", "「你发现没有」", f"{n_find} 次（上限 1）")

    n_sum = sum(summary_tail.values())
    add("PASS" if n_sum == 0 else "WARN", "结尾 100 字总结词",
        f"{n_sum} 处" + (f"（{summary_tail.most_common(3)}）" if n_sum else ""))

    if args.motif:
        add("PASS" if motif_n >= 3 else "WARN", f"主线类比「{args.motif}」",
            f"出现 {motif_n} 次（要求 ≥3）")

    add("INFO", "具体名词密度", f"{concrete_density(body)} / 千字")
    add("INFO", "抽象名词全篇",
        f"{sum(abstract_all.values())} 处" + (f"（{abstract_all.most_common(5)}）" if abstract_all else ""))
    add("INFO", "段尾判断句", f"{judged} / {len(last_sentences)} 段")
    add("INFO", "篇幅", f"{han} 汉字 | {len(paras)} 段 | h2 {len(re.findall(r'^## ', raw, re.M))} | 图 {len(re.findall(r'!\[', raw))}")

    warns = [c for c in checks if c[0] == "WARN"]

    if args.json:
        print(json.dumps({"file": str(p), "checks": checks, "warn_count": len(warns)}, ensure_ascii=False, indent=2))
    else:
        print(f"文件: {p.name}")
        for level, label, detail in checks:
            print(f"[{level:4}] {label}: {detail}")
        print(f"\n{len(warns)} 项 WARN。脚本只报数量，观点是否真新要人工判断。")

    return 1 if (warns and args.strict) else 0


if __name__ == "__main__":
    raise SystemExit(main())
