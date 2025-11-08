"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { loadDividerPercent, saveDividerPercent } from "@/lib/data/layout";

type ResizableSplitProps = {
  initialPercentLeft?: number;
  minPercentLeft?: number;
  maxPercentLeft?: number;
  left: React.ReactNode;
  right: React.ReactNode;
};

export default function ResizableSplit({
  initialPercentLeft = 40,
  minPercentLeft = 20,
  maxPercentLeft = 80,
  left,
  right,
}: ResizableSplitProps) {
  // Initialize with a stable value for SSR to avoid hydration mismatch
  const [percentLeft, setPercentLeft] = useState<number>(initialPercentLeft);
  // After mount, read persisted value and apply it
  useEffect(() => {
    const stored = loadDividerPercent();
    if (typeof stored === "number") {
      setPercentLeft(stored);
    }
  }, []);
  const isDraggingRef = useRef(false);

  const clamp = useCallback(
    (value: number) => Math.min(maxPercentLeft, Math.max(minPercentLeft, value)),
    [minPercentLeft, maxPercentLeft]
  );

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const next = clamp((clientX / window.innerWidth) * 100);
      setPercentLeft(next);
    },
    [clamp]
  );

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;
    updateFromClientX(e.clientX);
  }, [updateFromClientX]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingRef.current) return;
    updateFromClientX(e.touches[0]?.clientX ?? 0);
  }, [updateFromClientX]);

  const stopDragging = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    saveDividerPercent(percentLeft);
    document.body.style.cursor = "auto";
    document.body.style.userSelect = "auto";
  }, [percentLeft]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", stopDragging);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", stopDragging);
    };
  }, [onMouseMove, onTouchMove, stopDragging]);

  const startDragging = useCallback(() => {
    isDraggingRef.current = true;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 5 : 2;
      if (e.key === "ArrowLeft") {
        const next = clamp(percentLeft - step);
        setPercentLeft(next);
        saveDividerPercent(next);
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        const next = clamp(percentLeft + step);
        setPercentLeft(next);
        saveDividerPercent(next);
        e.preventDefault();
      } else if (e.key === "Home") {
        const next = clamp(minPercentLeft);
        setPercentLeft(next);
        saveDividerPercent(next);
        e.preventDefault();
      } else if (e.key === "End") {
        const next = clamp(maxPercentLeft);
        setPercentLeft(next);
        saveDividerPercent(next);
        e.preventDefault();
      }
    },
    [percentLeft, clamp, minPercentLeft, maxPercentLeft]
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ width: "100%", justifyContent: "flex-start", alignItems: "center", backgroundColor: "oklch(0.172 0 82.16)" }}>
      <div
        className="relative h-full"
        style={{ width: `${percentLeft}%` }}
      >
        {left}
      </div>

      <motion.div
        className="group relative z-10 h-full w-2 cursor-ew-resize select-none outline-none"
        style={{ WebkitTapHighlightColor: "transparent" }}
        role="separator"
        aria-orientation="vertical"
        aria-valuemin={minPercentLeft}
        aria-valuemax={maxPercentLeft}
        aria-valuenow={Math.round(percentLeft)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseDown={startDragging}
        onDoubleClick={() => {
          const next = clamp(40);
          setPercentLeft(next);
          saveDividerPercent(next);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          startDragging();
        }}
      >
        {/* Minimal core line (hidden by default, visible on hover) */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/10 opacity-0 group-hover:opacity-100 group-hover:bg-white/20 transition-opacity" />

        {/* Minimal grip dots (hidden by default, visible on hover) */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-70 transition-opacity">
          <span className="h-1 w-1 rounded-full bg-white/60" />
          <span className="h-1 w-1 rounded-full bg-white/60" />
          <span className="h-1 w-1 rounded-full bg-white/60" />
        </div>
      </motion.div>

      <div
        className="relative h-full flex-1 min-w-0"
      >
        {right}
      </div>
    </div>
  );
}
