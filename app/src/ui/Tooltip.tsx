import { useId, useState, type ReactNode } from "react";

const WIDTH = 320;
const MARGIN = 8;

const MIN_ROOM_BELOW = 320;

type Placement = { left: number; maxHeight: number } & ({ top: number } | { bottom: number });

export function Tooltip({ label, children }: { label: ReactNode; children: ReactNode }) {
  const id = useId();
  const [placement, setPlacement] = useState<Placement | null>(null);

  const show = (target: HTMLElement) => {
    const box = target.getBoundingClientRect();
    const left = Math.min(Math.max(box.left, MARGIN), window.innerWidth - WIDTH - MARGIN);
    const below = window.innerHeight - box.bottom - MARGIN;
    if (below >= MIN_ROOM_BELOW || below >= box.top) {
      setPlacement({ left, top: box.bottom + 6, maxHeight: below - 6 });
    } else {
      setPlacement({ left, bottom: window.innerHeight - box.top + 6, maxHeight: box.top - MARGIN - 6 });
    }
  };

  return (
    <span
      className="has-tip"
      tabIndex={0}
      aria-describedby={placement ? id : undefined}
      onMouseEnter={(event) => show(event.currentTarget)}
      onMouseLeave={() => setPlacement(null)}
      onFocus={(event) => show(event.currentTarget)}
      onBlur={() => setPlacement(null)}
      onKeyDown={(event) => event.key === "Escape" && setPlacement(null)}
    >
      {label}
      {placement && (
        <span role="tooltip" id={id} className="tip" style={{ ...placement, width: WIDTH }}>
          {children}
        </span>
      )}
    </span>
  );
}
