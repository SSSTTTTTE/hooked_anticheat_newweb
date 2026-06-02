import { useEffect, useMemo, useRef, useState, type CSSProperties, type ElementType } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText as GSAPSplitText } from "gsap/SplitText";
import "./Shuffle.css";

gsap.registerPlugin(ScrollTrigger, GSAPSplitText);

type ShuffleProps = {
  text: string;
  className?: string;
  style?: CSSProperties;
  shuffleDirection?: "left" | "right" | "up" | "down";
  duration?: number;
  maxDelay?: number;
  ease?: string;
  threshold?: number;
  rootMargin?: string;
  tag?: ElementType;
  textAlign?: CSSProperties["textAlign"];
  onShuffleComplete?: () => void;
  shuffleTimes?: number;
  animationMode?: "evenodd" | "random";
  loop?: boolean;
  loopDelay?: number;
  stagger?: number;
  scrambleCharset?: string;
  colorFrom?: string;
  colorTo?: string;
  triggerOnce?: boolean;
  respectReducedMotion?: boolean;
  triggerOnHover?: boolean;
};

type SplitTextInstance = InstanceType<typeof GSAPSplitText>;

function Shuffle({
  text,
  className = "",
  style = {},
  shuffleDirection = "right",
  duration = 0.35,
  maxDelay = 0,
  ease = "power3.out",
  threshold = 0.1,
  rootMargin = "-100px",
  tag = "p",
  textAlign = "center",
  onShuffleComplete,
  shuffleTimes = 1,
  animationMode = "evenodd",
  loop = false,
  loopDelay = 0,
  stagger = 0.03,
  scrambleCharset = "",
  colorFrom,
  colorTo,
  triggerOnce = true,
  respectReducedMotion = true,
  triggerOnHover = true,
}: ShuffleProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [ready, setReady] = useState(false);

  const splitRef = useRef<SplitTextInstance | null>(null);
  const wrappersRef = useRef<HTMLSpanElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const playingRef = useRef(false);
  const hoverHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if ("fonts" in document) {
      if (document.fonts.status === "loaded") {
        setFontsLoaded(true);
      } else {
        document.fonts.ready.then(() => setFontsLoaded(true));
      }
    } else {
      setFontsLoaded(true);
    }
  }, []);

  const scrollTriggerStart = useMemo(() => {
    const startPct = (1 - threshold) * 100;
    const match = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin || "");
    const value = match ? parseFloat(match[1]) : 0;
    const unit = match ? match[2] || "px" : "px";
    const sign = value === 0 ? "" : value < 0 ? `-=${Math.abs(value)}${unit}` : `+=${value}${unit}`;
    return `top ${startPct}%${sign}`;
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (!ref.current || !text || !fontsLoaded) return undefined;
    if (respectReducedMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReady(true);
      onShuffleComplete?.();
      return undefined;
    }

    const el = ref.current;

    const removeHover = () => {
      if (hoverHandlerRef.current && ref.current) {
        ref.current.removeEventListener("mouseenter", hoverHandlerRef.current);
        hoverHandlerRef.current = null;
      }
    };

    const teardown = () => {
      tlRef.current?.kill();
      tlRef.current = null;

      wrappersRef.current.forEach((wrap) => {
        const inner = wrap.firstElementChild;
        const orig = inner?.querySelector('[data-orig="1"]');
        if (orig && wrap.parentNode) {
          wrap.parentNode.replaceChild(orig, wrap);
        }
      });
      wrappersRef.current = [];

      try {
        splitRef.current?.revert();
      } catch {
        // SplitText may already be reverted by the wrapper replacement path.
      }
      splitRef.current = null;
      playingRef.current = false;
    };

    const build = () => {
      teardown();

      splitRef.current = new GSAPSplitText(el, {
        type: "chars",
        charsClass: "shuffle-char",
        wordsClass: "shuffle-word",
        linesClass: "shuffle-line",
        smartWrap: true,
        reduceWhiteSpace: false,
      });

      const chars = splitRef.current.chars || [];
      const rolls = Math.max(1, Math.floor(shuffleTimes));
      const rand = (set: string) => set.charAt(Math.floor(Math.random() * set.length)) || "";

      chars.forEach((ch) => {
        const char = ch as HTMLElement;
        const parent = char.parentElement;
        if (!parent) return;

        const { width, height } = char.getBoundingClientRect();
        if (!width) return;

        const wrap = document.createElement("span");
        wrap.className = "shuffle-char-wrapper";
        Object.assign(wrap.style, {
          width: `${width}px`,
          height: shuffleDirection === "up" || shuffleDirection === "down" ? `${height}px` : "auto",
        });

        const inner = document.createElement("span");
        Object.assign(inner.style, {
          whiteSpace: shuffleDirection === "up" || shuffleDirection === "down" ? "normal" : "nowrap",
          willChange: "transform",
        });

        parent.insertBefore(wrap, ch);
        wrap.appendChild(inner);

        const firstOrig = char.cloneNode(true) as HTMLElement;
        Object.assign(firstOrig.style, {
          display: shuffleDirection === "up" || shuffleDirection === "down" ? "block" : "inline-block",
          width: `${width}px`,
          textAlign: "center",
        });

        char.setAttribute("data-orig", "1");
        Object.assign(char.style, {
          display: shuffleDirection === "up" || shuffleDirection === "down" ? "block" : "inline-block",
          width: `${width}px`,
          textAlign: "center",
        });

        inner.appendChild(firstOrig);
        for (let k = 0; k < rolls; k += 1) {
          const copy = char.cloneNode(true) as HTMLElement;
          if (scrambleCharset) copy.textContent = rand(scrambleCharset);
          Object.assign(copy.style, {
            display: shuffleDirection === "up" || shuffleDirection === "down" ? "block" : "inline-block",
            width: `${width}px`,
            textAlign: "center",
          });
          inner.appendChild(copy);
        }
        inner.appendChild(char);

        const steps = rolls + 1;
        if (shuffleDirection === "right" || shuffleDirection === "down") {
          const firstCopy = inner.firstElementChild;
          const real = inner.lastElementChild;
          if (real) inner.insertBefore(real, inner.firstChild);
          if (firstCopy) inner.appendChild(firstCopy);
        }

        if (shuffleDirection === "right") {
          gsap.set(inner, { x: -steps * width, y: 0, force3D: true });
          inner.setAttribute("data-final-x", "0");
        } else if (shuffleDirection === "left") {
          gsap.set(inner, { x: 0, y: 0, force3D: true });
          inner.setAttribute("data-final-x", String(-steps * width));
        } else if (shuffleDirection === "down") {
          gsap.set(inner, { x: 0, y: -steps * height, force3D: true });
          inner.setAttribute("data-final-y", "0");
        } else {
          gsap.set(inner, { x: 0, y: 0, force3D: true });
          inner.setAttribute("data-final-y", String(-steps * height));
        }

        if (colorFrom) inner.style.color = colorFrom;
        wrappersRef.current.push(wrap);
      });
    };

    const inners = () => wrappersRef.current.map((wrapper) => wrapper.firstElementChild).filter(Boolean) as HTMLElement[];

    const randomizeScrambles = () => {
      if (!scrambleCharset) return;
      wrappersRef.current.forEach((wrapper) => {
        const strip = wrapper.firstElementChild;
        if (!strip) return;
        Array.from(strip.children).slice(1, -1).forEach((child) => {
          child.textContent = scrambleCharset.charAt(Math.floor(Math.random() * scrambleCharset.length));
        });
      });
    };

    const cleanupToStill = () => {
      wrappersRef.current.forEach((wrapper) => {
        const strip = wrapper.firstElementChild as HTMLElement | null;
        if (!strip) return;
        const real = strip.querySelector('[data-orig="1"]');
        if (!real) return;
        strip.replaceChildren(real);
        strip.style.transform = "none";
        strip.style.willChange = "auto";
      });
    };

    const armHover = () => {
      if (!triggerOnHover || !ref.current) return;
      removeHover();
      const handler = () => {
        if (playingRef.current) return;
        build();
        randomizeScrambles();
        play();
      };
      hoverHandlerRef.current = handler;
      ref.current.addEventListener("mouseenter", handler);
    };

    const play = () => {
      const strips = inners();
      if (!strips.length) return;

      playingRef.current = true;
      const isVertical = shuffleDirection === "up" || shuffleDirection === "down";
      const tl = gsap.timeline({
        smoothChildTiming: true,
        repeat: loop ? -1 : 0,
        repeatDelay: loop ? loopDelay : 0,
        onRepeat: () => {
          randomizeScrambles();
          onShuffleComplete?.();
        },
        onComplete: () => {
          playingRef.current = false;
          if (!loop) {
            cleanupToStill();
            if (colorTo) gsap.set(strips, { color: colorTo });
            onShuffleComplete?.();
            armHover();
          }
        },
      });

      const addTween = (targets: HTMLElement[], at: number) => {
        const vars: gsap.TweenVars = {
          duration,
          ease,
          force3D: true,
          stagger: animationMode === "evenodd" ? stagger : 0,
        };
        if (isVertical) {
          vars.y = (_, target) => parseFloat(target.getAttribute("data-final-y") || "0");
        } else {
          vars.x = (_, target) => parseFloat(target.getAttribute("data-final-x") || "0");
        }
        tl.to(targets, vars, at);
        if (colorFrom && colorTo) {
          tl.to(targets, { color: colorTo, duration, ease }, at);
        }
      };

      if (animationMode === "evenodd") {
        const odd = strips.filter((_, index) => index % 2 === 1);
        const even = strips.filter((_, index) => index % 2 === 0);
        const oddTotal = duration + Math.max(0, odd.length - 1) * stagger;
        if (odd.length) addTween(odd, 0);
        if (even.length) addTween(even, odd.length ? oddTotal * 0.7 : 0);
      } else {
        strips.forEach((strip) => {
          const at = Math.random() * maxDelay;
          addTween([strip], at);
        });
      }

      tlRef.current = tl;
    };

    const create = () => {
      build();
      randomizeScrambles();
      play();
      armHover();
      setReady(true);
    };

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: scrollTriggerStart,
      once: triggerOnce,
      onEnter: create,
    });

    return () => {
      trigger.kill();
      removeHover();
      teardown();
      setReady(false);
    };
  }, [
    text,
    duration,
    maxDelay,
    ease,
    scrollTriggerStart,
    fontsLoaded,
    shuffleDirection,
    shuffleTimes,
    animationMode,
    loop,
    loopDelay,
    stagger,
    scrambleCharset,
    colorFrom,
    colorTo,
    triggerOnce,
    respectReducedMotion,
    triggerOnHover,
    onShuffleComplete,
  ]);

  const commonStyle = useMemo(() => ({ textAlign, ...style }), [textAlign, style]);
  const classes = useMemo(() => `shuffle-parent ${ready ? "is-ready" : ""} ${className}`, [ready, className]);
  const Tag = tag;

  return <Tag ref={ref} className={classes} style={commonStyle}>{text}</Tag>;
}

export default Shuffle;
