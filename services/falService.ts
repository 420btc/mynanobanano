import { fal } from "@fal-ai/client";

// Configure Fal AI with API key from environment
if (import.meta.env.VITE_FAL_API_KEY) {
  fal.config({
    credentials: import.meta.env.VITE_FAL_API_KEY
  });
}

export interface Hunyuan3DInput {
  input_image_url: string;
  seed?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  octree_resolution?: number;
  textured_mesh?: boolean;
}

export interface Hunyuan3DOutput {
  model_mesh: {
    file_size: number;
    file_name: string;
    content_type: string;
    url: string;
  };
  seed: number;
}

export interface Hunyuan3DResult {
  data: Hunyuan3DOutput;
  requestId: string;
}

/**
 * Convert a 2D image to a 3D model using Hunyuan 3D
 * @param imageUrl - URL of the image to convert to 3D
 * @param options - Optional parameters for the conversion
 * @returns Promise with the 3D model data
 */
export const convertImageTo3D = async (
  imageUrl: string,
  options: Partial<Hunyuan3DInput> = {}
): Promise<Hunyuan3DResult> => {
  if (!import.meta.env.VITE_FAL_API_KEY) {
    throw new Error("VITE_FAL_API_KEY environment variable not set. Please ensure it's configured in your .env.local file.");
  }

  const input: Hunyuan3DInput = {
    input_image_url: imageUrl,
    num_inference_steps: options.num_inference_steps || 50,
    guidance_scale: options.guidance_scale || 7.5,
    octree_resolution: options.octree_resolution || 256,
    textured_mesh: options.textured_mesh || true,
    ...options
  };

  try {
    const result = await fal.subscribe("fal-ai/hunyuan3d/v2/turbo", {
      input,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    return result as Hunyuan3DResult;
  } catch (error) {
    console.error("Error converting image to 3D:", error);
    throw new Error(`Failed to convert image to 3D: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Upload a file to Fal storage and get a URL
 * @param file - File to upload
 * @returns Promise with the uploaded file URL
 */
export const uploadFileToFal = async (file: File): Promise<string> => {
  if (!import.meta.env.VITE_FAL_API_KEY) {
    throw new Error("VITE_FAL_API_KEY environment variable not set. Please ensure it's configured in your .env.local file.");
  }

  try {
    const url = await fal.storage.upload(file);
    return url;
  } catch (error) {
    console.error("Error uploading file to Fal:", error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Convert a data URL to a File object
 * @param dataUrl - Data URL string
 * @param fileName - Name for the file
 * @returns File object
 */
export const dataUrlToFile = (dataUrl: string, fileName: string): File => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], fileName, { type: mime });
};

/**
 * Convert an image element to 3D model
 * @param imageElement - HTML image element
 * @param fileName - Name for the temporary file
 * @param options - Optional parameters for the conversion
 * @returns Promise with the 3D model data
 */
export const convertImageElementTo3D = async (
  imageElement: HTMLImageElement,
  fileName: string = 'image.png',
  options: Partial<Hunyuan3DInput> = {}
): Promise<Hunyuan3DResult> => {
  // Convert image element to canvas and then to file
  const canvas = document.createElement('canvas');
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get 2d context for image conversion');
  }
  
  ctx.drawImage(imageElement, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  const file = dataUrlToFile(dataUrl, fileName);
  
  // Upload file to Fal storage
  const uploadedUrl = await uploadFileToFal(file);
  
  // Convert to 3D
  return convertImageTo3D(uploadedUrl, options);
};

/**
 * Download a file from a URL
 * @param url - URL of the file to download
 * @param fileName - Name for the downloaded file
 */
export const downloadFile = (url: string, fileName: string): void => {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};