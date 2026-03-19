# LinguaCards

<p align="left">
  <a href="https://github.com/iamliyangjing/english-translate/stargazers">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/iamliyangjing/english-translate?style=for-the-badge" />
  </a>
  <a href="https://github.com/iamliyangjing/english-translate/blob/main/LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/iamliyangjing/english-translate?style=for-the-badge" />
  </a>
  <a href="https://vercel.com/new">
    <img alt="Deploy" src="https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel" />
  </a>
</p>

[English Version](README.md)

> Translate, review, and remember.  
> 一个把翻译变成可复习卡片的英语学习工具。

![LinguaCards Preview](public/landing-shot.svg)

## 为什么是 LinguaCards
- 一次翻译，自动沉淀为卡片
- 内置轻量复习流程（正面/翻面/评分）
- 一键导出 CSV，直接导入 Anki
- 支持自定义模型配置与 API Endpoint

## 功能一览
- 中英互译 + 浏览器 TTS 朗读
- 卡片库：检索、编辑、删除、批量导出
- 站内复习：最小流程 + 简单间隔
- 个人页：学习统计 + 模型配置管理
- OAuth 登录：GitHub / Google
- 存储支持：Supabase（推荐）或本地 SQLite

## 技术栈
- Next.js (App Router)
- NextAuth
- Supabase / SQLite
- Tailwind CSS

## 快速开始
1) 安装依赖
```bash
npm install
```

2) 配置环境变量（本地开发）
```env
# Translation
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret
GITHUB_ID=your_github_id
GITHUB_SECRET=your_github_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Optional: Supabase (recommended)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

3) 启动开发服务器
```bash
npm run dev
```
打开 [http://localhost:3000](http://localhost:3000)

## Supabase 配置（推荐）
1) 在 Supabase SQL Editor 运行 `supabase/schema.sql`
2) 配置 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`
3) 服务端将优先使用 Supabase；未配置时自动使用本地 SQLite

## 模型配置
在个人页可新增并切换模型配置：
- Model
- API Endpoint（可选）
- API Key

未配置时将回退到 `OPENAI_API_KEY` / `OPENAI_MODEL`。

## Anki 导出
卡片库支持导出 CSV，字段顺序：
```
sourceText, targetText, pronunciation
```

## License
MIT
