import { useState, useEffect } from 'react';

const useResponsive = () => {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const [deviceType, setDeviceType] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouch: false,
    isLandscape: false,
  });

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setScreenSize({ width, height });
      
      setDeviceType({
        isMobile: width <= 480,
        isTablet: width > 480 && width <= 1023,
        isDesktop: width > 1023,
        isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        isLandscape: width > height,
      });
    };

    updateScreenSize();
    
    window.addEventListener('resize', updateScreenSize);
    window.addEventListener('orientationchange', updateScreenSize);
    
    return () => {
      window.removeEventListener('resize', updateScreenSize);
      window.removeEventListener('orientationchange', updateScreenSize);
    };
  }, []);

  const breakpoints = {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    large: 1200,
  };

  const isBreakpoint = (breakpoint) => {
    return screenSize.width <= breakpoints[breakpoint];
  };

  const getGridColumns = (defaultCols = 1) => {
    if (deviceType.isMobile) return 1;
    if (deviceType.isTablet) return Math.min(2, defaultCols);
    return defaultCols;
  };

  const getSpacing = (base = 'md') => {
    if (deviceType.isMobile) {
      return base === 'lg' ? 'md' : base === 'xl' ? 'lg' : 'sm';
    }
    if (deviceType.isTablet) {
      return base === 'xl' ? 'lg' : base;
    }
    return base;
  };

  return {
    screenSize,
    deviceType,
    breakpoints,
    isBreakpoint,
    getGridColumns,
    getSpacing,
  };
};

export default useResponsive;