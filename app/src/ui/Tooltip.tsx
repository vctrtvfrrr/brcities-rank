import { useId, useRef, useState, type FocusEvent, type ReactNode } from "react";

const WIDTH = 320;
const MARGIN = 8;
const MIN_ROOM_BELOW = 320;
const CLOSE_DELAY_MS = 150;

type Placement = { left: number; maxHeight: number } & ({ top: number } | { bottom: number });

export function Tooltip({ label, children }: { label: ReactNode; children: ReactNode }) {
  const id = useId();
  const [placement, setPlacement] = useState<Placement | null>(null);
  const closing = useRef<ReturnType<typeof setTimeout>>(undefined);

  const open = (target: HTMLElement) => {
    clearTimeout(closing.current);
    const box = target.getBoundingClientRect();
    const left = Math.min(Math.max(box.left, MARGIN), window.innerWidth - WIDTH - MARGIN);
    const below = window.innerHeight - box.bottom - MARGIN;
    if (below >= MIN_ROOM_BELOW || below >= box.top) {
      setPlacement({ left, top: box.bottom, maxHeight: below });
    } else {
      setPlacement({ left, bottom: window.innerHeight - box.top, maxHeight: box.top - MARGIN });
    }
  };
  const close = () => {
    clearTimeout(closing.current);
    setPlacement(null);
  };
  const closeSoon = () => {
    clearTimeout(closing.current);
    closing.current = setTimeout(close, CLOSE_DELAY_MS);
  };
  const closeUnlessFocusStays = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  };

  return (
    <span
      className="has-tip"
      onMouseEnter={(event) => open(event.currentTarget)}
      onMouseLeave={closeSoon}
      onFocus={(event) => open(event.currentTarget)}
      onBlur={closeUnlessFocusStays}
      onKeyDown={(event) => event.key === "Escape" && close()}
    >
      <span tabIndex={0} aria-describedby={placement ? id : undefined}>
        {label}
      </span>
      {placement && (
        <span
          role="tooltip"
          id={id}
          tabIndex={0}
          className="tip"
          style={{ ...placement, width: WIDTH }}
          onMouseEnter={() => clearTimeout(closing.current)}
        >
          {children}
        </span>
      )}
    </span>
  );
}
