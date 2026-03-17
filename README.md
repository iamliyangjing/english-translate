## LinguaCards

双向翻译 + 卡片库 + 站内复习 + Anki 导出。

## 快速开始

1. 配置环境变量（`.env`）
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`（默认 `gpt-4o-mini`）
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `GITHUB_ID` / `GITHUB_SECRET`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
2. 启动开发服务

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 说明

- 卡片数据保存在 `data/app.db`（SQLite）。
- 导出 CSV 可直接导入 Anki。

## Supabase

如果你想把卡片存到 Supabase：

1. 在 Supabase SQL Editor 运行 `supabase/schema.sql`
2. 设置环境变量：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. 重启开发服务

当上述变量存在时，服务端会自动使用 Supabase 作为数据源。
