# 低碳价值筛选器 · 课程总结

面向最后一节课的全栈知识点整理。仓库：[后端](https://github.com/zhaoz-glitch/low-carbon-backend) · [前端](https://github.com/zhaoz-glitch/web)

产品把 **美股行情（日频 / 近实时）** 和 **碳排放（年报）** 放在同一张筛选表里：先过估值与质量，再过碳强度与同比变化。

---

## 0. 当前行情接口与实时性（结论）

筛选结果来自 SQLite/Postgres 的 `financial_metrics`，**不是**浏览器直连交易所。正确股价必须先写入库，或在返回前用 TradingView 覆盖。

| 接口 | 作用 | 数据时效 |
|------|------|----------|
| `POST /api/screener/run` | 核心筛选；会尝试 `maybe_refresh_live_quotes()`，再对当页结果 `overlay_quotes` | 行情：TradingView scanner（TTL=`CACHE_TTL`，默认 300s）；碳：库内最新 `report_year` |
| `GET /api/stock/<symbol>` | 个股抽屉：公司 + 最新财务 + 碳趋势；财务字段同样用 TV 覆盖 | 同上 |
| `GET /api/jobs/status` | 最近一次 market / carbon 同步日志 | 运维可见 |
| `POST /api/jobs/sync-market` | 手动拉取 TV 并 upsert 当天快照 | 写入 `financial_metrics.date = today` |
| `POST /api/jobs/sync-carbon` | Clarity AI SFDR（需 Key/Secret） | 年报，无密钥则保留 mock |
| `POST /api/admin/run-etl` | 管理端跑 `scripts/daily_etl.py` | 需 `X-Admin-Token` |
| 定时任务 | 美东工作日 `16:45` 收盘快照；每月 1 日碳数据 | `SCHEDULER_ENABLED` |

**曾出现的实时性 bug：** TradingView 能返回 `close`，但 `_normalize` 没带 `date`，`upsert_financial_rows` 会跳过无日期的行，库里一直是 seed 的 mock 价。Jobs 蓝图也曾未注册，前端 `syncMarket()` 会 404。现已补 `date`、注册 `/api/jobs/*`、筛选/详情 overlay，以及顶栏 **Refresh quotes**。

碳数据本来就不是实时：SFDR / 年报，和股价更新频率刻意分开（产品设计，不是 bug）。

---

## 一、后端（Flask）

### 1. 应用工厂与配置

- `create_app()`：加载 Config、挂扩展、注册蓝图、`create_all` + `schema_sync`、seed、启动 scheduler。
- 配置分层：`Development` / `Production` / `Testing`；`DATABASE_URL` / `MYSQL_URL` 决定 SQLite 还是云库。
- 环境变量驱动外部能力：`TRADINGVIEW_ENABLED`、`LIVE_QUOTES`、`CLARITY_AI_*`、邮件、`ADMIN_TOKEN`。

知识点：工厂模式、扩展延迟初始化、dev/prod 差异、不要把密钥写进代码。

### 2. 数据模型（SQLAlchemy ORM）

| 表 | 含义 |
|----|------|
| `companies` | 标的主数据（ticker、行业、ISIN） |
| `financial_metrics` | 按 **symbol + date** 的行情/估值快照 |
| `carbon_emissions` | 按 **symbol + report_year** 的碳排 |
| `preset_templates` | 预设筛选 JSON |
| `users` / `password_reset_codes` | 账号与重置 |
| `data_sync_logs` | ETL 运行记录 |

知识点：外键与级联、复合唯一约束、用「业务日期」区分实时快照和年报、`to_dict()` 给 JSON API。

### 3. 认证与安全

- Token：`itsdangerous` 签名，放在 `Authorization`（可带 Bearer）。
- `@login_required`：缺 token / 过期 / 用户不存在 → 401。
- 注册校验邮箱格式、密码长度、邮箱唯一；登录错误信息不区分「用户不存在 / 密码错」。
- 重置密码：验证码 + 限时；Resend / SMTP，未配置时 `dev_code` 便于课堂演示。
- 管理接口另用 `X-Admin-Token`，与用户 JWT 分离。

知识点：无状态认证、不要泄露账号是否存在、敏感操作二次凭证。

### 4. 筛选引擎

`POST /api/screener/run`：

1. `validate_filters`：拒绝非数字，统一 `10%` / `0.1`。
2. 财务条件、碳条件拆开。
3. 每个 symbol 只取 **最新** `financial_metrics.date` 和 **最新** `carbon_emissions.report_year`（相关子查询）。
4. `has_carbon_data`：`true` 用 INNER JOIN，`false` 只要无碳数据，`all` 用 LEFT JOIN。
5. min/max 区间过滤、排序、分页。

知识点：筛选是「查询拼装」不是前端假过滤；JOIN 类型改变结果集语义；分页要稳定排序。

### 5. 外部数据源

**行情（TradingView）**

- 包：`tradingview-screener`，无 API Key，走公开 scanner。
- 字段曾改名：`price_book_value` → `price_book_fq`，`dividend_yield_recent` → `dividends_yield`（旧列会变 null）。
- 内存缓存 TTL；失败则回落数据库 mock。
- `overlay_quotes`：当页结果用 TV 现价覆盖，避免只信过期 seed。

**碳（Clarity AI / Climatiq / Bavest）**

- 年报、ISIN 映射、无密钥则 mock。
- 与股价更新节奏分离，避免把年报当实时。

知识点：外部 API 要有 fallback；字段契约会变；缓存和限流。

### 6. ETL 与任务

- `sync_market` / `sync_carbon`：写库 + `data_sync_logs`。
- `maybe_refresh_live_quotes`：筛选热路径，TTL 内不重复打 TV。
- APScheduler：收盘快照 + 月初碳更新。
- `scripts/daily_etl.py`：更大宇宙的日批。

知识点：同步 vs 异步任务、幂等 upsert、日志可观测。

### 7. 导出与其它 API

- `POST /api/screener/export`：CSV，可选碳趋势图 ZIP。
- `GET /api/screener/fields`：动态筛选项（前后端字段契约）。
- `GET /api/screener/templates`：预设。
- `GET /api/db/tables`：课堂看库。
- `/health`：探活 + 最近同步。

知识点：导出是独立用例；元数据接口让表单可配置。

---

## 二、前端（React Router + TypeScript）

### 1. 路由与框架模式

- React Router **Framework Mode** + Vite；`app/routes.ts` 声明路由。
- SPA：`ssr: false`，GitHub Pages 用 `basename`。
- 登录后：`Header` + `TabsBar` 包 Screener `/` 与 News `/news`；`/login` 等公开页独立。
- `AuthGuard`：token 恢复前转圈，未登录跳登录，已登录不进登录页。

知识点：布局路由共享 chrome；守卫要避免闪屏；静态托管与 API 域名分离（`VITE_API_BASE` + CORS）。

### 2. 认证前端

- `localStorage` 存 token；`/api/auth/me` 校验。
- 登录/注册同页 Tab（Pivot 分栏 + BrandPanel）。
- 忘记密码：邮箱 → 6 位码 → 新密码。
- `api.ts` 统一带 `Authorization`。

知识点：客户端存 token 的风险与简化；错误信息展示；代理 `/api` → Flask `:5000`。

### 3. 选股工作台

- 左侧：策略 chips（多选交集）+ 紧凑筛选（勾选后出 min/max 或运算符）。
- 右侧：结果表（勾选、排序、分页、导出对话框）。
- 抽屉：个股财务 + 碳趋势 SVG。
- 顶栏：Refresh quotes → `POST /api/jobs/sync-market`。

知识点：表格是主视野、筛选是侧栏（类 Finviz）；条件 chips 表达当前查询；不要用「大卡片墙」挡结果。

### 4. 状态与筛选交互

- `FilterState`：range / threshold + `enabled`。
- UI 运算符 `>` / `<` 映射为后端 `min` / `max` 闭区间。
- 预设 toggle 合并区间（取更严的 min/max）。
- 数字解析：`10%` vs `0.1`。
- `AbortController` 取消过期筛选请求。

知识点：受控表单、派生 `apiFilters`、请求竞态。

### 5. UI 工程

- Tailwind v4 + 设计 token（`accent` / `ink-*` / `surface`）。
- 登录玻璃拟态；选股页 emerald 顶栏 + Tab。
- 暗色：`prefers-color-scheme`。

知识点：token 比散落颜色好维护；英文文案要防撑破布局（truncate / wrap）。

### 6. 新闻页

- 演示 feed + `localStorage` 偏好；未接真实 RSS。
- 说明「配置类页面」和「交易数据页」可以分开。

---

## 三、全栈协作

1. **契约**：`fields` 的 `key` 必须和筛选 JSON、ORM 列、TV 列对齐（含别名）。
2. **代理**：本地 Vite proxy；线上 `VITE_API_BASE`。
3. **部署**：后端 Railway / gunicorn；前端 Pages。MySQL 插件要 `pymysql` URI。
4. **失败模式**：TV 失败 → 旧快照；碳无密钥 → mock；要在 UI 写清 as-of，不要写「live」却展示 seed 价。

---

## 四、课堂演示建议

1. 同时开前端 `5173` 与后端 `5000`。
2. 登录后点 **Refresh quotes**，看 AAPL/MSFT 是否离开 mock（例如不再是固定 319.70）。
3. 对比 **Tables** 里 `financial_metrics.date` 是否为今天。
4. 说明碳指标仍可能是 mock/年报，与股价不是同一刷新带。

---

## 五、还可以继续做的方向

- Redis 真正按 PRD 做 5 分钟报价缓存（现在主要是进程内 dict）。
- 新闻接 RSS / 新闻 API。
- 筛选条件可点 chips 删除。
- 生产环境监控 TV 失败率与同步日志告警。
