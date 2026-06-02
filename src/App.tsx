import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { AnimatedContent } from "./components/AnimatedContent";
import BorderGlow from "./components/BorderGlow";
import BlurText from "./components/BlurText";
import GooeyNav from "./components/GooeyNav";
import Shuffle from "./components/Shuffle";

gsap.registerPlugin(ScrollTrigger);

const entryFeatures = [
  {
    title: "智能行为分析",
    body: "基于历史对局、接单节奏与平台行为，识别异常成长曲线与非自然表现。",
  },
  {
    title: "鼠标轨迹异常检测",
    body: "采样轨迹速度、转向与微抖模式，定位脚本化瞄准与辅助行为。",
  },
  {
    title: "键盘输入模式识别",
    body: "分析按键间隔、组合节奏与宏行为，区分熟练操作和自动化输入。",
  },
  {
    title: "游戏内数据交叉验证",
    body: "将战绩、设备环境与检测记录互相校验，降低误判与漏判。",
  },
];

const hardwareLayers = [
  ["PCIe", "设备枚举", "识别异常采集卡、桥接器与伪装设备"],
  ["Memory", "内存完整性", "校验敏感区域与驱动访问路径"],
  ["USB", "外设行为", "监控输入代理、宏控制器与异常轮询"],
  ["Firmware", "固件签名", "验证驱动、固件与低层模块签名"],
];

const trustSteps = [
  ["检测", "入驻前完成环境、行为与硬件检测，形成初始可信基线。"],
  ["记录", "每一次检测结果保留时间、设备与报告编号，可被追溯。"],
  ["申诉", "异常结果进入公正复核流程，平台与玩家都有依据。"],
  ["信誉", "持续评估账号风险变化，让长期可信玩家获得更高信用。"],
];

const decryptCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";

type AnimatedTextProps = {
  as?: "p" | "h1" | "h2" | "h3" | "strong";
  text: string;
  className?: string;
  delay?: number;
};

function AnimatedText({
  as = "p",
  text,
  className = "",
  delay = 150,
}: AnimatedTextProps) {
  return (
    <BlurText
      as={as}
      text={text}
      delay={delay}
      animateBy="lines"
      direction="top"
      threshold={0.16}
      className={["blur-text", className].filter(Boolean).join(" ")}
    />
  );
}

