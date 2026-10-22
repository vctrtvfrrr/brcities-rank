import { useId, useRef, useState, type FocusEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

const WIDTH = 320;
const MARGIN = 8;
const MIN_ROOM_BELOW = 320;
const CLOSE_DELAY_MS = 150;

type Placement = { left: number; maxHeight: number } & ({ top: number } | { bottom: number });

export function Tooltip({ label, children }: { label: ReactNode; children: ReactNode }) {
  const id = useId();
  const [placement, setPlacement] = useState<Placement | null>(null);
  const tip = useRef<HTMLSpanElement>(null);
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
    const next = event.relatedTarget as Node | null;
    if (!event.currentTarget.contains(next) && !tip.current?.contains(next)) close();
  };

  return (
    <span
      className="has-tip"
      onMouseEnter={(event) => open(event.currentTarget)}
      onMouseLeave={closeSoon}
      onFocus={(event) => open(event.currentTarget)}
      onBlur={closeUnlessFocusStays}
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
        if (event.key === "Tab" && !event.shiftKey && event.target !== tip.current && tip.current) {
          event.preventDefault();
          tip.current.focus();
        }
      }}
    >
      <span tabIndex={0} aria-describedby={placement ? id : undefined}>
        {label}
      </span>
      {placement &&
        createPortal(
          <span
            ref={tip}
            role="tooltip"
            id={id}
            tabIndex={0}
            className="tip"
            style={{ ...placement, width: WIDTH }}
            onMouseEnter={() => clearTimeout(closing.current)}
          >
            {children}
          </span>,
          document.body,
        )}
    </span>
  );
}
