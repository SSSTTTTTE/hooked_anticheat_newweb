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

项目使用 Vite 构建，执行 `npm run build` 后会生成 `dist/` 目录，可部署到任意静态网站托管平台。