function App() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      document.documentElement.classList.add("reduced-motion");
      return;
    }

    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      wheelMultiplier: 0.9,
    });

    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    let isSnapping = false;
    let touchStartY = 0;
    let touchStartTime = 0;

    const getSnapTargets = () => Array.from(
      document.querySelectorAll<HTMLElement>("main > .section, main > footer.contact"),
    );

    const getCurrentIndex = (targets: HTMLElement[]) => {
      const y = window.scrollY;
      const viewport = window.innerHeight;
      const maxScroll = document.documentElement.scrollHeight - viewport;
      let closest = 0;
      let minDist = Infinity;
      targets.forEach((target, index) => {
        const top = Math.max(0, Math.min(maxScroll, target.offsetTop));
        const dist = Math.abs(top - y);
        if (dist < minDist) {
          minDist = dist;
          closest = index;
        }
      });
      return closest;
    };

    const snapToIndex = (index: number, targets: HTMLElement[]) => {
      if (isSnapping) return;
      const viewport = window.innerHeight;
      const maxScroll = document.documentElement.scrollHeight - viewport;
      const clamped = Math.max(0, Math.min(targets.length - 1, index));
      const targetY = Math.max(0, Math.min(maxScroll, targets[clamped].offsetTop));
      const y = window.scrollY;
      if (Math.abs(y - targetY) < 4) return;

      const distance = Math.abs(targetY - y);
      const duration = Math.max(0.68, Math.min(1.0, distance / viewport * 0.72));

      isSnapping = true;
      lenis.scrollTo(targetY, {
        duration,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        onComplete: () => {
          isSnapping = false;
          ScrollTrigger.update();
        },
      });
    };

    const handleWheel = (event: WheelEvent) => {
      if (isSnapping) {
        event.preventDefault();
        return;
      }
      const targets = getSnapTargets();
      if (targets.length < 2) return;

      const current = getCurrentIndex(targets);
      const dir = event.deltaY > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(targets.length - 1, current + dir));
      if (next === current) return;

      event.preventDefault();
      snapToIndex(next, targets);
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (isSnapping) return;
      const endY = event.changedTouches[0]?.clientY ?? touchStartY;
      const deltaY = touchStartY - endY;
      const elapsed = Date.now() - touchStartTime;
      const velocity = Math.abs(deltaY) / elapsed;

      // require meaningful swipe: 50px or 0.3px/ms velocity
      if (Math.abs(deltaY) < 50 && velocity < 0.3) {
        // small movement — snap to nearest without advancing
        const targets = getSnapTargets();
        if (targets.length < 2) return;
        const current = getCurrentIndex(targets);
        snapToIndex(current, targets);
        return;
      }

      const targets = getSnapTargets();
      if (targets.length < 2) return;
      const current = getCurrentIndex(targets);
      const dir = deltaY > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(targets.length - 1, current + dir));
      snapToIndex(next, targets);
    };

    const handleLenisScroll = () => {
      ScrollTrigger.update();
    };

    lenis.on("scroll", handleLenisScroll);

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    const scrollToHash = (hash: string, immediate = false) => {
      if (!hash) {
        return;
      }

      const target = document.querySelector(hash);
      if (target) {
        lenis.scrollTo(target as HTMLElement, {
          immediate,
          offset: 0,
          duration: immediate ? 0 : 0.72,
        });
      }
    };
    const handleHashChange = () => scrollToHash(window.location.hash);

    window.addEventListener("hashchange", handleHashChange);
    window.setTimeout(() => scrollToHash(window.location.hash, true), 60);

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".badge-visual",
        { autoAlpha: 0, y: 36, scale: 0.96, rotateX: 7 },
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotateX: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".product-hero",
            start: "top 72%",
            toggleActions: "play none none reverse",
          },
        },
      );

      gsap.to(".code-hero-fade", {
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: ".code-hero-section",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(".code-hero-canvas", {
        opacity: 0.16,
        ease: "none",
        scrollTrigger: {
          trigger: ".code-hero-section",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.timeline({
        scrollTrigger: {
          trigger: ".hardware",
          start: "top 50%",
          toggleActions: "play none none reverse",
        },
      })
        .to(".hardware-device", { rotateX: 0, y: -10, duration: 0.35, ease: "power2.out" }, 0)
        .to(".scan-step-0, .device-layer-0", { opacity: 1, color: "#2997ff", duration: 0.18 }, 0.08)
        .to(".scan-step-1, .device-layer-1", { opacity: 1, color: "#2997ff", duration: 0.18 }, 0.18)
        .to(".scan-step-2, .device-layer-2", { opacity: 1, color: "#2997ff", duration: 0.18 }, 0.28)
        .to(".scan-step-3, .device-layer-3", { opacity: 1, color: "#2997ff", duration: 0.18 }, 0.38)
        .to(".report-state", { opacity: 1, y: 0, duration: 0.28 }, 0.44)
        .to(".report-folder-front", { y: () => (window.innerWidth < 720 ? 54 : 72), rotationX: 23, ease: "power2.out", duration: 0.7 }, 0)
        .to(".report-sheet-main", { y: () => (window.innerWidth < 720 ? -24 : -30), scale: () => (window.innerWidth < 720 ? 0.98 : 1.08), rotationX: 4, rotationY: -7, rotationZ: 0.4, opacity: 1, ease: "power3.out", duration: 1 }, 0.08)
        .to(".report-sheet-fail", { x: () => (window.innerWidth < 720 ? -86 : -164), y: () => (window.innerWidth < 720 ? 0 : -8), rotation: -10, opacity: 0.8, ease: "power2.out", duration: 0.9 }, 0.16)
        .to(".report-sheet-review", { x: () => (window.innerWidth < 720 ? 82 : 154), y: () => (window.innerWidth < 720 ? 8 : 4), rotation: 9, opacity: 0.74, ease: "power2.out", duration: 0.9 }, 0.2);

      gsap.to(".timeline-fill", {
        width: "100%",
        ease: "none",
        scrollTrigger: {
          trigger: ".trust",
          start: "top 62%",
          end: "bottom 52%",
          scrub: true,
        },
      });

      gsap.fromTo(
        ".trust-step",
        { autoAlpha: 0.35, y: 18 },
        {
          autoAlpha: 1,
          y: 0,
          stagger: 0.16,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".trust-track",
            start: "top 72%",
            end: "bottom 54%",
            scrub: true,
          },
        },
      );
    });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("hashchange", handleHashChange);
      lenis.off("scroll", handleLenisScroll);
      ctx.revert();
      lenis.destroy();
    };
  }, []);

  return (
    <main>
      <Nav />
      <section className="section hero code-hero-section" id="top">
        <CodeHero />
      </section>

      <section className="section hero product-hero" id="overview">
        <div className="section-inner hero-grid">
          <AnimatedContent className="hero-copy" distance={20}>
            <AnimatedText className="eyebrow" text="Hooked Anti-Cheat" />
            <AnimatedText as="h1" delay={170} text="让每一次上场，都经得起验证。" />
            <AnimatedText
              className="hero-subtitle"
              text="Hooked 厚壳反作弊，为陪玩与代练平台建立可信的玩家准入标准。"
            />
            <div className="hero-actions">
              <a className="button button-primary" href="#contact">预约服务</a>
              <a className="button button-secondary" href="#query">查看检测结果</a>
            </div>
          </AnimatedContent>
          <div className="hero-product" aria-label="玩家身份验证卡产品视觉">
            <IdentityCard />
          </div>
        </div>
      </section>

      <section className="section entry" id="entry">
        <div className="section-inner">
          <AnimatedContent className="section-heading">
            <AnimatedText className="eyebrow" text="Entry Screening" />
            <AnimatedText as="h2" delay={160} text="先筛选，再入驻。" />
            <AnimatedText text="从玩家身份、设备环境到游戏行为，Hooked 将准入检测前置，帮助平台在服务开始前识别风险。" />
          </AnimatedContent>
          <div className="feature-row">
            {entryFeatures.map((feature, index) => (
              <AnimatedContent
                className="feature-block"
                delay={index * 0.05}
                key={feature.title}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <AnimatedText as="h3" delay={130} text={feature.title} />
                <AnimatedText text={feature.body} />
              </AnimatedContent>
            ))}
          </div>
        </div>
      </section>

      <section className="section hardware" id="hardware">
        <div className="section-inner hardware-grid">
          <AnimatedContent className="dark-copy">
            <AnimatedText className="eyebrow" text="Hardware Scan" />
            <AnimatedText as="h2" delay={160} text="让硬件外挂无处伪装。" />
            <AnimatedText text="针对 DMA 硬件外挂与底层设备伪装，建立从总线枚举到固件签名的多层扫描链路。" />
            <div className="scan-list" aria-label="硬件扫描层级">
              {hardwareLayers.map(([label, title, body], index) => (
                <div className={`scan-step scan-step-${index}`} key={label}>
                  <span>{label}</span>
                  <AnimatedText as="strong" delay={100} text={title} />
                  <AnimatedText delay={120} text={body} />
                </div>
              ))}
            </div>
          </AnimatedContent>
          <HardwareDevice />
        </div>
      </section>

      <section className="section trust" id="trust">
        <div className="section-inner">
          <AnimatedContent className="section-heading centered">
            <AnimatedText className="eyebrow" text="Trust Layer" />
            <AnimatedText as="h2" delay={160} text="真实力，无需伪装。" />
            <AnimatedText text="检测不是一次性拦截，而是一套让平台、玩家与申诉流程都能被看见的信任机制。" />
          </AnimatedContent>
          <div className="trust-track">
            <div className="timeline-base">
              <div className="timeline-fill" />
            </div>
            <div className="trust-steps">
              {trustSteps.map(([title, body], index) => (
                <div className="trust-step" key={title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <AnimatedText as="h3" delay={130} text={title} />
                  <AnimatedText text={body} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section query" id="query">
        <div className="section-inner query-grid">
          <AnimatedContent className="section-heading">
            <AnimatedText className="eyebrow" text="Verification Query" />
            <AnimatedText as="h2" delay={160} text="每一次检测，都可以被追溯。" />
            <AnimatedText text="检测报告实时更新，支持历史追溯、详细报告查看与异常状态复核，让结果清晰可查。" />
          </AnimatedContent>
          <AnimatedContent className="query-card-shell" scale={0.97}>
            <BorderGlow
              className="query-card"
              edgeSensitivity={46}
              glowColor="202 100 70"
              backgroundColor="transparent"
              borderRadius={32}
              glowRadius={16}
              glowIntensity={1.55}
              coneSpread={30}
              animated={false}
              colors={["#38bdf8", "#f8fafc", "#c084fc"]}
              fillOpacity={0.34}
            >
              <div className="query-card-top">
                <div className="query-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 3.1 5.1 5.7v5.5c0 4.4 2.9 8.4 6.9 9.7 4-1.3 6.9-5.3 6.9-9.7V5.7L12 3.1Z" />
                    <path d="m9.3 12.1 1.8 1.8 3.9-4" />
                  </svg>
                </div>
                <div>
                  <AnimatedText className="query-label" text="检测结果查询" />
                  <AnimatedText as="h3" delay={150} text="输入报告编号，查看完整验证状态。" />
                </div>
              </div>
              <form onSubmit={(event) => event.preventDefault()}>
                <label className="query-input-wrap">
                  <input aria-label="报告编号" placeholder="例如：HKD-2026-0826-001" />
                </label>
                <button className="button button-primary" type="submit">立即查询</button>
              </form>
            </BorderGlow>
          </AnimatedContent>
        </div>
      </section>

      <footer className="contact" id="contact">
        <div className="section-inner contact-grid">
          <AnimatedContent className="contact-copy">
            <AnimatedText className="eyebrow" text="Contact" />
            <AnimatedText as="h2" delay={160} text="为你的平台建立反作弊准入标准。" />
            <AnimatedText text="留下平台规模与检测需求，我们会协助配置入驻检测、结果查询与申诉流程。" />
            <a className="button button-primary" href="#contact">预约服务</a>
          </AnimatedContent>
          <AnimatedContent className="contact-info">
            <div>
              <span>企业微信</span>
              <strong>扫码预约对接</strong>
            </div>
            <div className="qr-box" aria-label="企业微信二维码占位">
              <span />
              <span />
              <span />
              <span />
            </div>
          </AnimatedContent>
        </div>
        <div className="footer-line">
          <span>© 2026 Hooked 厚壳反作弊</span>
          <span>服务条款 · 隐私政策</span>
        </div>
      </footer>
    </main>
  );
}

function CodeHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let digitPoints: Array<{
      x: number;
      y: number;
      value: string;
      alpha: number;
      phase: number;
      speed: number;
      drift: number;
    }> = [];

    const buildScene = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const columns = Math.max(18, Math.floor(width / 58));
      const rows = Math.max(26, Math.floor(height / 25));
      digitPoints = [];

      for (let cluster = 0; cluster < 34; cluster += 1) {
        const centerX = Math.random() * width;
        const centerY = Math.random() * height * 0.88;
        const radiusX = 42 + Math.random() * 110;
        const radiusY = 70 + Math.random() * 170;

        for (let i = 0; i < 34; i += 1) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.sqrt(Math.random());
          const x = centerX + Math.cos(angle) * radiusX * distance;
          const y = centerY + Math.sin(angle) * radiusY * distance;

          if (x < -20 || x > width + 20 || y < -20 || y > height + 20) {
            continue;
          }

          digitPoints.push({
            x: Math.round(x / 12) * 12,
            y: Math.round(y / 18) * 18,
            value: Math.random() > 0.22 ? "9" : String(1 + Math.floor(Math.random() * 8)),
            alpha: 0.38 + Math.random() * 0.42,
            phase: Math.random() * Math.PI * 2,
            speed: 14 + Math.random() * 46,
            drift: -4 + Math.random() * 8,
          });
        }
      }

      for (let column = 0; column < columns; column += 1) {
        if (Math.random() < 0.34) {
          continue;
        }

        const x = column * (width / columns) + Math.random() * 20;
        const runStart = Math.random() * height * 0.25;
        const runLength = 8 + Math.floor(Math.random() * rows * 0.5);

        for (let row = 0; row < runLength; row += 1) {
          if (Math.random() < 0.28) {
            continue;
          }

          digitPoints.push({
            x,
            y: runStart + row * 18,
            value: Math.random() > 0.18 ? "9" : String(1 + Math.floor(Math.random() * 8)),
            alpha: 0.34 + Math.random() * 0.38,
            phase: Math.random() * Math.PI * 2,
            speed: 24 + Math.random() * 58,
            drift: -2 + Math.random() * 4,
          });
        }
      }
    };

    const draw = (time: number) => {
      context.fillStyle = "#070707";
      context.fillRect(0, 0, width, height);

      const gradient = context.createRadialGradient(width * 0.5, height * 0.42, 80, width * 0.5, height * 0.42, width * 0.78);
      gradient.addColorStop(0, "rgba(47, 52, 46, 0.28)");
      gradient.addColorStop(0.5, "rgba(12, 13, 12, 0.78)");
      gradient.addColorStop(1, "rgba(3, 3, 3, 1)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.save();
      context.font = "500 16px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.shadowBlur = 8;
      context.shadowColor = "rgba(226, 231, 205, 0.42)";

      for (const point of digitPoints) {
        const flicker = 0.72 + Math.sin(time * 0.0012 + point.phase) * 0.2;
        const fall = (point.y + time * 0.001 * point.speed) % (height + 90);
        const y = fall - 45;
        const x = point.x + Math.sin(time * 0.00045 + point.phase) * point.drift;
        context.fillStyle = `rgba(218, 222, 200, ${point.alpha * flicker})`;
        context.fillText(point.value, x, y);
      }
      context.restore();

      animationFrame = window.requestAnimationFrame(draw);
    };

    buildScene();
    animationFrame = window.requestAnimationFrame(draw);
    window.addEventListener("resize", buildScene);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", buildScene);
    };
  }, []);

  return (
    <div className="code-hero-shell" aria-label="Hooked 数字验证首屏视觉">
      <canvas ref={canvasRef} className="code-hero-canvas" />
      <Shuffle
        className="code-hero-title"
        tag="div"
        text="Hooked"
        shuffleDirection="right"
        duration={0.35}
        animationMode="evenodd"
        shuffleTimes={1}
        ease="power3.out"
        stagger={0.03}
        threshold={0.1}
        triggerOnce
        triggerOnHover
        respectReducedMotion
      />
      <div className="code-hero-fade" aria-hidden="true" />
    </div>
  );
}

