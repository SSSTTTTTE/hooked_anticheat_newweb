# Hooked Anti-Cheat Site

Hooked 厚壳反作弊官网项目，用于展示陪玩与代练平台的反作弊准入、硬件扫描、可信记录和检测结果查询能力。

## 技术栈

- React 19
- TypeScript
- Vite
- GSAP / ScrollTrigger
- Lenis smooth scroll

## 功能概览

- 数字矩阵首屏视觉动画
- 固定导航与 Gooey 动效导航交互
- 准入检测能力展示
- DMA / 硬件外挂扫描流程展示
- 检测、记录、申诉、信誉的可信流程
- 检测报告编号查询入口
- 企业服务预约联系区

## 本地开发

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

生产构建：

```bash
npm run build
```

本地预览构建结果：

```bash
npm run preview
```

## 项目结构

```text
.
├── index.html
├── package.json
├── src
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css
│   └── components
│       ├── AnimatedContent.tsx
│       ├── GooeyNav.css
│       └── GooeyNav.tsx
├── tsconfig.json
└── vite.config.ts
```

## 部署

项目使用 Vite 构建，执行 `npm run build` 后会生成 `dist/` 目录。生产环境由 `server.mjs` 同时提供静态页面和后端 API，前端只调用同源 `/api/reservations`、`/api/captcha/challenge`，飞书 App Secret、Bitable Token、验证码密钥均只放在后端环境变量中。

Docker 部署：

```bash
docker compose up -d --build
```

宝塔面板服务器可使用 `scripts/deploy-bt-hooked.sh` 覆盖部署到 `/www/wwwroot/hooked.cn`，默认将容器绑定到 `127.0.0.1:3021` 并重写 Nginx 反向代理；如果宝塔已有 `/www/server/panel/vhost/cert/hooked.cn/` 证书，会同时恢复 HTTPS。执行前需先在服务器站点目录准备生产 `.env`。

健康检查：

```bash
curl http://localhost:5173/api/health
```

预约表单需要后端环境变量：

- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`
- `FEISHU_BITABLE_APP_TOKEN`
- `FEISHU_RESERVATIONS_TABLE_ID`
- `ALTCHA_HMAC_SECRET`
- `GATECHA_BASE_URL`（可选，配置后使用 GateCHA）
- `GATECHA_API_KEY`（可选，配置后使用 GateCHA）
- `TRUST_PROXY_HEADERS`（默认 `false`；只有在可信反向代理会覆盖客户端 IP 头时才设为 `true`）

验证码优先由服务端代理 GateCHA challenge/verify；未配置 GateCHA 时，服务端使用 `ALTCHA_HMAC_SECRET` 生成并校验本地 ALTCHA challenge。前端不会暴露 GateCHA API Key 或 HMAC secret。预约提交接口按客户端 IP 做滚动限流：同一 IP 每分钟最多 1 次，24 小时最多 3 次。

飞书写入测试：

```bash
npm run test:feishu-write
```

该脚本会先从后端获取验证码 challenge，求解 ALTCHA 后提交测试预约记录。
