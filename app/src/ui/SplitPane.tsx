import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

const MIN_PERCENT = 15;
const MAX_PERCENT = 85;
const KEY_STEP = 5;

const clamp = (value: number) => Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value));

export function SplitPane({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  const [percent, setPercent] = useState(60);
  const [dragging, setDragging] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  const moveTo = (clientY: number) => {
    const box = container.current!.getBoundingClientRect();
    setPercent(clamp(((clientY - box.top) / box.height) * 100));
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => dragging && moveTo(event.clientY);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowUp") setPercent((p) => clamp(p - KEY_STEP));
    else if (event.key === "ArrowDown") setPercent((p) => clamp(p + KEY_STEP));
    else return;
    event.preventDefault();
  };

  return (
    <main className="main" ref={container} style={{ gridTemplateRows: `${percent}% 8px minmax(0, 1fr)` }}>
      <div className="map-pane">{top}</div>
      <div
        className={dragging ? "divider drag" : "divider"}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Altura entre o mapa e a tabela"
        aria-valuemin={MIN_PERCENT}
        aria-valuemax={MAX_PERCENT}
        aria-valuenow={Math.round(percent)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={onKeyDown}
      />
      <div className="table-pane">{bottom}</div>
    </main>
  );
}