function Nav() {
  const navItems = [
    { label: "Entry", href: "#entry" },
    { label: "Scan", href: "#hardware" },
    { label: "Trust", href: "#trust" },
    { label: "Query", href: "#query" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <header className="nav">
      <a className="brand" href="#top" aria-label="Hooked 首页">
        <DecryptedBrandText texts={["HOOKED", "Anti-Cheat"]} />
        <small>厚壳反作弊</small>
      </a>
      <GooeyNav
        items={navItems}
        particleCount={12}
        particleDistances={[38, 8]}
        particleR={70}
        animationTime={420}
        timeVariance={180}
        colors={[1, 2, 3, 1, 2, 3, 4]}
      />
    </header>
  );
}

function DecryptedBrandText({ texts }: { texts: [string, string] }) {
  const [textIndex, setTextIndex] = useState(0);
  const text = texts[textIndex];
  const [displayText, setDisplayText] = useState(text);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(() => new Set(text.split("").map((_, index) => index)));
  const intervalRef = useRef<number | undefined>(undefined);
  const cycleTimeoutRef = useRef<number | undefined>(undefined);

  const chars = useMemo(() => decryptCharacters.split(""), []);

  const shuffle = useCallback((revealed: Set<number>) => {
    return text
      .split("")
      .map((char, index) => {
        if (char === " " || revealed.has(index)) {
          return char;
        }

        return chars[Math.floor(Math.random() * chars.length)];
      })
      .join("");
  }, [chars, text]);

  const play = useCallback((nextText = text) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayText(nextText);
      setRevealedIndices(new Set(nextText.split("").map((_, index) => index)));
      return;
    }

    window.clearInterval(intervalRef.current);

    let pointer = 0;
    let iteration = 0;
    const order = nextText.split("").map((_, index) => index);
    const initialSet = new Set<number>();
    setRevealedIndices(initialSet);
    setDisplayText(shuffle(initialSet));

    intervalRef.current = window.setInterval(() => {
      iteration += 1;
      const nextSet = new Set<number>();

      for (let i = 0; i < pointer; i += 1) {
        nextSet.add(order[i]);
      }

      if (iteration % 2 === 0 && pointer < order.length) {
        nextSet.add(order[pointer]);
        pointer += 1;
      }

      setRevealedIndices(nextSet);
      setDisplayText(pointer >= order.length ? nextText : shuffle(nextSet));

      if (pointer >= order.length) {
        window.clearInterval(intervalRef.current);
      }
    }, 48);
  }, [shuffle, text]);

  useEffect(() => {
    play(text);
    cycleTimeoutRef.current = window.setTimeout(() => {
      setTextIndex((current) => (current + 1) % texts.length);
    }, 3000);

    return () => {
      window.clearTimeout(cycleTimeoutRef.current);
      window.clearInterval(intervalRef.current);
    };
  }, [play, text, texts.length]);

  return (
    <span className="brand-decrypt" onMouseEnter={() => play(text)}>
      <span className="sr-only">{texts.join(" / ")}</span>
      <span aria-hidden="true">
        {displayText.split("").map((char, index) => (
          <span
            className={revealedIndices.has(index) ? "brand-decrypt-char" : "brand-decrypt-char encrypted"}
            key={`${char}-${index}`}
          >
            {char}
          </span>
        ))}
      </span>
    </span>
  );
}

