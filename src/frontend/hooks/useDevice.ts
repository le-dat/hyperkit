import { useEffect, useState } from "react";

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  orientation: "portrait" | "landscape";
  screenWidth: number;
  screenHeight: number;
}

export const useDevice = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isTouch: false,
    orientation: "portrait",
    screenWidth: 0,
    screenHeight: 0,
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setDeviceInfo({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isTouch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
        orientation: height >= width ? "portrait" : "landscape",
        screenWidth: width,
        screenHeight: height,
      });
    };

    // Initial check
    updateDeviceInfo();

    // Add event listeners
    window.addEventListener("resize", updateDeviceInfo);
    window.addEventListener("orientationchange", updateDeviceInfo);

    // Cleanup
    return () => {
      window.removeEventListener("resize", updateDeviceInfo);
      window.removeEventListener("orientationchange", updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};
