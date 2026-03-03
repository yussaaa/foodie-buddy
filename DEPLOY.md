# Foodie Buddy — 部署指南（GCP Cloud Run）

## 架构概览

```
Web 浏览器                    iOS App（Expo / React Native）
     │                                   │
     └──────────────┬────────────────────┘
                    ↓  HTTPS + CORS
        GCP Cloud Run（Next.js 容器，3600s 超时）
        ├─ /api/explore     → Google Places + OpenAI
        ├─ /api/restaurants → Supabase CRUD
        └─ /api/dish-photo  → Serper → Wikimedia → Pexels
                    ↓
             Supabase（生产项目）
             ├─ PostgreSQL（Web + iOS 共用）
             └─ Auth（Session + JWT）
```

---

## 第一步：创建生产 Supabase 项目

1. [supabase.com](https://supabase.com) → New Project → 命名为 `foodie-buddy-prod`
2. SQL Editor → 运行完整的 `supabase/schema.sql`（建表 + RLS + 初始化 `ai_prompts`）
3. Settings → API → 记下 **Project URL** 和 **Anon Key**
4. Authentication → URL Configuration（部署完成后回填 Cloud Run URL）

---

## 第二步：部署到 Cloud Run

> **为什么用 `cloudbuild.yaml` 而不是 `gcloud run deploy --source .`**
>
> `NEXT_PUBLIC_*` 变量在构建时被 Next.js 内联到浏览器 JS bundle 中，必须在
> Docker build 阶段传入。`gcloud run deploy --source .` 不支持传递 build args，
> 因此改用 `gcloud builds submit --config cloudbuild.yaml`。

```bash
# 一次性：安装 gcloud CLI 并登录
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID

# 启用必要的 API（首次部署执行一次）
gcloud services enable run.googleapis.com cloudbuild.googleapis.com containerregistry.googleapis.com

# 部署（通过 cloudbuild.yaml，传入 NEXT_PUBLIC_* 构建参数）
gcloud builds submit --config cloudbuild.yaml \
  --substitutions \
    _NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co",\
    _NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJxxx",\
    _NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyxxx",\
    _NEXT_PUBLIC_APP_URL="https://foodie-buddy-xxxxxxxx.run.app"
```

> **提示**：第一次部署时不知道最终 URL，`_NEXT_PUBLIC_APP_URL` 可先填 `""`，
> 部署完成后记下真实 URL，再到 Cloud Run → 编辑修订版本 → 环境变量中补充
> `NEXT_PUBLIC_APP_URL`，并用完整命令重新部署一次。

> Region 参考：`asia-northeast1`（东京）适合亚洲用户；`us-central1` 适合美国用户。
> 修改 `cloudbuild.yaml` 中的 `--region` 参数即可切换。

部署完成后在终端输出服务 URL，例如：
```
https://foodie-buddy-xxxxxxxx.run.app
```

---

## 第三步：配置环境变量

GCP Console → Cloud Run → foodie-buddy → **编辑并部署新修订版本** → 变量和 Secret：

| 变量名 | 说明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 生产 Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 生产 Supabase anon key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `OPENAI_API_KEY` | OpenAI 密钥 |
| `SERPER_API_KEY` | Serper.dev 密钥（菜式图片主源） |
| `PEXELS_API_KEY` | Pexels 密钥（备用图片源） |
| `GOOGLE_CSE_API_KEY` | Google CSE key（可选备用） |
| `GOOGLE_CSE_ID` | Google CSE ID（可选备用） |
| `NEXT_PUBLIC_APP_URL` | `https://foodie-buddy-xxxxxxxx.run.app` |

配置完毕后点击 **部署**，等待新版本上线。

---

## 第四步：完成 Auth 配置

### Supabase
Authentication → URL Configuration：
- **Site URL**: `https://foodie-buddy-xxxxxxxx.run.app`
- **Redirect URLs**: `https://foodie-buddy-xxxxxxxx.run.app/auth/callback`

### Google Maps API Key 限制
[GCP Console → APIs & Services → 凭据](https://console.cloud.google.com/apis/credentials)：
- 打开 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- 应用限制 → HTTP 引用来源
- 添加：`https://foodie-buddy-xxxxxxxx.run.app/*`

---

## 后续更新（重新部署）

每次代码更新后，重新执行同一条 build 命令（带上完整的 substitutions）：

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions \
    _NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co",\
    _NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJxxx",\
    _NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="AIzaSyxxx",\
    _NEXT_PUBLIC_APP_URL="https://foodie-buddy-xxxxxxxx.run.app"
```

**推荐**：在 GCP Console → Cloud Build → 触发器中创建 GitHub 触发器，配置好 substitution variables，之后每次 push 到 `main` 分支自动部署，无需手动运行命令。

---

## iOS App 接入（将来）

在 Expo 项目的 `.env` 中配置后端地址：

```env
EXPO_PUBLIC_API_URL=https://foodie-buddy-xxxxxxxx.run.app
```

API 路由已配置 CORS，iOS 直接调用 `/api/*` 无需额外配置。

---

## 预估费用

| 服务 | 免费额度 | 预计用量费用 |
|---|---|---|
| GCP Cloud Run | 每月 200 万次请求 + 36 万 vCPU-s | $0–3/月 |
| Supabase | 500MB 数据库，5 万 MAU | 免费 |
| OpenAI gpt-4o-mini | — | ~$0.001 / 次探索 |
| Google Maps/Places | 每月 $200 免费额度 | 免费 |
| Serper | 每月 2,500 次免费 | 免费 |

**个人使用预计：$0/月**

---

## 部署后验证清单

- [ ] 首页正常加载
- [ ] 注册邮件 → 确认 → 跳转到 Dashboard
- [ ] Explore 搜索新餐厅 → AI 内容正常加载（无超时）
- [ ] 保存餐厅 → Dashboard 数量更新
- [ ] 地图页 → Google Maps 正常显示
- [ ] 菜式照片正常加载
- [ ] 退出登录 → 跳回登录页
- [ ] GCP Console → Cloud Run → Logs 无 5xx 错误
