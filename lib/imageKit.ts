import ImageKit, { toFile } from "@imagekit/nodejs";

let imageKitClient: ImageKit | null = null;

function getImageKit(): ImageKit {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("ImageKit private key is not set");
  }

  imageKitClient ??= new ImageKit({ privateKey });

  return imageKitClient;
}

export async function uploadSlideImage(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const client = getImageKit();

  const response = await client.files.upload({
    file: await toFile(buffer, fileName),
    fileName,
    folder: "/pitch-deck",
  });

  if (!response.url) {
    throw new Error("Failed to upload slide image");
  }

  return response.url;
}
