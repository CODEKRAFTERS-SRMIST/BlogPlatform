'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface SlotCounterProps {
  value: number;
}

interface DigitProps {
  digit: number;
  play: boolean;
  delay: number;
}

/*
 * One reel, ten digits, exactly one of them visible.
 *
 * The strip used to be left to size itself: absolutely positioned with no
 * height, holding ten spans each asking for `h-[100%]`. A percentage height
 * against a parent of indefinite height is not 100% of anything, so it
 * collapses to the line box - roughly 1em, inside a 1.2em window. The
 * window was therefore always showing one digit and a slice of the next,
 * which is the sliver under each number. It only caught the eye on hover
 * because that is when the tile repaints its border.
 *
 * Both heights are pinned to the window now: the strip is 1000% of it (ten
 * cells), each cell 10% of the strip (one window). The travel stays the
 * same -10% per digit, and lands on an exact cell boundary every time.
 */
const REEL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Digit({ digit, play, delay }: DigitProps) {
  return (
    <div className="relative h-[1.2em] w-[0.8em] overflow-hidden rounded-md bg-[#1a1a1a] text-white shadow-inner">
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent z-10 pointer-events-none" />
      <motion.div
        initial={{ y: 0 }}
        animate={play ? { y: -digit * 10 + '%' } : { y: 0 }}
        transition={{
          duration: 1.5,
          ease: [0.22, 1, 0.36, 1],
          delay
        }}
        className="absolute top-0 left-0 h-[1000%] w-full flex flex-col items-center"
      >
        {REEL.map((d) => (
          <span key={d} className="h-[10%] w-full flex shrink-0 items-center justify-center font-bold leading-none">
            {d}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export default function SlotCounter({ value }: SlotCounterProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, []);

  const chars = value.toLocaleString().split('');

  return (
    <div ref={elementRef} className="flex items-center gap-[1px] font-mono">
      {chars.map((char, i) => (
        /\d/.test(char) 
          ? <Digit key={i} digit={parseInt(char)} play={isInView} delay={i * 0.1} />
          : <span key={i} className="text-current opacity-60 font-bold mx-1">{char}</span>
      ))}
    </div>
  );
}
