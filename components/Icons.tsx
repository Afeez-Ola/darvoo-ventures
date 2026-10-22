type P = { size?: number };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const Truck = ({ size = 20 }: P) => (
  <svg {...base(size)}><path d="M3 6h11v10H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>
);
export const Back = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M15 5l-7 7 7 7" /></svg>
);
export const Plus = ({ size = 20 }: P) => (
  <svg {...base(size)} strokeWidth={2.5}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
);
export const Minus = ({ size = 16 }: P) => (
  <svg {...base(size)} strokeWidth={2.5}><path d="M5 12h14" /></svg>
);
export const Clock = ({ size = 14 }: P) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const Check = ({ size = 14 }: P) => (
  <svg {...base(size)} stroke="#fff" strokeWidth={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const Pin = ({ size = 22 }: P) => (
  <svg {...base(size)}><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
export const Phone = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>
);
export const Chat = ({ size = 18 }: P) => (
  <svg {...base(size)}><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" /></svg>
);
export const Lock = ({ size = 14 }: P) => (
  <svg {...base(size)}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);
