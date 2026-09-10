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
