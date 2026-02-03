import * as ImageManipulator from "expo-image-manipulator";

export interface CompressedImage {
  uri: string;
  width: number;
  height: number;
}

export async function compressImage(
  uri: string,
  maxWidth: number = 1200,
  quality: number = 0.7
): Promise<CompressedImage> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error("Error compressing image:", error);
    return { uri, width: 0, height: 0 };
  }
}

export async function compressMultipleImages(
  uris: string[],
  maxWidth: number = 1200,
  quality: number = 0.7
): Promise<CompressedImage[]> {
  const promises = uris.map((uri) => compressImage(uri, maxWidth, quality));
  return Promise.all(promises);
}
