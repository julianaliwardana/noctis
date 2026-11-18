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

/** Springs to new values; the first render is the real value, no count-up from 0. */
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
