# TrialStats Notes — 公开知识库

此目录**只含可公开的网站源码与问答**，供部署到 GitHub Pages。包含33条根据既往讨论重述的专业问答，**不是逐字聊天内容，也不能在发布前跳过人工审核**。

## 使用

- 本地 HTML 演示：双击 `preview/index.html`。
- 生成内容：`python scripts/build_questions.py`
- 检查发布边界：`python scripts/check_publication.py`
- Quarto 本地预览：`quarto preview`
- 首次 GitHub Pages 发布：`quarto publish gh-pages`，然后提交 `_publish.yml` 并授权 GitHub Actions。

**注意：GitHub Pages 发布的网站是公开的。** 不要把个人问答、私人笔记、浏览器导出的备份、未公开的临床研究数据、患者资料、企业保密资料上传到本仓库。即使网站页面不引用这些文件，只要它们进入公开仓库，仍可能泄露。自动检查只是辅助，不替代人工审核。

私人加密知识库单独提供在另一份 ZIP 文件，永远不要合并进此公开项目。

官方指南：https://quarto.org/docs/publishing/github-pages.html
