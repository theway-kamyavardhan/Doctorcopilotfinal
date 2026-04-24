import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

function getViewportState() {
  if (typeof window === "undefined") {
    return {
      width: 1280,
      isMobile: false,
      isTablet: false,
    };
  }

  const width = window.innerWidth;

  return {
    width,
    isMobile: width < MOBILE_BREAKPOINT,
    isTablet: width >= MOBILE_BREAKPOINT && width < 1100,
  };
}

export default function useViewport() {
  const [viewport, setViewport] = useState(getViewportState);

  useEffect(() => {
    const updateViewport = () => {
      setViewport(getViewportState());
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return viewport;
}
