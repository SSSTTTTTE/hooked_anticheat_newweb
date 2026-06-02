import { useEffect, useRef, type RefObject } from "react";
import { gsap } from "gsap";

const lerp = (a: number, b: number, n: number) => (1 - n) * a + n * b;

const getMousePos = (e: MouseEvent, container: HTMLElement | null) => {
  if (container) {
    const bounds = container.getBoundingClientRect();
    return {
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    };
  }
  return { x: e.clientX, y: e.clientY };
};

type CrosshairProps = {
  color?: string;
  containerRef?: RefObject<HTMLElement | null> | null;
  targetSelector?: string;
};

const Crosshair = ({ color = "white", containerRef = null, targetSelector = "a" }: CrosshairProps) => {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const lineHorizontalRef = useRef<HTMLDivElement | null>(null);
  const lineVerticalRef = useRef<HTMLDivElement | null>(null);
  const filterXRef = useRef<SVGFETurbulenceElement | null>(null);
  const filterYRef = useRef<SVGFETurbulenceElement | null>(null);

  useEffect(() => {
    let mouse = { x: 0, y: 0 };
    let frame = 0;

    const target = containerRef?.current || window;
    const getLinks = () => (containerRef?.current ? containerRef.current.querySelectorAll("a") : document.querySelectorAll("a"));
    const hideLines = () => {
      gsap.to([lineHorizontalRef.current, lineVerticalRef.current], { duration: 0.2, opacity: 0 });
    };

    const handleMouseMove = (ev: MouseEvent) => {
      const container = containerRef?.current ?? null;
      const lockedTarget = targetSelector ? (ev.target as Element | null)?.closest(targetSelector) : null;

      if (container) {
        const bounds = container.getBoundingClientRect();
        if (
          ev.clientX < bounds.left ||
          ev.clientX > bounds.right ||
          ev.clientY < bounds.top ||
          ev.clientY > bounds.bottom
        ) {
          hideLines();
          return;
        }
      }

      if (lockedTarget instanceof HTMLElement) {
        const bounds = lockedTarget.getBoundingClientRect();
        const containerBounds = container?.getBoundingClientRect();
        mouse = {
          x: bounds.left + bounds.width / 2 - (containerBounds?.left ?? 0),
          y: bounds.top + bounds.height / 2 - (containerBounds?.top ?? 0),
        };
      } else {
        mouse = getMousePos(ev, container);
      }

      gsap.to([lineHorizontalRef.current, lineVerticalRef.current], { duration: 0.18, opacity: 1 });
    };

    const renderedStyles = {
      tx: { previous: 0, current: 0, amt: 0.15 },
      ty: { previous: 0, current: 0, amt: 0.15 },
    };

    gsap.set([lineHorizontalRef.current, lineVerticalRef.current], { opacity: 0 });

    const render = () => {
      renderedStyles.tx.current = mouse.x;
      renderedStyles.ty.current = mouse.y;

      for (const key in renderedStyles) {
        const styleKey = key as keyof typeof renderedStyles;
        renderedStyles[styleKey].previous = lerp(
          renderedStyles[styleKey].previous,
          renderedStyles[styleKey].current,
          renderedStyles[styleKey].amt,
        );
      }

      if (lineHorizontalRef.current && lineVerticalRef.current) {
        gsap.set(lineVerticalRef.current, { x: renderedStyles.tx.previous });
        gsap.set(lineHorizontalRef.current, { y: renderedStyles.ty.previous });
      }

      frame = requestAnimationFrame(render);
    };

    const onMouseMove = () => {
      renderedStyles.tx.previous = renderedStyles.tx.current = mouse.x;
      renderedStyles.ty.previous = renderedStyles.ty.current = mouse.y;

      gsap.to([lineHorizontalRef.current, lineVerticalRef.current], {
        duration: 0.9,
        ease: "Power3.easeOut",
        opacity: 1,
      });

      frame = requestAnimationFrame(render);
      target.removeEventListener("mousemove", onMouseMove);
    };

    const primitiveValues = { turbulence: 0 };

    const tl = gsap
      .timeline({
        paused: true,
        onStart: () => {
          if (lineHorizontalRef.current && lineVerticalRef.current) {
            lineHorizontalRef.current.style.filter = "url(#filter-noise-x)";
            lineVerticalRef.current.style.filter = "url(#filter-noise-y)";
          }
        },
        onUpdate: () => {
          if (filterXRef.current && filterYRef.current) {
            filterXRef.current.setAttribute("baseFrequency", String(primitiveValues.turbulence));
            filterYRef.current.setAttribute("baseFrequency", String(primitiveValues.turbulence));
          }
        },
        onComplete: () => {
          if (lineHorizontalRef.current && lineVerticalRef.current) {
            lineHorizontalRef.current.style.filter = lineVerticalRef.current.style.filter = "none";
          }
        },
      })
      .to(primitiveValues, {
        duration: 0.5,
        ease: "power1",
        startAt: { turbulence: 1 },
        turbulence: 0,
      });

    const enter = () => tl.restart();
    const leave = () => tl.progress(1).kill();
    const links = getLinks();

    const handleMouseMoveListener = handleMouseMove as EventListener;
    target.addEventListener("mousemove", handleMouseMoveListener);
    target.addEventListener("mouseleave", hideLines);
    target.addEventListener("mousemove", onMouseMove);
    links.forEach((link) => {
      link.addEventListener("mouseenter", enter);
      link.addEventListener("mouseleave", leave);
    });

    return () => {
      target.removeEventListener("mousemove", handleMouseMoveListener);
      target.removeEventListener("mouseleave", hideLines);
      target.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(frame);
      links.forEach((link) => {
        link.removeEventListener("mouseenter", enter);
        link.removeEventListener("mouseleave", leave);
      });
    };
  }, [containerRef]);

  return (
    <div
      ref={cursorRef}
      className="cursor"
      style={{
        position: containerRef ? "absolute" : "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 10000,
      }}
    >
      <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}>
        <defs>
          <filter id="filter-noise-x">
            <feTurbulence type="fractalNoise" baseFrequency="0.000001" numOctaves="1" ref={filterXRef} />
            <feDisplacementMap in="SourceGraphic" scale="40" />
          </filter>
          <filter id="filter-noise-y">
            <feTurbulence type="fractalNoise" baseFrequency="0.000001" numOctaves="1" ref={filterYRef} />
            <feDisplacementMap in="SourceGraphic" scale="40" />
          </filter>
        </defs>
      </svg>
      <div
        ref={lineHorizontalRef}
        style={{
          position: "absolute",
          width: "100%",
          height: "1px",
          background: color,
          pointerEvents: "none",
          transform: "translateY(50%)",
          opacity: 0,
        }}
      />
      <div
        ref={lineVerticalRef}
        style={{
          position: "absolute",
          height: "100%",
          width: "1px",
          background: color,
          pointerEvents: "none",
          transform: "translateX(50%)",
          opacity: 0,
        }}
      />
    </div>
  );
};

export default Crosshair;
