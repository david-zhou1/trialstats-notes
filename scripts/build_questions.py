#!/usr/bin/env python3
"""Generate public FAQ index and read-only viewer from public questions only."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
qs=json.loads((ROOT/'questions/questions.json').read_text(encoding='utf-8'))
assert len(set(q['id'] for q in qs))==len(qs)
for q in qs: assert q.get('question') and q.get('short')
lines=['---','title: "问题与标准回答 · 公开索引"','toc: true','---','','仅收录公开专业知识；不包含个人笔记。发布前需重新审核问题及相关来源。', '']
for cat in dict.fromkeys(q['category'] for q in qs):
 lines.extend([f'## {cat}',''])
 for q in qs:
  if q['category']!=cat:continue
  lines.extend([f'### {q["id"]} · {q["question"]}','','**推荐回答：** '+q['short'],'','**进一步解释：** '+q['detail'],'','**常见误区：** '+q['pitfall'],''])
  if q.get('sources'):
   lines.extend(['参考：'+'；'.join(f'[{s["name"]}]({s["url"]})' for s in q['sources']),''])
(ROOT/'questions/catalog.qmd').write_text('\n'.join(lines),encoding='utf-8')
html=(ROOT/'questions/review.template.html').read_text(encoding='utf-8')
seed=json.dumps(qs,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
(ROOT/'questions/review.html').write_text(html.replace('__SEED__',seed),encoding='utf-8')
preview=(ROOT/'questions/review.html').read_text(encoding='utf-8')
preview=preview.replace('<link rel="stylesheet" href="public-qa.css">','<style>'+ (ROOT/'questions/public-qa.css').read_text(encoding='utf-8')+'</style>')
preview=preview.replace('<script src="public-qa.js"></script>','<script>'+(ROOT/'questions/public-qa.js').read_text(encoding='utf-8')+'</script>')
preview=preview.replace('href="../index.html"','href="#"').replace('← 网站首页','公开问答演示')
(ROOT/'preview/index.html').write_text(preview,encoding='utf-8')
print(f'生成 {len(qs)} 条公开问答')
