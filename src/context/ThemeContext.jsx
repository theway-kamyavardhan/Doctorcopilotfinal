import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [revealOrigin, setRevealOrigin] = useState({ x: 0, y: 0 });
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem("doctor-copilot-theme");
    if (saved === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = (e) => {
    // Capture click position for the 'Liquid Drop' origin
    if (e) {
      setRevealOrigin({ x: e.clientX, y: e.clientY });
    } else {
      // Default to center if no event
      setRevealOrigin({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }

    setIsTransitioning(true);
    
    // Smooth timing for the 'Liquid Drop' animation
    setTimeout(() => {
      const newDark = !isDark;
      setIsDark(newDark);
      
      if (newDark) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("doctor-copilot-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("doctor-copilot-theme", "light");
      }
      
      // Keep transition state active until animation finishes
      setTimeout(() => setIsTransitioning(false), 1200);
    }, 150); // Slight delay for the 'drop' impact
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, revealOrigin, isTransitioning }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
