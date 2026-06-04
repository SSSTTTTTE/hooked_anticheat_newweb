import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type AnimationSnapshot = {
  filter?: string;
  opacity?: number;
  y?: number;
};

type BlurTextProps = {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters" | "lines";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: AnimationSnapshot;
  animationTo?: AnimationSnapshot[];
  easing?: (t: number) => number;
  onAnimationComplete?: () => void;
  stepDuration?: number;
  as?: "p" | "h1" | "h2" | "h3" | "strong";
};

const buildKeyframes = (from: AnimationSnapshot, steps: AnimationSnapshot[]) => {
  const keys = new Set([...Object.keys(from), ...steps.flatMap((step) => Object.keys(step))]);
  const keyframes: Record<string, Array<string | number>> = {};

  keys.forEach((key) => {
    const typedKey = key as keyof AnimationSnapshot;

    keyframes[key] = [
      from[typedKey],
      ...steps.map((step) => step[typedKey] ?? from[typedKey]),
    ].filter((value): value is string | number => value !== undefined);
  });

  return keyframes;
};

const splitByCommaBreakpoints = (text: string) => {
  const characters = Array.from(text);
  const segments: string[] = [];
  let current = "";

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    current += character;

    if (character === "，" || character === ",") {
      while (characters[index + 1] === " ") {
        index += 1;
        current += characters[index];
      }
      segments.push(current);
      current = "";
    }
  }

  if (current) {
    segments.push(current);
  }

  return segments.length > 1 ? segments : characters;
};

function BlurText({
  text = "",
  delay = 200,
  className = "",
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  animationFrom,
  animationTo,
  easing = (t) => t,
  onAnimationComplete,
  stepDuration = 0.35,
  as,
}: BlurTextProps) {
  const Component = as ?? "p";
  const elements = useMemo(
    () => {
      if (animateBy === "words") {
        return text.split(" ");
      }

      if (animateBy === "lines" && /[，,]/.test(text)) {
        return splitByCommaBreakpoints(text);
      }

      return Array.from(text);
    },
    [animateBy, text],
  );
  const [inView, setInView] = useState(false);
  const [lineIndexes, setLineIndexes] = useState<number[]>([]);
  const ref = useRef<HTMLElement | null>(null);
  const segmentRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    if (animateBy !== "lines" || !ref.current) {
      setLineIndexes([]);
      return;
    }

    let rafId = 0;
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const element = ref.current;

    const measureLines = () => {
      const tops: number[] = [];
      const nextLineIndexes = segmentRefs.current.slice(0, elements.length).map((segment) => {
        if (!segment) {
          return 0;
        }

        const top = Math.round(segment.offsetTop);
        const existingLine = tops.findIndex((lineTop) => Math.abs(lineTop - top) <= 2);

        if (existingLine >= 0) {
          return existingLine;
        }

        tops.push(top);
        return tops.length - 1;
      });

      setLineIndexes((current) => (
        current.length === nextLineIndexes.length
        && current.every((lineIndex, index) => lineIndex === nextLineIndexes[index])
          ? current
          : nextLineIndexes
      ));
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(measureLines);
    };

    // Use ResizeObserver with immediate call for faster initial measurement
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(scheduleMeasure, 16);
    });
    resizeObserver.observe(element);
    // Immediate first measure, no debounce on init
    scheduleMeasure();

    return () => {
      window.cancelAnimationFrame(rafId);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, [animateBy, elements.length, text]);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }

    const element = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = useMemo(
    () => (
      direction === "top"
        ? { filter: "blur(10px)", opacity: 0, y: -50 }
        : { filter: "blur(10px)", opacity: 0, y: 50 }
    ),
    [direction],
  );

  const defaultTo = useMemo(
    () => [
      {
        filter: "blur(5px)",
        opacity: 0.5,
        y: direction === "top" ? 5 : -5,
      },
      { filter: "blur(0px)", opacity: 1, y: 0 },
    ],
    [direction],
  );

  const fromSnapshot = animationFrom ?? defaultFrom;
  const toSnapshots = animationTo ?? defaultTo;
  const animateKeyframes = useMemo(
    () => buildKeyframes(fromSnapshot, toSnapshots),
    [fromSnapshot, toSnapshots],
  );
  const stepCount = toSnapshots.length + 1;
  const totalDuration = stepDuration * (stepCount - 1);
  const times = Array.from(
    { length: stepCount },
    (_, index) => (stepCount === 1 ? 0 : index / (stepCount - 1)),
  );

  return (
    <Component
      ref={(node) => {
        ref.current = node;
      }}
      className={className}
      style={{ display: "flex", flexWrap: "wrap" }}
    >
      {elements.map((segment, index) => {
        const delayIndex = animateBy === "lines" ? lineIndexes[index] ?? 0 : index;
        const spanTransition = {
          duration: totalDuration,
          times,
          delay: (delayIndex * delay) / 1000,
          ease: easing,
        };

        return (
          <motion.span
            className="blur-text-segment"
            key={`${segment}-${index}`}
            ref={(node) => {
              segmentRefs.current[index] = node;
            }}
            initial={fromSnapshot}
            animate={inView ? animateKeyframes : fromSnapshot}
            transition={spanTransition}
            onAnimationComplete={index === elements.length - 1 ? onAnimationComplete : undefined}
          >
            {segment === " " ? "\u00A0" : segment}
            {animateBy === "words" && index < elements.length - 1 && "\u00A0"}
          </motion.span>
        );
      })}
    </Component>
  );
}

export default BlurText;
