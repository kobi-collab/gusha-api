import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Platform } from "react-native";
import * as Location from "expo-location";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import {
  loadDemoRadarState,
  saveDemoRadarCheckedIn,
  saveDemoRadarConsent,
} from "@/lib/demo-radar";

/** Demo fallback when location is unavailable (preview / denied permission). */
const DEMO_FALLBACK_COORDS = { latitude: "32.0853", longitude: "34.7818" };

async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

async function getCurrentCoords(): Promise<{ latitude: string; longitude: string }> {
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: String(position.coords.latitude),
    longitude: String(position.coords.longitude),
  };
}

async function getDemoCheckInCoords(): Promise<{ latitude: string; longitude: string }> {
  try {
    const granted = await requestLocationPermission();
    if (granted) {
      return await getCurrentCoords();
    }
  } catch {
    // fall through to demo fallback
  }
  return DEMO_FALLBACK_COORDS;
}

type RadarCheckInOptions = {
  /** Local-only radar state for demo mode (no server calls). */
  demo?: boolean;
};

function useDemoRadarCheckIn() {
  const [state, setState] = useState({
    mapVisibilityConsent: false,
    isCheckedIn: false,
    latitude: null as string | null,
    longitude: null as string | null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const checkedOutOnBackground = useRef(false);

  useEffect(() => {
    loadDemoRadarState().then((loaded) => {
      setState((prev) => ({
        ...prev,
        mapVisibilityConsent: loaded.mapVisibilityConsent,
        isCheckedIn: loaded.isCheckedIn,
      }));
      setIsLoading(false);
    });
  }, []);

  const checkOut = useCallback(async () => {
    if (!state.isCheckedIn) return;
    setIsWorking(true);
    try {
      await saveDemoRadarCheckedIn(false);
      setState((prev) => ({
        ...prev,
        isCheckedIn: false,
        latitude: null,
        longitude: null,
      }));
    } finally {
      setIsWorking(false);
    }
  }, [state.isCheckedIn]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") {
        if (state.isCheckedIn && !checkedOutOnBackground.current) {
          checkedOutOnBackground.current = true;
          checkOut();
        }
      } else if (next === "active") {
        checkedOutOnBackground.current = false;
      }
    });
    return () => sub.remove();
  }, [state.isCheckedIn, checkOut]);

  const grantConsent = useCallback(async () => {
    setIsWorking(true);
    try {
      await saveDemoRadarConsent(true);
      setState((prev) => ({ ...prev, mapVisibilityConsent: true }));
    } finally {
      setIsWorking(false);
    }
  }, []);

  const declineConsent = useCallback(async () => {
    setIsWorking(true);
    try {
      await saveDemoRadarConsent(false);
      setState((prev) => ({
        ...prev,
        mapVisibilityConsent: false,
        isCheckedIn: false,
        latitude: null,
        longitude: null,
      }));
    } finally {
      setIsWorking(false);
    }
  }, []);

  const checkIn = useCallback(async () => {
    setIsWorking(true);
    try {
      const coords = await getDemoCheckInCoords();
      await saveDemoRadarCheckedIn(true);
      setState((prev) => ({
        ...prev,
        isCheckedIn: true,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));
      return true;
    } catch {
      Alert.alert("Check-In Failed", "Could not update your location. Please try again.");
      return false;
    } finally {
      setIsWorking(false);
    }
  }, []);

  const startCheckInFlow = useCallback(async () => {
    if (!state.mapVisibilityConsent) {
      return "needs_consent" as const;
    }
    const ok = await checkIn();
    return ok ? ("checked_in" as const) : ("failed" as const);
  }, [state.mapVisibilityConsent, checkIn]);

  return {
    status: state,
    isLoading,
    isCheckedIn: state.isCheckedIn,
    hasConsent: state.mapVisibilityConsent,
    checkInExpiresAt: null,
    myLatitude: state.latitude,
    myLongitude: state.longitude,
    grantConsent,
    declineConsent,
    checkIn,
    checkOut,
    startCheckInFlow,
    isWorking,
    refetch: async () => loadDemoRadarState(),
  };
}

/**
 * Manages radar map visibility: consent, manual check-in/out, and session expiry.
 */
export function useRadarCheckIn(options: RadarCheckInOptions = {}) {
  const demoHook = useDemoRadarCheckIn();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const statusQuery = trpc.discover.radarStatus.useQuery(undefined, {
    enabled: !options.demo && isAuthenticated,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
  const consentMutation = trpc.discover.setMapConsent.useMutation({
    onSuccess: () => statusQuery.refetch(),
  });
  const checkInMutation = trpc.discover.radarCheckIn.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
      utils.discover.nearby.invalidate();
    },
  });
  const checkOutMutation = trpc.discover.radarCheckOut.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
      utils.discover.nearby.invalidate();
    },
  });

  const checkedOutOnBackground = useRef(false);

  const checkOut = useCallback(async () => {
    if (!statusQuery.data?.isCheckedIn) return;
    await checkOutMutation.mutateAsync();
  }, [statusQuery.data?.isCheckedIn, checkOutMutation]);

  useEffect(() => {
    if (options.demo || Platform.OS === "web") return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") {
        if (statusQuery.data?.isCheckedIn && !checkedOutOnBackground.current) {
          checkedOutOnBackground.current = true;
          checkOutMutation.mutate();
        }
      } else if (next === "active") {
        checkedOutOnBackground.current = false;
        statusQuery.refetch();
      }
    });
    return () => sub.remove();
  }, [options.demo, statusQuery, checkOutMutation]);

  const grantConsent = useCallback(async () => {
    await consentMutation.mutateAsync({ consented: true });
  }, [consentMutation]);

  const declineConsent = useCallback(async () => {
    await consentMutation.mutateAsync({ consented: false });
  }, [consentMutation]);

  const checkIn = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Connection Required",
        "Gusha needs to connect to your account before using the radar. Tap Continue on the welcome screen to reconnect."
      );
      return false;
    }
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert(
        "Location Required",
        "Gusha needs your location only while you are checked in to the radar so nearby users can see your approximate distance. You can check out at any time."
      );
      return false;
    }
    try {
      const coords = await getCurrentCoords();
      await checkInMutation.mutateAsync(coords);
      return true;
    } catch {
      Alert.alert("Check-In Failed", "Could not update your location. Please try again.");
      return false;
    }
  }, [checkInMutation, isAuthenticated]);

  const startCheckInFlow = useCallback(async () => {
    if (!statusQuery.data?.mapVisibilityConsent) {
      return "needs_consent" as const;
    }
    const ok = await checkIn();
    return ok ? ("checked_in" as const) : ("failed" as const);
  }, [statusQuery.data?.mapVisibilityConsent, checkIn]);

  const serverHook = {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    isCheckedIn: statusQuery.data?.isCheckedIn ?? false,
    hasConsent: statusQuery.data?.mapVisibilityConsent ?? false,
    checkInExpiresAt: statusQuery.data?.checkInExpiresAt ?? null,
    myLatitude: statusQuery.data?.latitude ?? null,
    myLongitude: statusQuery.data?.longitude ?? null,
    grantConsent,
    declineConsent,
    checkIn,
    checkOut,
    startCheckInFlow,
    isWorking:
      consentMutation.isPending ||
      checkInMutation.isPending ||
      checkOutMutation.isPending,
    refetch: statusQuery.refetch,
  };

  return options.demo ? demoHook : serverHook;
}
