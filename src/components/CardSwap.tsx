import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type RefAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import gsap from "gsap";
import "./CardSwap.css";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  customClass?: string;
};

type CardSwapProps = {
  width?: number | string;
  height?: number | string;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  onCardClick?: (index: number) => void;
  skewAmount?: number;
  easing?: "elastic" | "linear";
  children: ReactNode;
};

type Slot = {
  x: number;
  y: number;
  z: number;
  zIndex: number;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ customClass, className = "", ...rest }, ref) => (
    <div
      ref={ref}
      {...rest}
      className={["card-swap-card", customClass, className].filter(Boolean).join(" ")}
    />
  ),
);
Card.displayName = "Card";

const makeSlot = (index: number, distX: number, distY: number, total: number): Slot => ({
  x: index * distX,
  y: -index * distY,
  z: -index * distX * 1.5,
  zIndex: total - index,
});

const placeNow = (element: HTMLDivElement | null, slot: Slot, skew: number) => {
  if (!element) return;

  gsap.set(element, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: "center center",
    zIndex: slot.zIndex,
    force3D: true,
  });
};

function CardSwap({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  onCardClick,
  skewAmount = 6,
  easing = "elastic",
  children,
}: CardSwapProps) {
  const config = useMemo(
    () => easing === "elastic"
      ? {
        ease: "elastic.out(0.6,0.9)",
        durDrop: 2,
        durMove: 2,
        durReturn: 2,
        promoteOverlap: 0.9,
        returnDelay: 0.05,
      }
      : {
        ease: "power1.inOut",
        durDrop: 0.8,
        durMove: 0.8,
        durReturn: 0.8,
        promoteOverlap: 0.45,
        returnDelay: 0.2,
      },
    [easing],
  );

  const childArr = useMemo(() => Children.toArray(children), [children]);
  const refs = useMemo(
    () => childArr.map(() => ({ current: null as HTMLDivElement | null })),
    [childArr.length],
  );
  const order = useRef(Array.from({ length: childArr.length }, (_, index) => index));
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const total = refs.length;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    refs.forEach((ref, index) => {
      placeNow(ref.current, makeSlot(index, cardDistance, verticalDistance, total), skewAmount);
    });

    if (reduced || total < 2) {
      return undefined;
    }

    const swap = () => {
      const [front, ...rest] = order.current;
      const elFront = refs[front]?.current;

      if (!elFront) return;

      const timeline = gsap.timeline();
      timelineRef.current = timeline;

      timeline.to(elFront, {
        y: "+=500",
        duration: config.durDrop,
        ease: config.ease,
      });

      timeline.addLabel("promote", `-=${config.durDrop * config.promoteOverlap}`);
      rest.forEach((idx, index) => {
        const element = refs[idx]?.current;
        const slot = makeSlot(index, cardDistance, verticalDistance, refs.length);

        if (!element) return;

        timeline.set(element, { zIndex: slot.zIndex }, "promote");
        timeline.to(
          element,
          {
            x: slot.x,
            y: slot.y,
            z: slot.z,
            duration: config.durMove,
            ease: config.ease,
          },
          `promote+=${index * 0.15}`,
        );
      });

      const backSlot = makeSlot(refs.length - 1, cardDistance, verticalDistance, refs.length);
      timeline.addLabel("return", `promote+=${config.durMove * config.returnDelay}`);
      timeline.call(() => {
        gsap.set(elFront, { zIndex: backSlot.zIndex });
      }, undefined, "return");
      timeline.to(
        elFront,
        {
          x: backSlot.x,
          y: backSlot.y,
          z: backSlot.z,
          duration: config.durReturn,
          ease: config.ease,
        },
        "return",
      );

      timeline.call(() => {
        order.current = [...rest, front];
      });
    };

    swap();
    intervalRef.current = window.setInterval(swap, delay);

    const node = containerRef.current;
    const pause = () => {
      timelineRef.current?.pause();
      window.clearInterval(intervalRef.current);
    };
    const resume = () => {
      timelineRef.current?.play();
      window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(swap, delay);
    };

    if (pauseOnHover && node) {
      node.addEventListener("mouseenter", pause);
      node.addEventListener("mouseleave", resume);
    }

    return () => {
      if (pauseOnHover && node) {
        node.removeEventListener("mouseenter", pause);
        node.removeEventListener("mouseleave", resume);
      }

      window.clearInterval(intervalRef.current);
      timelineRef.current?.kill();
    };
  }, [cardDistance, config, delay, pauseOnHover, refs, skewAmount, verticalDistance]);

  const rendered = childArr.map((child, index) => {
    if (!isValidElement(child)) {
      return child;
    }

    const element = child as ReactElement<CardProps & RefAttributes<HTMLDivElement>>;

    return cloneElement(element, {
      key: index,
      ref: (node: HTMLDivElement | null) => {
        refs[index].current = node;
      },
      style: {
        width,
        height,
        ...element.props.style,
      } as CSSProperties,
      onClick: (event) => {
        element.props.onClick?.(event);
        onCardClick?.(index);
      },
    });
  });

  return (
    <div ref={containerRef} className="card-swap-container" style={{ width, height }}>
      {rendered}
    </div>
  );
}

export default CardSwap;
