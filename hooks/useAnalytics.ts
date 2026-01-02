
import { logEvent, Analytics } from "firebase/analytics";
import { analytics } from "../firebase";
import { useEffect, useState } from "react";

export const useAnalytics = () => {
  const [analyticsInstance, setAnalyticsInstance] = useState<Analytics | null>(null);

  useEffect(() => {
    // Resolve a promise do analytics exportada do firebase.ts
    if (analytics) {
      analytics.then((instance) => {
        if (instance) setAnalyticsInstance(instance);
      });
    }
  }, []);

  const logGameEvent = (eventName: string, params?: Record<string, any>) => {
    if (analyticsInstance) {
      logEvent(analyticsInstance, eventName, params);
    }
  };

  const trackScreen = (screenName: string) => {
    logGameEvent('screen_view', {
      firebase_screen: screenName,
      firebase_screen_class: screenName
    });
  };

  const trackLevelStart = (levelName: string, props?: Record<string, any>) => {
    logGameEvent('level_start', {
      level_name: levelName,
      ...props
    });
  };

  const trackLevelEnd = (levelName: string, success: boolean, score?: number) => {
    logGameEvent('level_end', {
      level_name: levelName,
      success: success ? 1 : 0,
      score: score || 0
    });
  };

  const trackSelectContent = (contentType: string, itemId: string) => {
    logGameEvent('select_content', {
      content_type: contentType,
      item_id: itemId
    });
  };

  return { logGameEvent, trackScreen, trackLevelStart, trackLevelEnd, trackSelectContent };
};
