"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useMotionMode } from "@/lib/useMotionMode";

/**
 * Wraps a button so it leans towards the cursor as it gets close.
 *
 * The call to action is the one thing on the page we actually want pressed,
 * and it behaved like everything else: a hover scale, and nothing until the
 * pointer was already on it. Leaning out to meet the cursor makes it feel
 * like it wants to be clicked, which is the whole job of a call to action.
 *
 * Only transform, only while the pointer is inside, and the listeners live
 * on this element rather than the window - so a page with three of these is
 * still doing nothing at all until somebody comes near one.
 *
 * `strength` is how far it will travel, in pixels, at the edge of its box.
 * Past about 20 it stops reading as a lean and starts reading as a bug.
 */
export function Magnetic({
  children,
  strength = 14,
  className = "",
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const lite = useMotionMode() !== "full";
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Loose enough to feel springy, tight enough not to wobble after it lands.
  const sx = useSpring(x, { damping: 18, stiffness: 220, mass: 0.6 });
  const sy = useSpring(y, { damping: 18, stiffness: 220, mass: 0.6 });

  // No pointer, no lean. Touch devices get the element exactly as it was.
  if (lite) return <div className={className}>{children}</div>;

  const follow = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    // -1..1 from the centre of the element, so the pull is proportional to
    // how far off-centre the cursor is rather than to the screen position.
    const dx = (e.clientX - (box.left + box.width / 2)) / (box.width / 2);
    const dy = (e.clientY - (box.top + box.height / 2)) / (box.height / 2);
    x.set(dx * strength);
    y.set(dy * strength);
  };

  const release = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={follow}
      onMouseLeave={release}
      style={{ x: sx, y: sy }}
      className={`inline-block ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default Magnetic;
