import { useEffect, useState } from "react";

function detectWebGLSupport() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2", { powerPreference: "low-power" }) ||
      canvas.getContext("webgl", { powerPreference: "low-power" }) ||
      canvas.getContext("experimental-webgl", { powerPreference: "low-power" });
    return Boolean(context);
  } catch {
    return false;
  }
}

export default function useAdaptiveVisuals(options = {}) {
  const { preferPerformance = false } = options;
  const [state, setState] = useState({
    allowFluid: false,
    allow3D: false,
  });

  useEffect(() => {
    const updateSupport = () => {
      const reducedMotion =
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
      const mobileViewport =
        window.matchMedia?.("(max-width: 1023px)")?.matches ?? window.innerWidth < 1024;
      const deviceMemory = navigator.deviceMemory ?? 8;
      const cpuThreads = navigator.hardwareConcurrency ?? 8;
      const webglSupported = detectWebGLSupport();

      const fluidMemoryFloor = preferPerformance ? 6 : 4;
      const fluidCpuFloor = preferPerformance ? 6 : 4;

      setState({
        allowFluid:
          webglSupported &&
          !reducedMotion &&
          !mobileViewport &&
          deviceMemory >= fluidMemoryFloor &&
          cpuThreads >= fluidCpuFloor,
        allow3D:
          webglSupported &&
          !reducedMotion &&
          !mobileViewport &&
          deviceMemory >= 8 &&
          cpuThreads >= 8,
      });
    };

    updateSupport();

    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    media?.addEventListener?.("change", updateSupport);
    window.addEventListener("resize", updateSupport);

    return () => {
      media?.removeEventListener?.("change", updateSupport);
      window.removeEventListener("resize", updateSupport);
    };
  }, [preferPerformance]);

  return state;
}
