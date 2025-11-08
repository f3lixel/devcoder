"use client";
import { useEffect } from "react";

export default function ProjectsBgClient() {
  useEffect(() => {
    const cls = "projects-bg";
    document.body.classList.add(cls);
    return () => document.body.classList.remove(cls);
  }, []);
  return null;
}
