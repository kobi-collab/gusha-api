import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const KEYS = {
  consent: "demo_radar_consent",
  checkedIn: "demo_radar_checked_in",
} as const;

export interface DemoRadarState {
  mapVisibilityConsent: boolean;
  isCheckedIn: boolean;
}

type DemoRadarListener = () => void;
const listeners = new Set<DemoRadarListener>();

function notifyDemoRadarChanged() {
  listeners.forEach((listener) => listener());
}

export function subscribeDemoRadar(listener: DemoRadarListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function loadDemoRadarState(): Promise<DemoRadarState> {
  try {
    const [consent, checkedIn] = await AsyncStorage.multiGet([
      KEYS.consent,
      KEYS.checkedIn,
    ]);
    return {
      mapVisibilityConsent: consent[1] === "true",
      isCheckedIn: checkedIn[1] === "true",
    };
  } catch {
    return { mapVisibilityConsent: false, isCheckedIn: false };
  }
}

export async function saveDemoRadarConsent(consented: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.consent, consented ? "true" : "false");
  if (!consented) {
    await AsyncStorage.setItem(KEYS.checkedIn, "false");
  }
  notifyDemoRadarChanged();
}

export async function saveDemoRadarCheckedIn(checkedIn: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.checkedIn, checkedIn ? "true" : "false");
  notifyDemoRadarChanged();
}

export async function clearDemoRadarState(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.consent, KEYS.checkedIn]);
  notifyDemoRadarChanged();
}

/** React hook for demo radar check-in state (games, explore, discovery). */
export function useDemoRadarStatus() {
  const [state, setState] = useState<DemoRadarState>({
    mapVisibilityConsent: false,
    isCheckedIn: false,
  });

  useEffect(() => {
    let active = true;
    const refresh = () => {
      loadDemoRadarState().then((loaded) => {
        if (active) setState(loaded);
      });
    };
    refresh();
    const unsubscribe = subscribeDemoRadar(refresh);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return state;
}
