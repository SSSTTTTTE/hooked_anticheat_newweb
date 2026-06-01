import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type AnimatedContentProps = {
  children: ReactNode;
  className?: string;
  distance?: number;
  duration?: number;
  delay?: number;
  scale?: number;
  threshold?: number;
};

// Adapted from the React Bits Animated Content pattern for quiet product storytelling.
// Source reference: https://reactbits.dev/animations/animated-content
export function AnimatedContent({
  children,
  className = "",
  distance = 34,
  duration = 0.9,
  delay = 0,
  scale = 0.985,
  threshold = 0.18,
}: AnimatedContentProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!element || reduced) {
      return;
    }

    const tween = gsap.fromTo(
      element,
      { autoAlpha: 0, y: distance, scale },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        delay,
        duration,
        ease: "power3.out",
        immediateRender: false,
        scrollTrigger: {
          trigger: element,
          start: `top ${(1 - threshold) * 100}%`,
          once: true,
        },
      },
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [delay, distance, duration, scale, threshold]);

  return (
    <div className={`animated-content ${className}`} ref={ref}>
      {children}
    </div>
  );
}
