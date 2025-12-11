import { useScroll, useTransform, MotionValue } from 'framer-motion';
import { useRef, RefObject } from 'react';

interface ParallaxOptions {
  speed?: number;
  direction?: 'up' | 'down';
  offset?: [string, string];
}

interface ParallaxResult {
  ref: RefObject<HTMLDivElement>;
  y: MotionValue<number>;
  opacity?: MotionValue<number>;
  scale?: MotionValue<number>;
}

export const useParallax = (options: ParallaxOptions = {}): ParallaxResult => {
  const { speed = 0.5, direction = 'up', offset = ['start end', 'end start'] } = options;
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: offset as any
  });

  const multiplier = direction === 'up' ? -1 : 1;
  const y = useTransform(scrollYProgress, [0, 1], [0, 100 * speed * multiplier]);

  return { ref, y };
};

export const useParallaxWithOpacity = (options: ParallaxOptions = {}) => {
  const { speed = 0.5, direction = 'up', offset = ['start end', 'end start'] } = options;
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: offset as any
  });

  const multiplier = direction === 'up' ? -1 : 1;
  const y = useTransform(scrollYProgress, [0, 1], [0, 100 * speed * multiplier]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);

  return { ref, y, opacity };
};

export const useParallaxBackground = () => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0.5]);
  
  return { y, opacity };
};

export const useSmoothScroll = () => {
  const { scrollYProgress } = useScroll();
  const scale = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);
  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0.8]);
  
  return { scale, opacity, scrollYProgress };
};

export default useParallax;
