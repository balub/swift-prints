/**
 * Network Status Hook
 * Monitors online/offline status and provides network information
 */
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface NetworkStatus {
  online: boolean;
  downlink?: number;
  effectiveType?: string;
  rtt?: number;
  saveData?: boolean;
}

export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      setNetworkStatus({
        online: navigator.onLine,
        downlink: connection?.downlink,
        effectiveType: connection?.effectiveType,
        rtt: connection?.rtt,
        saveData: connection?.saveData,
      });
    };

    const handleOnline = () => {
      updateNetworkStatus();
      toast.success("Connection restored", {
        description: "You are back online",
      });
    };

    const handleOffline = () => {
      updateNetworkStatus();
      toast.error("Connection lost", {
        description: "You are currently offline",
      });
    };

    const handleConnectionChange = () => {
      updateNetworkStatus();
    };

    // Initial update
    updateNetworkStatus();

    // Add event listeners
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for connection changes (if supported)
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener("change", handleConnectionChange);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      if (connection) {
        connection.removeEventListener("change", handleConnectionChange);
      }
    };
  }, []);

  return networkStatus;
}

export default useNetworkStatus;