function IdentityCard() {
  const [drag, setDrag] = useState({ x: 0, y: 0, isDragging: false });
  const [sway, setSway] = useState(0);
  const [strapSpring, setStrapSpring] = useState({ angle: 0, length: 78 });
  const dragRef = useRef(drag);
  const releaseFrameRef = useRef<number | undefined>(undefined);
  const strapFrameRef = useRef<number | undefined>(undefined);
  const springStateRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const strapSpringRef = useRef({ angle: 0, length: 78, va: 0, vl: 0 });
  const dragStartRef = useRef({
    active: false,
    originX: 0,
    originY: 0,
    pointerId: -1,
    startX: 0,
    startY: 0,
  });
  const swayRef = useRef(0);

  const clampDrag = (value: number, max: number) => Math.max(-max, Math.min(max, value));
  const clampRange = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    window.cancelAnimationFrame(releaseFrameRef.current ?? 0);
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      active: true,
      originX: drag.x,
      originY: drag.y,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    springStateRef.current.x = drag.x;
    springStateRef.current.y = drag.y;
    setDrag((current) => ({ ...current, isDragging: true }));
  };

  const resetDrag = useCallback(() => {
    dragStartRef.current.active = false;
    dragStartRef.current.pointerId = -1;
    window.cancelAnimationFrame(releaseFrameRef.current ?? 0);

    const spring = springStateRef.current;
    spring.x = dragRef.current.x;
    spring.y = dragRef.current.y;

    // X: underdamped (bouncy lateral swing)
    // Y: critically damped (no upward overshoot — strap would break above anchor)
    const k = 300;
    const cx = 14;
    const cy = 2 * Math.sqrt(k);
    const mass = 1;
    let lastTime: number | undefined;

    const animateSpring = (time: number) => {
      if (lastTime === undefined) {
        lastTime = time;
        releaseFrameRef.current = window.requestAnimationFrame(animateSpring);
        return;
      }
      const dt = Math.min((time - lastTime) / 1000, 0.032);
      lastTime = time;

      const ax = (-k * spring.x - cx * spring.vx) / mass;
      const ay = (-k * spring.y - cy * spring.vy) / mass;
      spring.vx += ax * dt;
      spring.vy += ay * dt;
      spring.x += spring.vx * dt;
      spring.y += spring.vy * dt;

      // Y never overshoots above resting point — strap would detach
      if (spring.y < 0) {
        spring.y = 0;
        spring.vy = 0;
      }

      const settled = Math.abs(spring.x) < 0.15 && Math.abs(spring.y) < 0.15
        && Math.abs(spring.vx) < 0.5 && Math.abs(spring.vy) < 0.5;

      const nextDrag = {
        x: settled ? 0 : spring.x,
        y: settled ? 0 : spring.y,
        isDragging: false,
      };
      dragRef.current = nextDrag;
      setDrag(nextDrag);

      if (!settled) {
        releaseFrameRef.current = window.requestAnimationFrame(animateSpring);
      } else {
        spring.vx = 0;
        spring.vy = 0;
      }
    };

    releaseFrameRef.current = window.requestAnimationFrame(animateSpring);
  }, []);

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current.pointerId === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resetDrag();
  };

  useEffect(() => {
    const handleWindowMove = (event: PointerEvent) => {
      const current = dragStartRef.current;

      if (!current.active || current.pointerId !== event.pointerId) {
        return;
      }

      const nextX = current.originX + event.clientX - current.startX;
      const nextY = current.originY + event.clientY - current.startY;
      const nextDrag = {
        x: clampDrag(nextX, 200),
        y: clampRange(nextY, 0, 240),
        isDragging: true,
      };

      dragRef.current = nextDrag;
      springStateRef.current.x = nextDrag.x;
      springStateRef.current.y = nextDrag.y;
      setDrag(nextDrag);
    };

    const handleWindowRelease = (event: PointerEvent) => {
      if (dragStartRef.current.active && dragStartRef.current.pointerId === event.pointerId) {
        resetDrag();
      }
    };

    window.addEventListener("pointermove", handleWindowMove);
    window.addEventListener("pointerup", handleWindowRelease);
    window.addEventListener("pointercancel", handleWindowRelease);
    window.addEventListener("blur", resetDrag);

    return () => {
      window.removeEventListener("pointermove", handleWindowMove);
      window.removeEventListener("pointerup", handleWindowRelease);
      window.removeEventListener("pointercancel", handleWindowRelease);
      window.removeEventListener("blur", resetDrag);
      window.cancelAnimationFrame(releaseFrameRef.current ?? 0);
    };
  }, [resetDrag]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let lastY = window.scrollY;
    let frame = 0;

    const handleScroll = () => {
      const nextY = window.scrollY;
      const delta = nextY - lastY;
      lastY = nextY;
      swayRef.current = clampDrag(swayRef.current + delta * 0.055, 7);
    };

    const tick = () => {
      swayRef.current *= 0.88;
      setSway(Math.abs(swayRef.current) < 0.01 ? 0 : swayRef.current);
      frame = window.requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  // Strap: instant during drag, spring-elastic only after release
  useEffect(() => {
    const ks = 200;
    const cs = 14;
    const mass = 1;
    let lastTime: number | undefined;

    const tick = (time: number) => {
      if (lastTime === undefined) {
        lastTime = time;
        strapFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min((time - lastTime) / 1000, 0.032);
      lastTime = time;

      const d = dragRef.current;
      const targetX = d.x;
      const targetY = Math.max(20, 70 + d.y);
      const targetLength = Math.max(50, Math.hypot(targetX, targetY) + 8);
      const targetAngle = clampRange(
        Math.atan2(-targetX, targetY) * (180 / Math.PI) + (d.isDragging ? 0 : swayRef.current * 0.18),
        -62,
        62,
      );

      const s = strapSpringRef.current;

      if (d.isDragging) {
        // Instant follow during drag — no lag
        s.angle = targetAngle;
        s.length = targetLength;
        s.va = 0;
        s.vl = 0;
      } else {
        // Spring physics only after release
        const aa = (-ks * (s.angle - targetAngle) - cs * s.va) / mass;
        const al = (-ks * (s.length - targetLength) - cs * s.vl) / mass;
        s.va += aa * dt;
        s.vl += al * dt;
        s.angle += s.va * dt;
        s.length = Math.max(50, s.length + s.vl * dt);
      }

      setStrapSpring({ angle: s.angle, length: s.length });
      strapFrameRef.current = window.requestAnimationFrame(tick);
    };

    strapFrameRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(strapFrameRef.current ?? 0);
  }, []);

  const lanyardStyle = {
    "--strap-angle": `${strapSpring.angle}deg`,
    "--strap-length": `${strapSpring.length}px`,
  } as CSSProperties;

  const cardStyle = {
    "--card-x": `${drag.x}px`,
    "--card-y": `${drag.y}px`,
    "--card-rx": `${-drag.y * 0.045}deg`,
    "--card-ry": `${drag.x * 0.055}deg`,
    "--card-rz": `${drag.x * 0.018 + sway}deg`,
  } as CSSProperties;

  return (
    <div className="identity-stage badge-stage">
      <div className={`badge-visual${drag.isDragging ? " is-dragging" : ""}`} style={lanyardStyle}>
        <div className="badge-wall-anchor" aria-hidden="true">
          <span>HOOKED</span>
        </div>
        <div className="badge-lanyard" aria-hidden="true">
          <span className="lanyard-band lanyard-band-left" />
          <span className="lanyard-band lanyard-band-right" />
        </div>
        <div
          className="badge-drag-plane"
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          role="button"
          data-testid="identity-badge"
          style={cardStyle}
          tabIndex={0}
          aria-label="可拖拽玩家身份名片"
        >
          <div className="badge-card">
            <div className="badge-hole" aria-hidden="true" />
            <div className="badge-clip" aria-hidden="true" />
            <div className="card-top">
              <small>Hooked Anti-Cheat</small>
              <span>PLAYER<br />IDENTITY</span>
              <strong>VERIFIED BY HOOKED</strong>
            </div>
            <div className="badge-status">VERIFIED</div>
            <div className="identity-data">
              <div>
                <span>USER ID</span>
                <strong>HKD-2026-0826</strong>
              </div>
              <div>
                <span>ENTRY</span>
                <strong>TRUSTED</strong>
              </div>
            </div>
            <div className="badge-footer">
              <span>TRUST SCORE</span>
              <strong>98</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HardwareDevice() {
  return (
    <div className="hardware-device report-folder-stage" aria-label="硬件检测报告视觉">
      <ReportSheet
        className="report-sheet report-sheet-secondary report-sheet-fail"
        status="检测到风险"
        subtitle="DMA 设备异常"
        mark="!"
        risk="高风险"
        resultClass="risk"
      />
      <ReportSheet
        className="report-sheet report-sheet-secondary report-sheet-review"
        status="等待复核"
        subtitle="申诉材料已提交"
        mark="?"
        risk="复核中"
        resultClass="review"
      />
      <ReportSheet
        className="report-sheet report-sheet-main"
        status="未检测到风险"
        subtitle="设备环境安全"
        mark="✓"
        risk="低风险"
        resultClass="safe"
      />
      <div className="report-folder-front" aria-hidden="true">
        <span>HARDWARE REPORT FILE</span>
      </div>
    </div>
  );
}

function ReportSheet({
  className,
  status,
  subtitle,
  mark,
  risk,
  resultClass,
}: {
  className: string;
  status: string;
  subtitle: string;
  mark: string;
  risk: string;
  resultClass: "safe" | "risk" | "review";
}) {
  return (
    <div className={className}>
      <div className="report-kicker">HOOKED DETECTION REPORT</div>
      <div className={`report-state ${resultClass}`}>
        <span>{mark}</span>
        <div>
          <strong>{status}</strong>
          <small>{subtitle}</small>
        </div>
      </div>
      <dl>
        <div>
          <dt>报告编号</dt>
          <dd>HKD-2026-0826-001</dd>
        </div>
        <div>
          <dt>检测时间</dt>
          <dd>2026-06-01 14:30</dd>
        </div>
        <div>
          <dt>设备类型</dt>
          <dd>Desktop</dd>
        </div>
        <div>
          <dt>风险等级</dt>
          <dd>{risk}</dd>
        </div>
      </dl>
      <div className="device-layers">
        {["PCIe", "Memory", "USB", "Firmware"].map((label, index) => (
          <span className={`device-layer device-layer-${index}`} key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export default App;
