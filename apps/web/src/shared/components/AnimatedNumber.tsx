"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform } from "motion/react";

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
  style?: React.CSSProperties;
}

const plain = (value: number): string => String(Math.round(value));

/**
 * A reading that springs to its new value when it changes (a task completed, an expense added).
 * The first render is the real value — server and client agree, and nothing counts up from 0.
 */
export function AnimatedNumber({ value, format = plain, className, style }: AnimatedNumberProps) {
  const spring = useSpring(value, { stiffness: 140, damping: 22, mass: 0.8 });
  const text = useTransform(spring, (latest) => format(latest));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return (
    <motion.span className={className} style={style}>
      {text}
    </motion.span>
  );
}
