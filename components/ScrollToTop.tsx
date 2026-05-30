"use client";

import { useEffect } from "react";

export default function ScrollToTop() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, []);
  return null;
}
