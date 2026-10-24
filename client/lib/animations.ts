export const springTransition = {
  type: "spring" as const,
  stiffness: 250,
  damping: 30,
  mass: 1
};

export const buttonHover = {
  scale: 1.05,
  transition: { type: "spring" as const, stiffness: 400, damping: 10 }
};

export const buttonTap = {
  scale: 0.95
};
