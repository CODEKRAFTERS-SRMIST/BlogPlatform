"use client";

import { Fragment, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useMotionMode } from "@/lib/useMotionMode";

/**
 * A heading that arrives a word at a time as it scrolls into view.
 *
 * The section headings all faded in as one block, which is the same gesture
 * three times down the page. Reading a line word by word gives it a cadence -
 * the eye lands where the text lands - and it costs one transform per word,
 * for three quarters of a second, once.
 *
 * Words, not letters. A letter-by-letter split on a 9xl heading is a hundred
 * elements laying themselves out on the main thread; that is the mistake the
 * hero used to make, and the phone paid for it.
 *
 * `accent` colours one word without nested markup, so the caller passes a
 * plain string and still gets "Blogs" in club yellow.
 */
export function Reveal({
  text,
  accent,
  className = "",
  accentClassName = "text-[#F2B200]",
  delay = 0,
  as: Tag = "h2",
}: {
  text: string;
  accent?: string;
  className?: string;
  accentClassName?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "p" | "span";
}) {
  const lite = useMotionMode() !== "full";
  const host = useRef<HTMLElement>(null);

  /*
   * The trigger watches the heading, not the words.
   *
   * whileInView on each word cannot work here, and the reason is worth
   * writing down. Every word starts translated 110% down, inside a parent
   * that clips it - that is what makes this a rise rather than a fade.
   * IntersectionObserver intersects the target against each clipping
   * ancestor on the way up, so a word parked below its own clip box has an
   * intersection of exactly nothing. It is never "in view", so it never
   * animates, so it never comes into view: the clip defeats its own trigger
   * and the heading sits invisible for ever.
   *
   * The heading itself is not clipped, so it can be observed honestly.
   */
  const inView = useInView(host, { once: true, amount: 0.3 });

  const words = text.split(" ");
  const paint = (word: string) =>
    accent && word.replace(/[.,!?]/g, "") === accent ? accentClassName : "";

  /*
   * Lite devices get the finished line - not a faster animation, none of it.
   * The whole point of the motion mode is that a phone laying out a heading
   * this size has better things to do than move it as well.
   */
  if (lite) {
    return (
      <Tag className={className}>
        {words.map((word, i) => (
          <Fragment key={i}>
            <span className={paint(word)}>{word}</span>
            {i < words.length - 1 ? " " : ""}
          </Fragment>
        ))}
      </Tag>
    );
  }

  return (
    <Tag ref={host as never} className={className}>
      {words.map((word, i) => (
        /*
         * The space between words is a real space and sits out here, as a
         * sibling of the clipping span.
         *
         * Inside the span, overflow-hidden eats it. A non-breaking space
         * survives but forbids the line break, so a text-9xl heading runs
         * out of its column instead of wrapping. A right margin spaces the
         * words and leaves the text as one run-on word -
         * "Thenumbersarereal." - which is what a screen reader announces and
         * what you get when you copy the heading. Out here it is an ordinary
         * breakable space, present in the text, and it still renders between
         * two inline-blocks.
         */
        <Fragment key={i}>
          <span className="inline-block overflow-hidden align-bottom">
            <motion.span
              className={`inline-block ${paint(word)}`}
              initial={{ y: "110%" }}
              animate={inView ? { y: "0%" } : { y: "110%" }}
              transition={{
                duration: 0.75,
                delay: delay + i * 0.07,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </Tag>
  );
}

export default Reveal;
