import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

/**
 * Hook for uploading photos to S3 via the server.
 * Handles base64 encoding and upload for both web and native.
 */
export function usePhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadMutation = trpc.upload.photo.useMutation();

  const uploadPhoto = useCallback(
    async (uri: string, fileName?: string): Promise<string | null> => {
      setUploading(true);
      setProgress(0);
      try {
        let base64: string;

        if (Platform.OS === "web") {
          // Web: fetch the blob and convert to base64
          const response = await fetch(uri);
          const blob = await response.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              // Remove data URL prefix (data:image/jpeg;base64,...)
              const b64 = result.split(",")[1] || result;
              resolve(b64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          // Native: use FileSystem to read as base64
          base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        setProgress(50);

        const name = fileName || `photo_${Date.now()}.jpg`;
        const result = await uploadMutation.mutateAsync({
          base64,
          fileName: name,
          contentType: "image/jpeg",
        });

        setProgress(100);
        return result.url;
      } catch (e) {
        console.error("[usePhotoUpload] Upload failed:", e);
        return null;
      } finally {
        setUploading(false);
      }
    },
    [uploadMutation]
  );

  return {
    uploadPhoto,
    uploading,
    progress,
  };
}
