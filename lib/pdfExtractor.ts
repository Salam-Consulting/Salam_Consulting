/**
 * Native (iOS/Android) PDF extraction fallback.
 * expo-pdf-text-extract handles extraction in dev builds.
 * This module is used when native extraction isn't available.
 */
export async function extractTextFromPdfWeb(_uri: string): Promise<string> {
  throw new Error(
    "PDF formatting requires a development build. Run `npx expo run:android` or `npx expo run:ios`."
  );
}
