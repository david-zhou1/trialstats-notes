# TrialStats Notes 正式上线计划（Public + Private）

## 安全架构

- **Public Site**：Quarto 生成的完全公开的网站，GitHub Pages 发布。仅包含获准公开的统计方法内容、源代码、项目作品集和专业问答。
- **Private Vault v1**：另一份独立 ZIP 内的本地应用，只存随机加密后的个人提问、回答、笔记、收藏及复习进度。**不上传 GitHub**。
- **Private Online v2（后续）**：如果需要登录后跨设备访问：在专用私人子域名部署应用，由 Cloudflare Access 等身份认证服务保护，配置仅本人许可的登录身份；数据经独立后端存储，数据库开启用户级访问规则，所有 API/存储也实施服务端鉴权，必要时使用端到端加密。GitHub Pages 不能替代这套控制。

## 一次性上线步骤

1. 审核 `questions/questions.json` 中全部公开问答及参考资料；检查首页、About、Projects 中的姓名、经历、作品和任何可能存在的占位内容。
2. 在公开项目执行 `python scripts/build_questions.py`，确保问答索引与只读复习页面一致。
3. 运行 `python scripts/check_publication.py`，并人工核查全部待提交文件和生成的 `_site/`；此脚本的敏感文件名检测是**启发式检查**，不能识别所有敏感信息。
4. 先本地执行 `quarto preview`，再执行 `quarto render`，核查导航、公式、内部链接与静态工具。
5. 在 GitHub 新建**公开**仓库 `trialstats-notes`；只上传本目录内的公开站点源码，**不要上传包含私人应用的父目录或私人备份**。
6. 在项目内设置 git remote，然后首次执行 `quarto publish gh-pages`。按 Quarto 官方提示完成认证与首次发布，将 `_publish.yml` 提交到 `main`。
7. 在仓库 `Settings → Pages` 确认公开 URL；检查 `Actions` 权限允许 Actions 发布（通常需要 `contents: write`）；模板工作流将先重建问答索引、执行敏感文件检查，再发布。
8. 从无登录状态访问公开 URL，核对搜索、公式、文章、项目、计算器与手机版布局；检查不能访问私人数据或备份。
9. 最后才将 URL 放进简历、LinkedIn、研究者简介或其他公开渠道。

## 私人使用步骤

1. 将**独立**的私人知识库 ZIP 解压到本机。不要复制进入公开 GitHub 仓库。
2. 在私人知识库目录执行 `python -m http.server 8765 --bind 127.0.0.1` 并打开 `http://127.0.0.1:8765/`。
3. 创建强密码并立即导出加密备份。
4. 需要迁移旧版个人笔记时，先从旧版网站导出 JSON，随后在新私人空间使用“导入旧版个人笔记”。迁移完成后安全处理旧版明文 JSON 与旧版浏览器本地缓存。
5. 每次重要更新后导出新的加密备份；可以跨设备导入备份，但这**不是自动同步**。

## 未来多设备在线私人空间（独立项目，不包含在本次源码）

- 自有域名，例如 `notes.example.com`，接入支持 Access 的托管服务，限制应用仅本人身份访问。
- 数据存储到非公开的数据库，实施强制身份鉴权和针对个人记录的行级访问规则；若使用 Supabase，RLS 必须在表级正确开启和测试，不要把 service-role 密钥放到前端。
- 使用 HTTPS，正确配置重定向、会话失效、备份与恢复、日志脱敏及安全响应机制。
- 如需服务器端进行 R 模拟，需额外计算服务并单独限制资源与输入文件。
- 不允许将真实患者数据或公司内部受限材料导入未经正式评估或授权的私人在线系统。

## 官方文档

- Quarto + GitHub Pages: https://quarto.org/docs/publishing/github-pages.html
- GitHub Pages 可见性: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Cloudflare Access web applications: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/
- Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
