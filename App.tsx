import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { Analytics } from '@vercel/analytics/react';
import { generateImageWithPrompt, generateImageWithMultiplePrompts, generateImageFromText, getRemixSuggestions } from './services/geminiService';
import { convertImageElementTo3D, downloadFile, Model3DType, convertImageElementToVideo, VideoResult, VideoModelType, VIDEO_MODEL_OPTIONS } from './services/falService';

// --- SOUND DEFINITIONS ---
const synth = new Tone.Synth({
  oscillator: { type: 'sine' },
  envelope: {
    attack: 0.01,
    decay: 0.2,
    sustain: 0,
    release: 0.2,
  },
}).toDestination();


const ensureAudioContext = async () => {
    if (Tone.context.state !== 'running') {
        await Tone.start();
    }
};


// --- PROMPT DEFINITIONS ---
const PROMPT_PREFIX_IMAGE = "Concisely identify and name the main subject in this image (e.g. person, character, object, building, vehicle, animal, landscape, nature scene, sky, ocean, mountain, forest, or any other element). ";
const PROMPT_POSTFIX = "in isometric perspective, 8-bit sprite on a white background. No drop shadow";
const PROMPT_MAIN = (subject: string) => `Create 3d pixel art of ${subject} `;
const IMAGE_PROMPT = PROMPT_PREFIX_IMAGE + PROMPT_MAIN("the isolated key entity") + PROMPT_POSTFIX;
const TEXT_PROMPT_TEMPLATE = (input: string) => PROMPT_MAIN(input) + PROMPT_POSTFIX;
const REMIX_PROMPT_TEMPLATE = (input: string) => `${input}. Keep it as 3d pixel art in isometric perspective, 8-bit sprite on white background. No drop shadow.`;
const REMIX_SUGGESTION_PROMPT = `Here is some 3d pixel art. Come up with 5 brief prompts for ways to remix the key entity/object. e.g. "Make it [x]" or "Add a [x]" or some other alteration of the key entity/object. Do NOT suggest ways to alter the environment or background, that must stay a plain solid empty background. Only give alterations of the key entity/object itself. Prompts should be under 8 words.`;

// Building mode constants
const BUILDING_PREFIX_IMAGE = "Identify and convert this architectural element, building, structure, or construction (e.g. house, tower, bridge, monument, infrastructure, urban element) into an isometric 2D representation. ";
const BUILDING_POSTFIX = "in isometric perspective, architectural style, clean 2D building sprite on white background. No drop shadow, no people, no vehicles.";
const BUILDING_MAIN = (subject: string) => `Create an isometric 2D building of ${subject} `;
const BUILDING_IMAGE_PROMPT = BUILDING_PREFIX_IMAGE + BUILDING_MAIN("this building/structure") + BUILDING_POSTFIX;
const BUILDING_TEXT_PROMPT_TEMPLATE = (input: string) => BUILDING_MAIN(input) + BUILDING_POSTFIX;
const BUILDING_REMIX_PROMPT_TEMPLATE = (input: string) => `${input}. Keep it as an isometric 2D building on white background. No drop shadow, architectural style.`;

// Anime mode constants
const ANIME_PREFIX_IMAGE = "Identify and convert this subject (character, person, creature, object, scene, landscape, or any element) into a high-definition anime-style isometric representation. ";
const ANIME_POSTFIX = "in ultra-detailed anime isometric style, high resolution, vibrant colors, clean sprite on white background. No drop shadow, anime aesthetic with detailed shading, isometric perspective.";
const ANIME_MAIN = (subject: string) => `Create a high-definition anime isometric art of ${subject} `;
const ANIME_IMAGE_PROMPT = ANIME_PREFIX_IMAGE + ANIME_MAIN("this character/object") + ANIME_POSTFIX;
const ANIME_TEXT_PROMPT_TEMPLATE = (input: string) => ANIME_MAIN(input) + ANIME_POSTFIX;
const ANIME_REMIX_PROMPT_TEMPLATE = (input: string) => `${input}. Keep it as ultra-detailed anime isometric art on white background. No drop shadow, high-definition anime style, isometric perspective.`;

// Sticker mode constants
const STICKER_PREFIX_IMAGE = "Convert this entire image into a high-quality 3D perspective sticker design. ";
const STICKER_POSTFIX = "in 3D perspective style, vibrant colors, professional sticker design on transparent background. No drop shadow, clean edges, logo-ready quality, suitable for printing.";
const STICKER_MAIN = (subject: string) => `Create a 3D perspective sticker design of ${subject} `;
const STICKER_IMAGE_PROMPT = STICKER_PREFIX_IMAGE + STICKER_MAIN("the complete scene/image") + STICKER_POSTFIX;
const STICKER_TEXT_PROMPT_TEMPLATE = (input: string) => STICKER_MAIN(input) + STICKER_POSTFIX;
const STICKER_REMIX_PROMPT_TEMPLATE = (input: string) => `${input}. Keep it as a 3D perspective sticker design on transparent background. No drop shadow, professional logo quality.`;

// Complete mode constants
const COMPLETE_PREFIX_IMAGE = "Recreate this entire image as a complete isometric pixel art scene, including all elements, objects, characters, backgrounds, and details visible in the original image. ";
const COMPLETE_POSTFIX = "in isometric perspective, 3D pixel art style, maintaining the complete composition and all visual elements on white background. No drop shadow, preserve all details and spatial relationships.";
const COMPLETE_MAIN = (subject: string) => `Create a complete isometric pixel art recreation of ${subject} `;
const COMPLETE_IMAGE_PROMPT = COMPLETE_PREFIX_IMAGE + COMPLETE_MAIN("the entire scene with all elements") + COMPLETE_POSTFIX;
const COMPLETE_TEXT_PROMPT_TEMPLATE = (input: string) => COMPLETE_MAIN(input) + COMPLETE_POSTFIX;
const COMPLETE_REMIX_PROMPT_TEMPLATE = (input: string) => `${input}. Keep it as a complete isometric pixel art scene with all elements on white background. No drop shadow, maintain full composition.`;

// Game modes
type GameMode = 'pixel' | 'building' | 'anime' | 'sticker' | 'complete';
const GAME_MODES = {
  pixel: {
    name: 'Pixel Art',
    description: '3D pixel art sprites',
    icon: '🎮'
  },
  building: {
    name: 'Constructor',
    description: 'Edificios isométricos 2D',
    icon: '🏗️'
  },
  anime: {
    name: 'Anime HD',
    description: 'Arte anime isométrico ultra definido',
    icon: '🎌'
  },
  sticker: {
    name: 'Sticker 3D',
    description: 'Pegatinas 3D para logotipos',
    icon: '🏷️'
  },
  complete: {
    name: 'Escena Completa',
    description: 'Recrea toda la imagen en pixel art isométrico',
    icon: '🖼️'
  }
} as const;

// 3D Models configuration
const MODEL_3D_OPTIONS = {
  'hunyuan-normal': {
    name: 'Hunyuan Normal',
    description: 'Modelo completo con GLB, PBR y MESH',
    icon: '🏆',
    speed: 'Lento',
    quality: 'Alta'
  },
  'hunyuan-turbo': {
    name: 'Hunyuan Turbo',
    description: 'Modelo rápido, solo GLB',
    icon: '⚡',
    speed: 'Rápido',
    quality: 'Media'
  },
  'trellis': {
    name: 'Trellis',
    description: 'Modelo avanzado de Microsoft',
    icon: '🔬',
    speed: 'Medio',
    quality: 'Muy Alta'
  }
} as const;

const IMAGE_WIDTH = 375; // Increased from 250

// Scale options
const SCALE_OPTIONS = [1, 1.2, 1.5, 2] as const;
type ScaleValue = typeof SCALE_OPTIONS[number];

// Adjust this value to control how aggressively the background is removed.
// Higher values are more aggressive. Good for chroma key.
const COLOR_DISTANCE_THRESHOLD = 20;
const MOVE_AMOUNT = 25; // Corresponds to the vertical step of the isometric grid

interface ProcessedImage {
  id: number;
  sourceFile?: File;
  sourceText?: string;
  processedImage: HTMLImageElement | null;
  originalImageUrl?: string;
  showOriginal?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  isGenerating: boolean;
  contentBounds: { x: number; y: number; width: number; height: number; };
  sourcePreviewUrl?: string;
  flippedHorizontally?: boolean;
  isVariation?: boolean;
  remixSuggestions?: string[];
  generatingPrompt?: string; // To display during loading
  justGenerated?: boolean; // For entrance animation
  generatedAt?: number; // Timestamp for animation timing
  // Metadata for info modal
  originalPrompt?: string; // The prompt used to generate this image
  createdAt?: Date; // When generation started
  completedAt?: Date; // When generation finished
  generationDuration?: number; // Duration in milliseconds
  // Scaling
  scale?: number; // Scale factor (1, 1.2, 1.5, 2)
  // 3D Model properties
  model3D?: {
    meshUrl: string;
    glbUrl?: string;
    pbrUrl?: string;
    isGenerating: boolean;
    error?: string;
    modelType?: Model3DType;
  };
  // Video properties
  video?: {
    videoUrl: string;
    isGenerating: boolean;
    error?: string;
    prompt?: string;
    modelType?: VideoModelType;
  };
}

interface ImageProcessingResult {
    transparentImage: HTMLImageElement;
    contentBounds: { x: number; y: number; width: number; height: number; };
}

const processImageForTransparency = (imageUrl: string): Promise<ImageProcessingResult> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        return reject(new Error('Could not get 2d context'));
      }
      ctx.drawImage(img, 0, 0);
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Get top-left pixel color as the background color
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];

        // Using squared Euclidean distance for performance.
        const colorDistanceThresholdSquared = COLOR_DISTANCE_THRESHOLD * COLOR_DISTANCE_THRESHOLD;

        let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const distanceSquared = (r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2;

          if (distanceSquared < colorDistanceThresholdSquared) {
            data[i + 3] = 0; // Set alpha to 0 (transparent)
          }
        }
        
        // Calculate tight bounding box
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const alpha = data[(y * canvas.width + x) * 4 + 3];
                if (alpha > 0) { // If pixel is not transparent
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);
        
        const transparentImage = new Image();
        transparentImage.src = canvas.toDataURL();
        transparentImage.onload = () => {
            const contentBounds = (maxX >= minX && maxY >= minY) 
                ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
                : { x: 0, y: 0, width: canvas.width, height: canvas.height }; // Fallback
            resolve({ transparentImage, contentBounds });
        };
        transparentImage.onerror = (err) => reject(err);

      } catch (error) {
         console.error("Error processing image for transparency:", error);
         // Resolve with original image if processing fails
         resolve({ transparentImage: img, contentBounds: { x: 0, y: 0, width: img.width, height: img.height }});
      }
    };
    img.onerror = (err) => reject(err);
    img.src = imageUrl;
  });
};

const drawIsometricGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    const isoAngle = Math.PI / 6; // 30 degrees
    const gridSpacing = 50;
    
    const sinAngle = Math.sin(isoAngle);
    const cosAngle = Math.cos(isoAngle);
    
    // Using a large number based on the diagonal to ensure coverage
    const extendedDim = (width + height) * 1.5;

    ctx.beginPath();
    
    // Lines from top-left to bottom-right
    for (let i = -extendedDim; i < extendedDim; i += gridSpacing) {
        ctx.moveTo(i - extendedDim * cosAngle, 0 - extendedDim * sinAngle);
        ctx.lineTo(i + extendedDim * cosAngle, 0 + extendedDim * sinAngle);
    }

    // Lines from top-right to bottom-left
    for (let i = -extendedDim; i < extendedDim; i += gridSpacing) {
        ctx.moveTo(i + extendedDim * cosAngle, 0 - extendedDim * sinAngle);
        ctx.lineTo(i - extendedDim * cosAngle, 0 + extendedDim * sinAngle);
    }
    
    ctx.stroke();
};

const imageElementToFile = async (imageElement: HTMLImageElement, fileName: string): Promise<File> => {
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not get 2d context for image conversion");
    ctx.drawImage(imageElement, 0, 0);
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) {
                resolve(new File([blob], fileName, { type: 'image/png' }));
            } else {
                reject(new Error("Canvas to Blob conversion failed"));
            }
        }, 'image/png');
    });
};


const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('pixel');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [showPendingArea, setShowPendingArea] = useState(false);
  const [generationTimer, setGenerationTimer] = useState<Record<number, number>>({});
  const [completionBadges, setCompletionBadges] = useState<Record<number, { duration: number; timestamp: number }>>({});
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [remixInput, setRemixInput] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const remixInputRef = useRef<HTMLInputElement>(null);
  const [draggingImage, setDraggingImage] = useState<{ id: number; offsetX: number; offsetY: number } | null>(null);
  const [hoveredImageId, setHoveredImageId] = useState<number | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const nextId = useRef(0);
  const previewImageCache = useRef<Record<number, HTMLImageElement>>({});
  const originalImageCache = useRef<Record<number, HTMLImageElement>>({});
  const prevImagesRef = useRef<ProcessedImage[]>([]);
  const [animationTick, setAnimationTick] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [selected3DModel, setSelected3DModel] = useState<{ meshUrl: string; glbUrl?: string; pbrUrl?: string; modelType?: Model3DType } | null>(null);
  const [show3DModelSelector, setShow3DModelSelector] = useState(false);
  const [selectedModelType, setSelectedModelType] = useState<Model3DType>('hunyuan-turbo');
  const [showVideoPrompt, setShowVideoPrompt] = useState(false);
  const [videoPromptInput, setVideoPromptInput] = useState('');
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ videoUrl: string; prompt?: string } | null>(null);
  const [showVideoModelSelector, setShowVideoModelSelector] = useState(false);
  const [selectedVideoModelType, setSelectedVideoModelType] = useState<VideoModelType>('lucy');

  const selectedImage = useMemo(() =>
    selectedImageId !== null ? images.find(img => img.id === selectedImageId) : null,
    [images, selectedImageId]
  );

  const isActionDisabled = !selectedImage || selectedImage.isGenerating;

  // Effect for render complete sound
  useEffect(() => {
    const prevImagesMap = new Map(prevImagesRef.current.map(img => [img.id, img]));

    images.forEach(img => {
        const prevImg = prevImagesMap.get(img.id);
        if (prevImg && prevImg.isGenerating && !img.isGenerating) {
            // Image just finished generating
            (async () => {
                await ensureAudioContext();
                synth.triggerAttackRelease('C5', '8n');
            })();
        }
    });
  }, [images]);

  // Effect for smooth loader animations
  useEffect(() => {
    const isGenerating = images.some(img => img.isGenerating);
    let intervalId: number | undefined;
    if (isGenerating) {
        intervalId = window.setInterval(() => {
            setAnimationTick(tick => tick + 1);
        }, 200); // Faster update interval
    }
    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
  }, [images]);

  // Timer management for generation
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Update generation timers
      setGenerationTimer(prev => {
        const updated = { ...prev };
        images.forEach(img => {
          if (img.isGenerating && img.createdAt) {
            updated[img.id] = Math.floor((now - img.createdAt.getTime()) / 1000);
          } else if (!img.isGenerating && updated[img.id] !== undefined) {
            delete updated[img.id];
          }
        });
        return updated;
      });
      
      // Clean up old completion badges (after 3 seconds)
      setCompletionBadges(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          if (now - updated[parseInt(id)].timestamp > 3000) {
            delete updated[parseInt(id)];
          }
        });
        return updated;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [images]);

  // Effect for cycling through remix suggestions
  useEffect(() => {
    if (selectedImage?.remixSuggestions?.length) {
        const intervalId = setInterval(() => {
            setSuggestionIndex(prev => (prev + 1) % (selectedImage.remixSuggestions?.length || 1));
        }, 3000); // 3-second timer
        return () => clearInterval(intervalId);
    }
  }, [selectedImage]);


  useEffect(() => {
    const prevUrls = new Set(prevImagesRef.current.map(i => i.sourcePreviewUrl).filter(Boolean));
    const currentUrls = new Set(images.map(i => i.sourcePreviewUrl).filter(Boolean));

    prevUrls.forEach(url => {
      // only revoke blob URLs, not data URLs
      if (url && (url as string).startsWith('blob:') && !currentUrls.has(url)) {
        URL.revokeObjectURL(url as string);
        const entry = Object.entries(previewImageCache.current).find(([, img]) => (img as HTMLImageElement).src === url);
        if (entry) {
          delete previewImageCache.current[parseInt(entry[0], 10)];
        }
      }
    });
    
    // Cleanup for original image cache
    const prevIds = new Set(prevImagesRef.current.map(i => i.id));
    const currentIds = new Set(images.map(i => i.id));
    prevIds.forEach(id => {
      if (!currentIds.has(id)) {
        delete originalImageCache.current[id];
      }
    });

    prevImagesRef.current = images;
  }, [images]);

  // Effect for closing mode selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Don't close if clicking inside the mode selector
      if (showModeSelector && !target.closest('.mode-selector')) {
        setShowModeSelector(false);
      }
    };
    
    if (showModeSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModeSelector]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawIsometricGrid(ctx, canvas.width, canvas.height);

    const ellipses = ['.', '..', '...'][animationTick % 3];
    
    const drawLoaderEllipses = (x: number, y: number, size: 'large' | 'small' = 'large') => {
        ctx.font = size === 'large' ? '36px "Space Mono"' : '24px "Space Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(ellipses, x, y);
        ctx.fillStyle = 'white';
        ctx.fillText(ellipses, x, y);
    }


    images.forEach(img => {
      const drawX = Math.round(img.x);
      const drawY = Math.round(img.y);
      
      const imageToDraw = (img.showOriginal && originalImageCache.current[img.id])
          ? originalImageCache.current[img.id]
          : img.processedImage;

      if (imageToDraw && !img.isGenerating) {
        const scale = img.scale || 1;
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        
        ctx.save();
        
        if (img.flippedHorizontally) {
            ctx.scale(-1, 1);
            ctx.drawImage(imageToDraw, -drawX - scaledWidth, drawY, scaledWidth, scaledHeight);
        } else {
            ctx.drawImage(imageToDraw, drawX, drawY, scaledWidth, scaledHeight);
        }
        
        ctx.restore();
        
        // Show completion badge
        const badge = completionBadges[img.id];
        if (badge) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
          ctx.fillRect(drawX + scaledWidth - 60, drawY - 25, 55, 20);
          ctx.fillStyle = 'white';
          ctx.font = '12px "Space Mono"';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`✓ ${badge.duration}s`, drawX + scaledWidth - 32, drawY - 15);
        }
      }
      
      if (img.isGenerating) {
        if (imageToDraw) { // --- REGENERATING / REMIXING ---
            if (img.flippedHorizontally) {
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(imageToDraw, -drawX - img.width, drawY, img.width, img.height);
                ctx.restore();
            } else {
                ctx.drawImage(imageToDraw, drawX, drawY, img.width, img.height);
            }
            
            const loaderY = drawY + img.height + 20;

            if (img.isVariation && img.generatingPrompt) {
                 ctx.fillStyle = 'black';
                 ctx.font = '14px "Space Mono"';
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'top';
                 ctx.fillText(img.generatingPrompt, drawX + img.width / 2, loaderY);
                 drawLoaderEllipses(drawX + img.width / 2, loaderY + 25);
            } else {
                drawLoaderEllipses(drawX + img.width / 2, drawY + img.height / 2);
            }
            
            // Show timer during generation
             const timer = generationTimer[img.id];
             if (timer !== undefined) {
                 // Draw background for better visibility
                 const timerText = `${timer}s`;
                 ctx.font = '16px "Space Mono"';
                 const textWidth = ctx.measureText(timerText).width;
                 const badgeWidth = textWidth + 16;
                 const badgeHeight = 24;
                 const badgeX = drawX + img.width + 10;
                 const badgeY = drawY - 5;
                 
                 // White background with border
                 ctx.fillStyle = 'white';
                 ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
                 ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                 ctx.lineWidth = 1;
                 ctx.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);
                 
                 // Timer text
                 ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';
                 ctx.fillText(timerText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
             }

        } else if (img.sourcePreviewUrl && previewImageCache.current[img.id]) { // --- NEW IMAGE LOADER ---
            const previewImg = previewImageCache.current[img.id];
            if (previewImg.complete) {
                const PADDING = 10;
                const loaderWidth = 250 * 0.6; // Keep placeholder small 
                const aspectRatio = previewImg.width / previewImg.height;
                const loaderHeight = loaderWidth / aspectRatio;
                const containerWidth = loaderWidth + PADDING * 2;
                const containerHeight = loaderHeight + PADDING * 2;
                const containerX = Math.round(img.x + (img.width - containerWidth) / 2);
                const containerY = Math.round(img.y + (img.height - containerHeight) / 2);
                
                ctx.drawImage(previewImg, containerX + PADDING, containerY + PADDING, loaderWidth, loaderHeight);
                
                drawLoaderEllipses(containerX + containerWidth / 2, containerY + containerHeight / 2, 'small');
            }
        } else if (img.sourceText) { // --- NEW TEXT LOADER ---
            const loaderWidth = 250; // Keep placeholder small
            const loaderHeight = 250; // Make it a square
            const loaderX = drawX;
            const loaderY = Math.round(img.y + (img.height - loaderHeight) / 2);
            
            const centerX = loaderX + loaderWidth / 2;
            const centerY = loaderY + loaderHeight / 2;
            const radius = loaderWidth / 2;

            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = 'black';
            ctx.font = '14px "Space Mono"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const text = img.sourceText;
            const maxWidth = loaderWidth - 20;
            const words = text.split(' ');
            let line = '';
            const lines = [];
            
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const testWidth = ctx.measureText(testLine).width;
                if (testWidth > maxWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
            
            const lineHeight = 18;
            const totalTextHeight = lines.length * lineHeight;
            let textY = loaderY + (loaderHeight - totalTextHeight) / 2 + (lineHeight / 2);
            
            for(const l of lines) {
                ctx.fillText(l.trim(), loaderX + loaderWidth / 2, Math.round(textY));
                textY += lineHeight;
            }

            const textBottomY = textY - lineHeight;
            const remainingSpace = (loaderY + loaderHeight) - textBottomY;
            const ellipsesY = textBottomY + remainingSpace / 2;

            drawLoaderEllipses(loaderX + loaderWidth / 2, Math.round(ellipsesY), 'small');
        }
      }
      
      const isHovered = hoveredImageId === img.id && !img.isGenerating && img.processedImage;
      if (selectedImageId === img.id || isHovered) {
        const scale = img.scale || 1;
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const centerX = Math.round(img.x + scaledWidth / 2);
        const centerY = Math.round(img.y + scaledHeight / 2);
        const radius = Math.min(scaledWidth, scaledHeight) / 2 * 0.8;
        
        ctx.lineWidth = 1;
        if (selectedImageId === img.id) {
            ctx.strokeStyle = 'rgba(0, 123, 255, 0.5)';
        } else { // isHovered
            ctx.strokeStyle = 'rgba(0, 123, 255, 0.25)';
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });
  }, [images, hoveredImageId, selectedImageId, animationTick]);

  useEffect(() => {
      const animationFrameId = requestAnimationFrame(drawCanvas);
      return () => cancelAnimationFrame(animationFrameId);
  }, [drawCanvas, animationTick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawCanvas();
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [drawCanvas]);

  const generateFromImage = async (file: File, id: number, prompt?: string) => {
    // Use mode-specific prompt if none provided
    let defaultPrompt;
    if (gameMode === 'building') {
      defaultPrompt = BUILDING_IMAGE_PROMPT;
    } else if (gameMode === 'anime') {
      defaultPrompt = ANIME_IMAGE_PROMPT;
    } else if (gameMode === 'sticker') {
      defaultPrompt = STICKER_IMAGE_PROMPT;
    } else if (gameMode === 'complete') {
      defaultPrompt = COMPLETE_IMAGE_PROMPT;
    } else {
      defaultPrompt = IMAGE_PROMPT;
    }
    const finalPrompt = prompt || defaultPrompt;
    const startTime = new Date();
    
    // Update the image with start time and prompt
    setImages(prev => prev.map(img => 
      img.id === id ? { 
        ...img, 
        originalPrompt: finalPrompt,
        createdAt: startTime 
      } : img
    ));
    
    try {
      const { imageUrl } = await generateImageWithPrompt(file, finalPrompt);
      if (!imageUrl) throw new Error("Generation failed, no image returned.");

      const originalImg = new Image();
      originalImg.src = imageUrl;
      originalImageCache.current[id] = originalImg;
      
      const { transparentImage, contentBounds } = await processImageForTransparency(imageUrl);
      const aspectRatio = transparentImage.width / transparentImage.height;
      
      const imageFileForSuggestions = await imageElementToFile(transparentImage, 'suggestion-source.png');
      const suggestions = await getRemixSuggestions(imageFileForSuggestions, REMIX_SUGGESTION_PROMPT);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      setImages(prev => prev.map(img => {
        if (img.id !== id) return img;
        
        const newWidth = IMAGE_WIDTH;
        const newHeight = IMAGE_WIDTH / aspectRatio;
        // Recalculate center based on the image's current state, which may have been updated by dragging
        const currentCenterX = img.x + img.width / 2;
        const currentCenterY = img.y + img.height / 2;

        return {
          ...img,
          processedImage: transparentImage,
          originalImageUrl: imageUrl,
          showOriginal: false,
          contentBounds,
          width: newWidth,
          height: newHeight,
          x: currentCenterX - newWidth / 2,
          y: currentCenterY - newHeight / 2,
          isGenerating: false,
          sourcePreviewUrl: undefined,
          remixSuggestions: suggestions,
          generatingPrompt: undefined,
          completedAt: endTime,
          generationDuration: duration,
          scale: 1,
        }
      }));
      
      // Create completion badge
      setCompletionBadges(prev => ({
        ...prev,
        [id]: { duration: Math.floor(duration / 1000), timestamp: Date.now() }
      }));
    } catch (e) {
      console.error(e);
      setImages(prev => prev.filter(img => img.id !== id));
    }
  };

  const generateFromText = async (userInput: string, id: number) => {
    const startTime = new Date();
    let fullPrompt;
    if (gameMode === 'building') {
      fullPrompt = BUILDING_TEXT_PROMPT_TEMPLATE(userInput);
    } else if (gameMode === 'anime') {
      fullPrompt = ANIME_TEXT_PROMPT_TEMPLATE(userInput);
    } else if (gameMode === 'sticker') {
      fullPrompt = STICKER_TEXT_PROMPT_TEMPLATE(userInput);
    } else if (gameMode === 'complete') {
      fullPrompt = COMPLETE_TEXT_PROMPT_TEMPLATE(userInput);
    } else {
      fullPrompt = TEXT_PROMPT_TEMPLATE(userInput);
    }
    
    // Update the image with start time and prompt
    setImages(prev => prev.map(img => 
      img.id === id ? { 
        ...img, 
        originalPrompt: fullPrompt,
        createdAt: startTime 
      } : img
    ));
    
    try {
        const { imageUrl } = await generateImageFromText(fullPrompt);
        if (!imageUrl) throw new Error("Generation failed, no image returned.");

        const originalImg = new Image();
        originalImg.src = imageUrl;
        originalImageCache.current[id] = originalImg;
      
        const { transparentImage, contentBounds } = await processImageForTransparency(imageUrl);
        const aspectRatio = transparentImage.width / transparentImage.height;
        
        const imageFileForSuggestions = await imageElementToFile(transparentImage, 'suggestion-source.png');
        const suggestions = await getRemixSuggestions(imageFileForSuggestions, REMIX_SUGGESTION_PROMPT);

        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();

        setImages(prev => prev.map(img => {
            if (img.id !== id) return img;

            const newWidth = IMAGE_WIDTH;
            const newHeight = IMAGE_WIDTH / aspectRatio;
            const currentCenterX = img.x + img.width / 2;
            const currentCenterY = img.y + img.height / 2;

            return {
                ...img,
                processedImage: transparentImage,
                originalImageUrl: imageUrl,
                showOriginal: false,
                contentBounds,
                width: newWidth,
                height: newHeight,
                x: currentCenterX - newWidth / 2,
                y: currentCenterY - newHeight / 2,
                isGenerating: false,
                remixSuggestions: suggestions,
                completedAt: endTime,
                generationDuration: duration,
                scale: 1,
            }
        }));
        
        // Create completion badge
        setCompletionBadges(prev => ({
          ...prev,
          [id]: { duration: Math.floor(duration / 1000), timestamp: Date.now() }
        }));
    } catch(e) {
        console.error(e);
        setImages(prev => prev.filter(img => img.id !== id));
    }
  };
  
  const addImageToCanvas = useCallback(async (file: File, customPosition?: { x: number; y: number }) => {
    await ensureAudioContext();
    synth.triggerAttackRelease('C4', '8n');

    const id = nextId.current++;
    const canvas = canvasRef.current;
    const dropX = customPosition?.x ?? (canvas ? canvas.width / 2 : window.innerWidth / 2);
    const dropY = customPosition?.y ?? (canvas ? canvas.height / 2 : window.innerHeight / 2);
    
    const sourcePreviewUrl = URL.createObjectURL(file);
    const previewImage = new Image();
    previewImage.src = sourcePreviewUrl;
    previewImageCache.current[id] = previewImage;
    
    const PLACEHOLDER_WIDTH = 250;

    const newImage: ProcessedImage = {
        id,
        sourceFile: file,
        processedImage: null,
        x: dropX - PLACEHOLDER_WIDTH / 2,
        y: dropY - 100,
        width: PLACEHOLDER_WIDTH,
        height: 200,
        isGenerating: true,
        contentBounds: { x: 0, y: 0, width: PLACEHOLDER_WIDTH, height: 200 },
        sourcePreviewUrl,
        flippedHorizontally: false,
        isVariation: false,
    };
    setImages(prev => [...prev, newImage]);
    generateFromImage(file, id, IMAGE_PROMPT);
  }, [generateFromImage]);


  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((file: File) => file.type.startsWith('image/'));
      
      if (imageFiles.length > 0) {
        // Add dropped images to pending list
        setPendingImages(prev => [...prev, ...imageFiles]);
        setShowPendingArea(true);
      }
    }
  }, []);

  const generateFromMultipleImages = useCallback(async (files: File[], id: number) => {
    const startTime = new Date();
    const defaultPrompt = gameMode === 'building' ? 
      `Analyze these ${files.length} building/structure images and create a single isometric 2D architectural representation combining their key features. ${BUILDING_POSTFIX}` :
      gameMode === 'anime' ?
      `Analyze these ${files.length} images and create a single ultra-detailed anime isometric character combining their key elements. ${ANIME_POSTFIX}` :
      gameMode === 'sticker' ?
      `Analyze these ${files.length} images and create a single 3D perspective sticker design combining all visual elements. ${STICKER_POSTFIX}` :
      gameMode === 'complete' ?
      `Analyze these ${files.length} images and create a complete isometric pixel art scene combining all elements, objects, and details from each image. ${COMPLETE_POSTFIX}` :
      `Analyze these ${files.length} images and create a single 3D pixel art sprite combining their key elements. ${PROMPT_POSTFIX}`;
    
    // Update the image with start time and prompt
    setImages(prev => prev.map(img => 
      img.id === id ? { 
        ...img, 
        originalPrompt: defaultPrompt,
        createdAt: startTime 
      } : img
    ));
    
    try {
      // Use all files to generate a combined image
      const { imageUrl } = await generateImageWithMultiplePrompts(files, defaultPrompt);
      if (!imageUrl) throw new Error("Generation failed, no image returned.");

      const originalImg = new Image();
      originalImg.src = imageUrl;
      originalImageCache.current[id] = originalImg;

      const { transparentImage, contentBounds } = await processImageForTransparency(imageUrl);
      const suggestions = await getRemixSuggestions(files[0], defaultPrompt);
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      setImages(prev => prev.map(img => {
        if (img.id !== id) return img;
        
        const aspectRatio = transparentImage.width / transparentImage.height;
        const newWidth = IMAGE_WIDTH;
        const newHeight = IMAGE_WIDTH / aspectRatio;
        const currentCenterX = img.x + img.width / 2;
        const currentCenterY = img.y + img.height / 2;

        return {
          ...img,
          processedImage: transparentImage,
          originalImageUrl: imageUrl,
          showOriginal: false,
          contentBounds,
          width: newWidth,
          height: newHeight,
          x: currentCenterX - newWidth / 2,
          y: currentCenterY - newHeight / 2,
          isGenerating: false,
          sourcePreviewUrl: undefined,
          remixSuggestions: suggestions,
          generatingPrompt: undefined,
          completedAt: endTime,
          generationDuration: duration,
          justGenerated: true,
          generatedAt: Date.now(),
        }
      }));
      
      // Create completion badge
      setCompletionBadges(prev => ({
        ...prev,
        [id]: { duration: Math.floor(duration / 1000), timestamp: Date.now() }
      }));
    } catch (e) {
      console.error(e);
      setImages(prev => prev.filter(img => img.id !== id));
    }
  }, [gameMode]);

  const handleMultipleImageUpload = async (files: File[]) => {
    await ensureAudioContext();
    synth.triggerAttackRelease('C4', '8n');

    const id = nextId.current++;
    const canvas = canvasRef.current;
    const dropX = canvas ? canvas.width / 2 : window.innerWidth / 2;
    const dropY = canvas ? canvas.height / 2 : window.innerHeight / 2;
    
    // Create preview URLs for all images
    const previewUrls = files.map(file => URL.createObjectURL(file));
    const previewImages = await Promise.all(
      previewUrls.map(url => {
        return new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = url;
        });
      })
    );
    
    // Store the first image as preview
    previewImageCache.current[id] = previewImages[0];
    
    const newImage: ProcessedImage = {
        id,
        sourceFile: files[0], // Store first file as reference
        processedImage: null,
        x: dropX - IMAGE_WIDTH / 2,
        y: dropY - IMAGE_WIDTH / 2,
        width: IMAGE_WIDTH,
        height: IMAGE_WIDTH,
        isGenerating: true,
        contentBounds: { x: 0, y: 0, width: IMAGE_WIDTH, height: IMAGE_WIDTH },
        sourcePreviewUrl: previewUrls[0],
        generatingPrompt: `Combining ${files.length} images...`,
        scale: 1,
    };
    
    setImages(prev => [...prev, newImage]);
    
    // Generate from multiple images
    generateFromMultipleImages(files, id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter((file: File) => file.type.startsWith('image/'));
        
        // Add new images to pending list
        setPendingImages(prev => [...prev, ...imageFiles]);
        setShowPendingArea(true);
        
        e.target.value = '';
    }
  };

  const handleConfirmImages = () => {
    if (pendingImages.length === 1) {
        // Single image - use existing behavior
        addImageToCanvas(pendingImages[0]);
    } else if (pendingImages.length > 1) {
        // Multiple images - create combined asset
        handleMultipleImageUpload(pendingImages);
    }
    
    // Clear pending images
    setPendingImages([]);
    setShowPendingArea(false);
  };

  const handleClearPendingImages = () => {
    setPendingImages([]);
    setShowPendingArea(false);
  };

  const handleRemovePendingImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
    if (pendingImages.length <= 1) {
        setShowPendingArea(false);
    }
  };


  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }
      
      if (imageFiles.length > 0) {
        // Add pasted images to pending list
        setPendingImages(prev => [...prev, ...imageFiles]);
        setShowPendingArea(true);
        event.preventDefault();
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  const getImageAtPosition = (x: number, y: number): ProcessedImage | null => {
    for (let i = images.length - 1; i >= 0; i--) {
      const img = images[i];
      const scale = img.scale || 1;
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      if (x >= img.x && x <= img.x + scaledWidth && y >= img.y && y <= img.y + scaledHeight) {
        // If the image is generating, the whole bounding box is clickable.
        if (img.isGenerating) {
            return img;
        }

        // Otherwise (if it's a finished image), do the transparency check.
        if(img.processedImage && img.contentBounds) {
            const localX = x - img.x;
            const localY = y - img.y;
            
            const scaleX = scaledWidth / img.processedImage.width;
            const scaleY = scaledHeight / img.processedImage.height;
            
            const scaledBounds = {
                x: img.contentBounds.x * scaleX,
                y: img.contentBounds.y * scaleY,
                width: img.contentBounds.width * scaleX,
                height: img.contentBounds.height * scaleY
            };

            if (localX >= scaledBounds.x && localX <= scaledBounds.x + scaledBounds.width &&
                localY >= scaledBounds.y && localY <= scaledBounds.y + scaledBounds.height) {
                return img;
            }
        }
      }
    }
    return null;
  };
  
  const handleInteractionStart = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const x = clientX - (rect?.left ?? 0);
    const y = clientY - (rect?.top ?? 0);
    const targetImage = getImageAtPosition(x, y);

    if (targetImage) {
        setSelectedImageId(targetImage.id);
        setDraggingImage({ id: targetImage.id, offsetX: x - targetImage.x, offsetY: y - targetImage.y });
        setImages(prev => [...prev.filter(img => img.id !== targetImage.id), targetImage]);
    } else {
        setSelectedImageId(null);
    }
  };

  const handleInteractionMove = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const x = clientX - (rect?.left ?? 0);
    const y = clientY - (rect?.top ?? 0);
    
    if (draggingImage) {
      setImages(prev => prev.map(img => img.id === draggingImage.id ? {
        ...img,
        x: x - draggingImage.offsetX,
        y: y - draggingImage.offsetY,
      } : img));
    } else {
        const targetImage = getImageAtPosition(x, y);
        setHoveredImageId(targetImage && !targetImage.isGenerating ? targetImage.id : null);
        if (canvasRef.current) {
            canvasRef.current.style.cursor = targetImage ? 'grab' : 'default';
        }
    }
  };

  const handleInteractionEnd = () => {
    if (canvasRef.current && draggingImage) {
        canvasRef.current.style.cursor = 'grab';
    }
    setDraggingImage(null);
  };
  
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => handleInteractionStart(e.clientX, e.clientY);
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => handleInteractionMove(e.clientX, e.clientY);
  const handleMouseUp = () => handleInteractionEnd();
  
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length > 0) {
          e.preventDefault();
          handleInteractionStart(e.touches[0].clientX, e.touches[0].clientY);
      }
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (e.touches.length > 0) {
          e.preventDefault();
          handleInteractionMove(e.touches[0].clientX, e.touches[0].clientY);
      }
  };
  const handleTouchEnd = () => handleInteractionEnd();

  const handleTextSubmit = async (e: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const trimmedInput = textInput.trim();
    if (trimmedInput === '') return;
    
    await ensureAudioContext();
    synth.triggerAttackRelease('C4', '8n');

    const id = nextId.current++;
    const canvas = canvasRef.current;
    const dropX = canvas ? canvas.width / 2 : window.innerWidth / 2;
    const dropY = canvas ? canvas.height / 2 : window.innerHeight / 2;
    const PLACEHOLDER_WIDTH = 250;

    const newImage: ProcessedImage = {
        id,
        sourceText: trimmedInput,
        processedImage: null,
        x: dropX - PLACEHOLDER_WIDTH / 2,
        y: dropY - PLACEHOLDER_WIDTH / 2,
        width: PLACEHOLDER_WIDTH,
        height: PLACEHOLDER_WIDTH,
        isGenerating: true,
        contentBounds: { x: 0, y: 0, width: PLACEHOLDER_WIDTH, height: PLACEHOLDER_WIDTH },
        flippedHorizontally: false,
        isVariation: false,
    };

    setImages(prev => [...prev, newImage]);
    generateFromText(trimmedInput, id);
    setTextInput('');
  };

  const handleDeleteSelected = async () => {
    if (isActionDisabled) return;
    await ensureAudioContext();
    synth.triggerAttackRelease('A4', '8n');
    setImages(prev => prev.filter(img => img.id !== selectedImageId));
    setSelectedImageId(null);
  };

  const handleRegenerateSelected = () => {
      if (isActionDisabled) return;
      const imageToRegen = images.find(img => img.id === selectedImageId);
      if(imageToRegen) {
          setImages(prev => prev.map(img => img.id === selectedImageId ? {...img, isGenerating: true, generatingPrompt: undefined } : img));
          
          if (imageToRegen.sourceFile) {
              generateFromImage(imageToRegen.sourceFile, imageToRegen.id, IMAGE_PROMPT);
          } else if (imageToRegen.sourceText) {
              generateFromText(imageToRegen.sourceText, imageToRegen.id);
          }
      }
  };

  const handleFlipSelected = async () => {
    if (isActionDisabled) return;
    const imageToFlip = images.find(img => img.id === selectedImageId);
    if (imageToFlip) {
        await ensureAudioContext();
        synth.triggerAttackRelease('G5', '8n');
        setImages(prev => prev.map(img =>
            img.id === selectedImageId
                ? { ...img, flippedHorizontally: !img.flippedHorizontally }
                : img
        ));
    }
  };
  
  const handleDuplicateSelected = async () => {
    if (isActionDisabled) return;
    const imageToDuplicate = images.find(img => img.id === selectedImageId);
    if (imageToDuplicate) {
        await ensureAudioContext();
        synth.triggerAttackRelease('C4', '8n');

        const newId = nextId.current++;
        const duplicatedImage: ProcessedImage = {
            ...imageToDuplicate,
            id: newId,
            x: imageToDuplicate.x + 40,
            y: imageToDuplicate.y + 20,
        };
        
        // Also duplicate the entry in the original image cache
        const originalImage = originalImageCache.current[imageToDuplicate.id];
        if (originalImage) {
            originalImageCache.current[newId] = originalImage;
        }

        setImages(prev => [...prev, duplicatedImage]);
        setSelectedImageId(newId);
    }
  };

  const handleRemixSubmit = async (prompt: string) => {
    if (isActionDisabled) return;
    const imageToRemix = images.find(img => img.id === selectedImageId);

    if (imageToRemix && imageToRemix.processedImage) {
        await ensureAudioContext();
        synth.triggerAttackRelease('E4', '8n');

        const newId = nextId.current++;
        
        const sourceFileForRemix = await imageElementToFile(imageToRemix.processedImage, `remix_of_${imageToRemix.id}.png`);

        const newImage: ProcessedImage = {
            id: newId,
            sourceFile: sourceFileForRemix,
            processedImage: imageToRemix.processedImage, // Show previous image while loading
            x: imageToRemix.x + 40,
            y: imageToRemix.y + 20,
            width: imageToRemix.width,
            height: imageToRemix.height,
            isGenerating: true,
            contentBounds: { x: 0, y: 0, width: imageToRemix.width, height: imageToRemix.height },
            flippedHorizontally: imageToRemix.flippedHorizontally,
            isVariation: true,
            generatingPrompt: prompt,
        };
        setImages(prev => [...prev, newImage]);
        setSelectedImageId(newId);

        const remixPrompt = REMIX_PROMPT_TEMPLATE(prompt);
        generateFromImage(sourceFileForRemix, newId, remixPrompt);
    }
};

const handleRemixKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const trimmedInput = remixInput.trim();
        if (trimmedInput) {
            handleRemixSubmit(trimmedInput);
            setRemixInput('');
        }
    }
};

const handleConvertTo3D = async () => {
    if (isActionDisabled || !selectedImage?.processedImage) return;
    
    try {
        await ensureAudioContext();
        synth.triggerAttackRelease('A4', '8n');
        
        // Mark as generating 3D model
        setImages(prev => prev.map(img => 
            img.id === selectedImageId 
                ? { ...img, model3D: { meshUrl: '', isGenerating: true } }
                : img
        ));
        
        // Debug logging
        console.log('🎯 Starting 3D conversion with model:', selectedModelType);
        
        // Convert image to 3D
        const result = await convertImageElementTo3D(
            selectedImage.processedImage,
            `asset_${selectedImage.id}.png`,
            selectedModelType,
            { textured_mesh: true }
        );
        
        console.log('✅ 3D conversion completed:', {
            modelType: result.modelType,
            dataKeys: Object.keys(result.data)
        });
        
        // Update with 3D model data based on model type
        const model3DData: any = {
            isGenerating: false,
            modelType: result.modelType
        };
        
        // Handle different output formats based on model type
        if (result.modelType === 'hunyuan-normal') {
            const data = result.data as any;
            model3DData.glbUrl = data.model_glb?.url;
            model3DData.pbrUrl = data.model_glb_pbr?.url;
            model3DData.meshUrl = data.model_mesh?.url || data.model_glb?.url;
        } else {
            // For hunyuan-turbo and trellis
            const data = result.data as any;
            model3DData.meshUrl = data.model_mesh?.url;
            if (result.modelType === 'hunyuan-turbo') {
                model3DData.glbUrl = data.model_mesh?.url;
            }
        }
        
        setImages(prev => prev.map(img => 
            img.id === selectedImageId 
                ? { 
                    ...img, 
                    model3D: model3DData
                }
                : img
        ));
        
        // Play success sound
        await ensureAudioContext();
        synth.triggerAttackRelease('C6', '8n');
        
    } catch (error) {
        console.error('Error converting to 3D:', error);
        
        // Update with error
        setImages(prev => prev.map(img => 
            img.id === selectedImageId 
                ? { 
                    ...img, 
                    model3D: {
                        meshUrl: '',
                        isGenerating: false,
                        error: error instanceof Error ? error.message : 'Error desconocido'
                    }
                }
                : img
        ));
        
        // Play error sound
        await ensureAudioContext();
        synth.triggerAttackRelease('F3', '8n');
    }
};

const handleView3D = () => {
    if (selectedImage?.model3D?.meshUrl) {
        setSelected3DModel({
            meshUrl: selectedImage.model3D.meshUrl,
            glbUrl: selectedImage.model3D.glbUrl,
            pbrUrl: selectedImage.model3D.pbrUrl,
            modelType: selectedImage.model3D.modelType
        });
        setShow3DViewer(true);
    }
};

const handleDownload3D = (format?: 'glb' | 'pbr' | 'mesh') => {
    if (!selectedImage?.model3D) return;
    
    let url: string | undefined;
    let fileName: string;
    
    // If no format specified, use the best available format
    if (!format) {
        if (selectedImage.model3D.glbUrl) {
            url = selectedImage.model3D.glbUrl;
            fileName = `asset_${selectedImage.id}.glb`;
        } else {
            url = selectedImage.model3D.meshUrl;
            fileName = `asset_${selectedImage.id}.glb`;
        }
    } else {
        switch (format) {
            case 'glb':
                url = selectedImage.model3D.glbUrl || selectedImage.model3D.meshUrl;
                fileName = `asset_${selectedImage.id}.glb`;
                break;
            case 'pbr':
                url = selectedImage.model3D.pbrUrl;
                fileName = `asset_${selectedImage.id}_pbr.glb`;
                break;
            case 'mesh':
                url = selectedImage.model3D.meshUrl;
                fileName = `asset_${selectedImage.id}_mesh.glb`;
                break;
        }
    }
    
    if (url) {
        downloadFile(url, fileName);
    }
};

const handleConvertToVideo = async (prompt: string) => {
    if (!selectedImage?.processedImage || !prompt.trim()) return;
    
    try {
        await ensureAudioContext();
        synth.triggerAttackRelease('B4', '8n');
        
        // Debug logging
        console.log('🎬 Starting video conversion with prompt:', prompt);
        
        // Mark as generating video
        setImages(prev => prev.map(img => 
            img.id === selectedImageId 
                ? { ...img, video: { videoUrl: '', isGenerating: true, prompt, modelType: selectedVideoModelType } }
                : img
        ));
        
        // Convert image to video
        const result = await convertImageElementToVideo(
            selectedImage.processedImage,
            prompt,
            `asset_${selectedImage.id}.png`,
            selectedVideoModelType
        );
        
        console.log('✅ Video conversion completed:', {
            videoUrl: result.data.video.url,
            prompt
        });
        
        // Update with video data
        setImages(prev => prev.map(img => 
            img.id === selectedImageId 
                ? { 
                    ...img, 
                    video: {
                        videoUrl: result.data.video.url,
                        isGenerating: false,
                        prompt,
                        modelType: selectedVideoModelType
                    }
                }
                : img
        ));
        
        // Play success sound
        await ensureAudioContext();
        synth.triggerAttackRelease('D6', '8n');
        
    } catch (error) {
        console.error('Error converting to video:', error);
        
        // Update with error
        setImages(prev => prev.map(img => 
            img.id === selectedImageId 
                ? { 
                    ...img, 
                    video: {
                        videoUrl: '',
                        isGenerating: false,
                        error: error instanceof Error ? error.message : 'Error desconocido',
                        prompt,
                        modelType: selectedVideoModelType
                    }
                }
                : img
        ));
        
        // Play error sound
        await ensureAudioContext();
        synth.triggerAttackRelease('F3', '8n');
    }
};

const handleViewVideo = () => {
    if (selectedImage?.video?.videoUrl) {
        setSelectedVideo({
            videoUrl: selectedImage.video.videoUrl,
            prompt: selectedImage.video.prompt
        });
        setShowVideoViewer(true);
    }
};

const handleDownloadVideo = () => {
    if (!selectedImage?.video?.videoUrl) return;
    
    const url = selectedImage.video.videoUrl;
    const fileName = `asset_${selectedImage.id}_video.mp4`;
    
    downloadFile(url, fileName);
};

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
            return;
        }

        if (e.key === 'm' && selectedImageId !== null) {
            e.preventDefault();
            setImages(prev => prev.map(img =>
                img.id === selectedImageId && img.originalImageUrl
                    ? { ...img, showOriginal: !img.showOriginal }
                    : img
            ));
            return;
        }

        if (selectedImageId === null || isActionDisabled) return;

        // --- MOVEMENT LOGIC ---
        const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (arrowKeys.includes(e.key)) {
            const selectedImg = images.find(img => img.id === selectedImageId);
            if (!selectedImg) return;
            
            e.preventDefault();

            (async () => {
                await ensureAudioContext();
                synth.triggerAttackRelease('G4', '8n');
            })();

            let newX = selectedImg.x;
            let newY = selectedImg.y;

            switch (e.key) {
                case 'ArrowUp':    newY -= MOVE_AMOUNT; break;
                case 'ArrowDown':  newY += MOVE_AMOUNT; break;
                case 'ArrowLeft':  newX -= MOVE_AMOUNT; break;
                case 'ArrowRight': newX += MOVE_AMOUNT; break;
            }
            
            setImages(prev => prev.map(img => 
                img.id === selectedImageId ? { ...img, x: newX, y: newY } : img
            ));
            return;
        }
        
        // --- OTHER ACTIONS ---
        switch (e.key) {
            case 'Delete':
            case 'Backspace':
                handleDeleteSelected();
                break;
            case 'r':
                handleRegenerateSelected();
                break;
            case 'f':
                handleFlipSelected();
                break;
            case 'd':
                handleDuplicateSelected();
                break;
            default:
                break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImageId, images, isActionDisabled, remixInput, selectedImage]);


  const handleResetCanvas = () => {
    setImages([]);
    setShowResetConfirm(false);
  };

  const handleDownloadCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'banana-world.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const handleDownloadAllAssets = async () => {
    const assetsToDownload = images.filter(img => img.processedImage && !img.isGenerating);
    
    if (assetsToDownload.length === 0) return;
    
    // Download each asset individually
    for (let i = 0; i < assetsToDownload.length; i++) {
      const img = assetsToDownload[i];
      
      // Create a canvas for this specific asset
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx || !img.processedImage) continue;
      
      const downloadScale = 3; // Same scale as individual downloads
      canvas.width = img.processedImage.width * downloadScale;
      canvas.height = img.processedImage.height * downloadScale;
      
      ctx.imageSmoothingEnabled = false;
      
      if (img.flippedHorizontally) {
        ctx.save();
        ctx.scale(-downloadScale, downloadScale);
        ctx.drawImage(img.processedImage, -img.processedImage.width, 0);
        ctx.restore();
      } else {
        ctx.drawImage(img.processedImage, 0, 0, img.processedImage.width, img.processedImage.height, 0, 0, canvas.width, canvas.height);
      }
      
      // Generate filename
      let filename = `banana-world-asset-${i + 1}`;
      if (img.sourceText) {
        filename = `banana-world-${img.sourceText.replace(/[^a-zA-Z0-9]/g, '-')}`;
      } else if (img.sourceFile) {
        const originalName = img.sourceFile.name.split('.')[0];
        filename = `banana-world-${originalName}`;
      }
      
      // Download with a small delay to avoid browser blocking
      await new Promise(resolve => {
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(undefined);
            return;
          }
          
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${filename}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          // Small delay between downloads
          setTimeout(resolve, 200);
        }, 'image/png');
      });
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = (import.meta.env as any).VITE_APP_PASSWORD || 'free420';
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPasswordInput('');
    }
  };

  const handleDownloadAsset = (image: ProcessedImage | null) => {
    if (!image || !image.processedImage) return;
    
    // Create a canvas to draw the processed image at higher resolution
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = image.processedImage;
    const downloadScale = 3; // Make downloads 3x larger
    canvas.width = img.width * downloadScale;
    canvas.height = img.height * downloadScale;
    
    // Use high-quality scaling
    ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
    
    // Draw the image (it's already transparent)
    if (image.flippedHorizontally) {
      ctx.save();
      ctx.scale(-downloadScale, downloadScale);
      ctx.drawImage(img, -img.width, 0);
      ctx.restore();
    } else {
      ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
    }
    
    // Create download link
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename based on source
      let filename = 'banana-world-asset';
      if (image.sourceText) {
        filename = `banana-world-${image.sourceText.replace(/[^a-zA-Z0-9]/g, '-')}`;
      } else if (image.sourceFile) {
        const originalName = image.sourceFile.name.split('.')[0];
        filename = `banana-world-${originalName}`;
      }
      
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handleScaleChange = (imageId: number, newScale: ScaleValue) => {
    setImages(prev => prev.map(img => 
      img.id === imageId ? { ...img, scale: newScale } : img
    ));
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-yellow-100 to-orange-200 flex items-center justify-center">
        <div className="bg-white p-8 border-2 border-black shadow-2xl max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-black mb-2">🍌 BANANA WORLD</h1>
            <p className="text-gray-600 font-mono text-sm">Acceso Restringido</p>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
                Contraseña:
              </label>
              <input
                type="password"
                id="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className={`w-full px-4 py-3 border-2 ${passwordError ? 'border-red-500' : 'border-black'} bg-white text-black font-mono focus:outline-none focus:border-yellow-500 transition-colors`}
                placeholder="Ingresa la contraseña"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-2 font-mono">❌ Contraseña incorrecta</p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full bg-black text-white py-3 px-4 font-mono text-sm hover:bg-gray-800 transition-colors border-2 border-black"
            >
              ENTRAR
            </button>
          </form>
          
          <div className="text-center mt-6 text-xs text-gray-500 font-mono">
            v0.1 - Powered by Gemini 2.5 Flash
          </div>
        </div>
      </div>
    );
  }


  return (
    <>
      {/* Pending Images Area */}
      {showPendingArea && pendingImages.length > 0 && (
        <div className="fixed bottom-4 left-4 bg-white border-2 border-black shadow-lg z-50 max-w-sm">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold font-mono">Imágenes seleccionadas ({pendingImages.length})</h3>
              <button
                onClick={handleClearPendingImages}
                className="text-xs text-gray-500 hover:text-black"
                aria-label="Clear all"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-3 max-h-32 overflow-y-auto">
              {pendingImages.map((file, index) => {
                const previewUrl = URL.createObjectURL(file);
                return (
                  <div key={index} className="relative group">
                    <img
                      src={previewUrl}
                      alt={`Preview ${index + 1}`}
                      className="w-16 h-16 object-cover border border-gray-300"
                      onLoad={() => URL.revokeObjectURL(previewUrl)}
                    />
                    <button
                      onClick={() => handleRemovePendingImage(index)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      aria-label="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleConfirmImages}
                className="flex-1 bg-black text-white py-2 px-3 text-xs font-mono hover:bg-gray-800 transition-colors"
              >
                {pendingImages.length === 1 ? 'Generar' : `Combinar ${pendingImages.length} imágenes`}
              </button>
              <button
                onClick={handleClearPendingImages}
                className="px-3 py-2 border border-black text-black text-xs font-mono hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="w-screen h-screen bg-white"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        />
        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*"
            multiple
        />
        {/* Header para desktop */}
        <div className="absolute top-4 left-4 md:flex hidden items-center gap-6 pointer-events-none">
            <div className="flex items-center gap-2">
                <span className="text-lg text-black font-bold">BANANA WORLD v0.3 By</span>
                <button 
                    onClick={() => window.open('https://carlosfr.es/projects', '_blank')}
                    className="pointer-events-auto px-2 py-1 text-lg text-white bg-black hover:bg-gray-800 transition-colors cursor-pointer font-bold rounded border border-gray-700 shadow-sm"
                >
                    carlosfr.es
                </button>
            </div>
            <div className="relative pointer-events-auto mode-selector">
                <button 
                    onClick={() => setShowModeSelector(!showModeSelector)}
                    className="flex items-center gap-2 px-3 py-1 border border-black bg-white/90 text-black text-sm font-mono hover:bg-gray-100 transition-colors"
                >
                    <span>{GAME_MODES[gameMode].icon}</span>
                    <span>{GAME_MODES[gameMode].name}</span>
                    <span className="text-xs">▼</span>
                </button>
                {showModeSelector && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-black shadow-lg z-50 min-w-full">
                        {Object.entries(GAME_MODES).map(([mode, config]) => (
                            <button
                                key={mode}
                                onClick={() => {
                                    setGameMode(mode as GameMode);
                                    setShowModeSelector(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm font-mono hover:bg-gray-100 transition-colors flex items-center gap-2 ${
                                    gameMode === mode ? 'bg-gray-100' : ''
                                }`}
                            >
                                <span>{config.icon}</span>
                                <div>
                                    <div className="font-bold">{config.name}</div>
                                    <div className="text-xs text-gray-600">{config.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button 
                onClick={() => setShowHelpModal(true)}
                className="pointer-events-auto w-6 h-6 flex items-center justify-center border border-black rounded-full text-black bg-white/80 hover:bg-white transition-colors text-sm"
                aria-label="Show help"
            >
                ?
            </button>
        </div>

        {/* Header para móvil */}
        <div className="absolute top-4 left-4 md:hidden flex items-center gap-2 pointer-events-none">
            <div className="flex items-center gap-1">
                <span className="text-base text-black font-bold">BANANA WORLD v0.3 By</span>
                <button 
                    onClick={() => window.open('https://carlosfr.es/projects', '_blank')}
                    className="pointer-events-auto px-2 py-1 text-sm text-white bg-black hover:bg-gray-800 transition-colors cursor-pointer font-bold rounded border border-gray-700 shadow-sm"
                >
                    carlosfr.es
                </button>
            </div>
        </div>

        {/* Controles móvil - segunda fila derecha */}
        <div className="absolute top-16 right-4 md:hidden flex items-center gap-2 pointer-events-none">
            <div className="relative pointer-events-auto mode-selector">
                <button 
                    onClick={() => setShowModeSelector(!showModeSelector)}
                    className="flex items-center gap-2 px-3 py-2 border border-black bg-white/90 text-black text-sm font-mono hover:bg-gray-100 transition-colors rounded min-h-[44px]"
                >
                    <span className="text-base">{GAME_MODES[gameMode].icon}</span>
                    <span>{GAME_MODES[gameMode].name}</span>
                    <span className="text-xs">▼</span>
                </button>
                {showModeSelector && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-black shadow-lg z-50 min-w-full">
                        {Object.entries(GAME_MODES).map(([mode, config]) => (
                            <button
                                key={mode}
                                onClick={() => {
                                    setGameMode(mode as GameMode);
                                    setShowModeSelector(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm font-mono hover:bg-gray-100 transition-colors flex items-center gap-2 ${
                                    gameMode === mode ? 'bg-gray-100' : ''
                                }`}
                            >
                                <span>{config.icon}</span>
                                <div>
                                    <div className="font-bold">{config.name}</div>
                                    <div className="text-xs text-gray-600">{config.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button 
                onClick={() => setShowHelpModal(true)}
                className="pointer-events-auto w-10 h-10 flex items-center justify-center border border-black rounded-full text-black bg-white/80 hover:bg-white transition-colors text-base font-bold"
                aria-label="Show help"
            >
                ?
            </button>
        </div>


        {showResetConfirm && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-8 border border-black shadow-lg flex flex-col items-center gap-4">
                    <p className="text-lg font-mono text-black">Reset world?</p>
                    <div className="flex gap-4">
                        <button onClick={handleResetCanvas} className="px-4 py-2 border border-black bg-black text-white font-mono text-sm hover:bg-neutral-800 transition-colors">Confirm</button>
                        <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 border border-black bg-white text-black font-mono text-sm transition-colors">Cancel</button>
                    </div>
                </div>
            </div>
        )}

        {showHelpModal && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowHelpModal(false)}>
                <div className="bg-white p-6 border border-black shadow-lg font-mono text-black text-sm flex flex-col gap-4 max-w-sm">
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                        <span className="font-bold text-right">R:</span><span>Regenerate</span>
                        <span className="font-bold text-right">F:</span><span>Flip</span>
                        <span className="font-bold text-right">D:</span><span>Duplicate</span>
                        <span className="font-bold text-right">M:</span><span>Show unmasked image</span>
                        <span className="font-bold text-right">Backspace:</span><span>Delete</span>
                        <span className="font-bold text-right">Arrow keys:</span><span>Move object</span>
                    </div>
                    <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
                        Built with Gemini 2.5 Flash image (nano-banana)
                    </div>
                </div>
            </div>
        )}

        {showInfoModal && selectedImage && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowInfoModal(false)}>
                <div className="bg-white p-6 border border-black shadow-lg font-mono text-black text-sm flex flex-col gap-4 max-w-md" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <h3 className="font-bold text-lg">Información del Asset</h3>
                        <button 
                            onClick={() => setShowInfoModal(false)}
                            className="text-gray-500 hover:text-black transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {selectedImage.originalPrompt && (
                            <div>
                                <span className="font-bold text-gray-700">Prompt:</span>
                                <p className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded text-xs break-words">
                                    {selectedImage.originalPrompt}
                                </p>
                            </div>
                        )}
                        
                        {selectedImage.createdAt && (
                            <div>
                                <span className="font-bold text-gray-700">Creado:</span>
                                <p className="mt-1">
                                    {selectedImage.createdAt.toLocaleDateString('es-ES')} a las {selectedImage.createdAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        )}
                        
                        {selectedImage.generationDuration && (
                            <div>
                                <span className="font-bold text-gray-700">Tiempo de generación:</span>
                                <p className="mt-1">
                                    {(selectedImage.generationDuration / 1000).toFixed(1)} segundos
                                </p>
                            </div>
                        )}
                        
                        {selectedImage.sourceText && (
                            <div>
                                <span className="font-bold text-gray-700">Tipo:</span>
                                <p className="mt-1">Generado desde texto</p>
                            </div>
                        )}
                        
                        {selectedImage.sourceFile && (
                            <div>
                                <span className="font-bold text-gray-700">Tipo:</span>
                                <p className="mt-1">Generado desde imagen</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {selectedImage && !selectedImage.isGenerating && (
            <div
                className="absolute flex flex-col items-center gap-2"
                style={{
                    top: `${selectedImage.y + (selectedImage.height * (selectedImage.scale || 1)) / 2 + (Math.min(selectedImage.width * (selectedImage.scale || 1), selectedImage.height * (selectedImage.scale || 1)) / 2 * 0.8) + 15}px`,
                    left: `${selectedImage.x + (selectedImage.width * (selectedImage.scale || 1)) / 2}px`,
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                }}
            >
                <div className="flex flex-nowrap bg-white border border-black">
                    <button
                        onClick={handleRegenerateSelected}
                        disabled={isActionDisabled}
                        className="h-10 w-10 p-2 box-border text-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors hover:bg-gray-100 border-r border-black"
                        aria-label="Regenerate selected object"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 2v6h6"/>
                            <path d="M21 12A9 9 0 0 0 6 5.3L3 8"/>
                            <path d="M21 22v-6h-6"/>
                            <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/>
                        </svg>
                    </button>
                    <button
                        onClick={handleFlipSelected}
                        disabled={isActionDisabled}
                        className="h-10 w-10 p-2 box-border text-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors hover:bg-gray-100 border-r border-black"
                        aria-label="Flip selected object"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 7 5 5-5 5V7"/><path d="m21 7-5 5 5 5V7"/><path d="M12 20v-2M12 16v-2M12 12V3"/></svg>
                    </button>
                    <button
                        onClick={handleDuplicateSelected}
                        disabled={isActionDisabled}
                        className="h-10 w-10 p-2 box-border text-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors hover:bg-gray-100 border-r border-black"
                        aria-label="Duplicate selected object"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <button
                        onClick={() => setShowInfoModal(true)}
                        disabled={isActionDisabled}
                        className="h-10 w-10 p-2 box-border text-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors hover:bg-gray-100 border-r border-black"
                        aria-label="Show asset information"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M8 15s1.5 2 4 2 4-2 4-2"/></svg>
                    </button>
                    <button
                        onClick={() => handleDownloadAsset(selectedImage)}
                        disabled={isActionDisabled}
                        className="h-10 w-10 p-2 box-border text-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors hover:bg-gray-100 border-r border-black"
                        aria-label="Download asset as PNG"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </button>
                    <button
                        onClick={selectedImage.model3D?.meshUrl ? handleView3D : () => setShow3DModelSelector(true)}
                        disabled={isActionDisabled || selectedImage.model3D?.isGenerating}
                        className="h-10 w-10 p-2 box-border text-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors hover:bg-gray-100 border-r border-black relative"
                        aria-label={selectedImage.model3D?.meshUrl ? "View 3D model" : "Select 3D model"}
                    >
                        {selectedImage.model3D?.isGenerating ? (
                            <div className="animate-spin">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-1 0v2.25a.75.75 0 0 1-1.5 0V3a9 9 0 1 0 9 9h-2.25a.75.75 0 0 1 0-1.5H21Z"/></svg>
                            </div>
                        ) : selectedImage.model3D?.meshUrl ? (
                            <span className="text-xs font-bold">👁️</span>
                        ) : (
                            <span className="text-xs font-bold">3D</span>
                        )}
                        {selectedImage.model3D?.error && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" title={selectedImage.model3D.error}></div>
                        )}
                    </button>
                    <button
                        onClick={selectedImage.video?.videoUrl ? handleViewVideo : () => setShowVideoModelSelector(true)}
                        disabled={isActionDisabled || selectedImage.video?.isGenerating}
                        className="h-10 w-10 p-2 box-border text-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors hover:bg-gray-100 border-r border-black relative"
                        aria-label={selectedImage.video?.videoUrl ? "View video" : "Create video"}
                    >
                        {selectedImage.video?.isGenerating ? (
                            <div className="animate-spin">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-1 0v2.25a.75.75 0 0 1-1.5 0V3a9 9 0 1 0 9 9h-2.25a.75.75 0 0 1 0-1.5H21Z"/></svg>
                            </div>
                        ) : selectedImage.video?.videoUrl ? (
                            <span className="text-xs font-bold">▶️</span>
                        ) : (
                            <span className="text-xs font-bold">🎬</span>
                        )}
                        {selectedImage.video?.error && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" title={selectedImage.video.error}></div>
                        )}
                    </button>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={isActionDisabled}
                        className="h-10 w-10 p-2 box-border text-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors hover:bg-gray-100"
                        aria-label="Delete selected object"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>

                <div className="flex flex-col items-start">
                    <div className="w-80 relative">
                         <input
                            ref={remixInputRef}
                            type="text"
                            value={remixInput}
                            onChange={(e) => setRemixInput(e.target.value)}
                            onKeyDown={handleRemixKeyDown}
                            placeholder="Remix this ..."
                            className="w-full h-10 box-border px-3 py-2 border border-black bg-white text-black text-sm placeholder-neutral-600 focus:outline-none"
                        />
                    </div>
                    
                    {/* Scale Slider */}
                    <div className="w-80 mt-2 p-3 bg-white border border-black">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono text-black">Tamaño: {selectedImage.scale || 1}x</span>
                        </div>
                        <div className="relative">
                            <input
                                type="range"
                                min="0"
                                max="3"
                                step="1"
                                value={SCALE_OPTIONS.indexOf((selectedImage.scale || 1) as ScaleValue)}
                                onChange={(e) => {
                                    const scaleIndex = parseInt(e.target.value);
                                    const newScale = SCALE_OPTIONS[scaleIndex];
                                    handleScaleChange(selectedImage.id, newScale);
                                }}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                style={{
                                    background: `linear-gradient(to right, #000 0%, #000 ${(SCALE_OPTIONS.indexOf((selectedImage.scale || 1) as ScaleValue) / 3) * 100}%, #e5e5e5 ${(SCALE_OPTIONS.indexOf((selectedImage.scale || 1) as ScaleValue) / 3) * 100}%, #e5e5e5 100%)`
                                }}
                            />
                            <div className="flex justify-between text-xs font-mono text-gray-600 mt-1">
                                {SCALE_OPTIONS.map(scale => (
                                    <span key={scale}>{scale}x</span>
                                ))}
                            </div>
                        </div>
                    </div>
                    {selectedImage.remixSuggestions && selectedImage.remixSuggestions.length > 0 && (
                        <button
                            onClick={() => {
                                const suggestion = selectedImage.remixSuggestions?.[suggestionIndex];
                                if (suggestion) handleRemixSubmit(suggestion);
                            }}
                            className="w-auto max-w-full text-xs text-left text-gray-600 hover:text-black transition-all duration-300 ease-in-out cursor-pointer p-2 bg-white/90 border border-black -mt-px"
                            title="Click to try this suggestion"
                        >
                            💡 {selectedImage.remixSuggestions[suggestionIndex]}
                        </button>
                    )}
                </div>
            </div>
        )}
       
        <div className="absolute bottom-4 left-4 right-4 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
            {/* Top Row (Mobile) / Left Side (Desktop) */}
            <div className="w-full md:max-w-lg flex items-center gap-2">
                <div className="w-full flex-grow relative">
                    <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleTextSubmit(e);
                            }
                        }}
                        placeholder={gameMode === 'building' ? 'Crear edificio (ej: casa, torre, castillo)...' : 
                                   gameMode === 'anime' ? 'Crear personaje anime (ej: ninja, mago, samurai)...' :
                                   gameMode === 'sticker' ? 'Crear pegatina 3D (ej: logo, marca, diseño)...' :
                                   gameMode === 'complete' ? 'Crear escena completa (ej: paisaje, ciudad, bosque)...' : 'Create anything ...'}
                        className="w-full h-12 box-border pl-4 pr-12 py-3 border border-black bg-white/80 text-black text-sm placeholder-neutral-600 focus:outline-none"
                        aria-label="Prompt input"
                    />
                    <button
                        type="button"
                        onClick={handleTextSubmit}
                        className="absolute right-3 p-1 text-black transition-transform hover:scale-110 top-1/2 -translate-y-1/2"
                        aria-label="Submit prompt"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-12 w-12 p-3 box-border border border-black bg-white/80 text-black flex-shrink-0 transition-colors hover:bg-gray-100 flex items-center justify-center"
                    aria-label="Upload image(s)"
                    title="Upload single or multiple images"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                </button>
            </div>

            {/* Bottom Row (Mobile) / Right Side (Desktop) */}
            <div className="flex flex-nowrap justify-center md:justify-end gap-2 overflow-x-auto">
                {(() => {
                  const availableAssets = images.filter(img => img.processedImage && !img.isGenerating).length;
                  return availableAssets > 0 ? (
                    <button 
                        onClick={handleDownloadAllAssets}
                        className="h-12 box-border flex-shrink-0 px-4 py-3 border border-black bg-green-500 text-white text-sm flex items-center justify-center gap-1 transition-colors hover:bg-green-600 relative"
                        aria-label={`Download all ${availableAssets} assets`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7,10 12,15 17,10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        All Assets
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                            {availableAssets}
                        </span>
                    </button>
                  ) : null;
                })()}
                <button 
                    onClick={() => setShowResetConfirm(true)} 
                    className="h-12 box-border flex-shrink-0 px-4 py-3 border border-black bg-white/80 text-black text-sm flex items-center justify-center gap-1 transition-colors hover:bg-gray-100"
                    aria-label="Reset canvas"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    Reset
                </button>
                <button
                    onClick={handleDownloadCanvas}
                    className="h-12 box-border flex-shrink-0 px-4 py-3 border border-black bg-white/80 text-black text-sm flex items-center justify-center gap-1 transition-colors hover:bg-gray-100"
                    aria-label="Download canvas"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Save
                </button>
            </div>
        </div>

        {/* 3D Model Selector Modal */}
        {show3DModelSelector && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShow3DModelSelector(false)}>
                <div className="bg-white border border-black shadow-lg max-w-md w-full mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-black">
                        <h3 className="font-mono text-lg font-bold text-black">Seleccionar Modelo 3D</h3>
                        <button 
                            onClick={() => setShow3DModelSelector(false)}
                            className="text-gray-500 hover:text-black transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    
                    {/* Model Options */}
                    <div className="p-4 space-y-3">
                        {Object.entries(MODEL_3D_OPTIONS).map(([key, model]) => (
                            <button
                                key={key}
                                onClick={() => {
                                    setSelectedModelType(key as Model3DType);
                                    setShow3DModelSelector(false);
                                    handleConvertTo3D();
                                }}
                                className={`w-full p-4 border border-black text-left hover:bg-gray-50 transition-colors ${
                                    selectedModelType === key ? 'bg-gray-100' : 'bg-white'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{model.icon}</span>
                                    <div className="flex-1">
                                        <div className="font-bold text-black">{model.name}</div>
                                        <div className="text-sm text-gray-600 mt-1">{model.description}</div>
                                        <div className="flex gap-4 mt-2 text-xs">
                                            <span className="text-blue-600">Velocidad: {model.speed}</span>
                                            <span className="text-green-600">Calidad: {model.quality}</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    
                    {/* Current Selection */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <p className="text-xs font-mono text-gray-600 text-center">
                            Modelo actual: <span className="font-bold">{MODEL_3D_OPTIONS[selectedModelType].name}</span>
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Video Model Selector Modal */}
        {showVideoModelSelector && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowVideoModelSelector(false)}>
                <div className="bg-white border border-black shadow-lg max-w-md w-full mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-black">
                        <h3 className="font-mono text-lg font-bold text-black">Seleccionar Modelo de Video</h3>
                        <button 
                            onClick={() => setShowVideoModelSelector(false)}
                            className="text-gray-500 hover:text-black transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    
                    {/* Model Options */}
                    <div className="p-4 space-y-3">
                        {Object.entries(VIDEO_MODEL_OPTIONS).map(([key, model]) => (
                            <button
                                key={key}
                                onClick={() => {
                                    setSelectedVideoModelType(key as VideoModelType);
                                    setShowVideoModelSelector(false);
                                    setShowVideoPrompt(true);
                                }}
                                className={`w-full p-4 border border-black text-left hover:bg-gray-50 transition-colors ${
                                    selectedVideoModelType === key ? 'bg-gray-100' : 'bg-white'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{model.icon}</span>
                                    <div className="flex-1">
                                        <div className="font-bold text-black">{model.name}</div>
                                        <div className="text-sm text-gray-600 mt-1">{model.description}</div>
                                        <div className="flex gap-4 mt-2 text-xs">
                                            <span className="text-blue-600">Velocidad: {model.speed}</span>
                                            <span className="text-green-600">Calidad: {model.quality}</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    
                    {/* Current Selection */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <p className="text-xs font-mono text-gray-600 text-center">
                            Modelo actual: <span className="font-bold">{VIDEO_MODEL_OPTIONS[selectedVideoModelType].name}</span>
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Video Prompt Modal */}
        {showVideoPrompt && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowVideoPrompt(false)}>
                <div className="bg-white border border-black shadow-lg max-w-md w-full mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-black">
                        <h3 className="font-mono text-lg font-bold text-black">Crear Video</h3>
                        <button 
                            onClick={() => setShowVideoPrompt(false)}
                            className="text-gray-500 hover:text-black transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    
                    {/* Prompt Input */}
                    <div className="p-4">
                        <label className="block text-sm font-mono text-black mb-2">
                            Describe el movimiento o acción para el video:
                        </label>
                        <textarea
                            value={videoPromptInput}
                            onChange={(e) => setVideoPromptInput(e.target.value)}
                            placeholder="Ej: Un gato caminando lentamente en el jardín, una persona saludando con la mano, un objeto rotando suavemente..."
                            className="w-full h-24 p-3 border border-black text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={200}
                        />
                        <div className="text-xs text-gray-500 mt-1 text-right">
                            {videoPromptInput.length}/200 caracteres
                        </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="p-4 border-t border-gray-200 flex gap-2">
                        <button
                            onClick={() => setShowVideoPrompt(false)}
                            className="flex-1 px-4 py-2 border border-black text-black font-mono text-sm hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                if (videoPromptInput.trim()) {
                                    handleConvertToVideo(videoPromptInput.trim());
                                    setShowVideoPrompt(false);
                                    setVideoPromptInput('');
                                }
                            }}
                            disabled={!videoPromptInput.trim()}
                            className="flex-1 px-4 py-2 bg-black text-white font-mono text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            🎬 Generar Video
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* 3D Viewer Modal */}
        {show3DViewer && selected3DModel && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShow3DViewer(false)}>
                <div className="bg-white border border-black shadow-lg max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-black">
                        <h3 className="font-mono text-lg font-bold text-black">Visor 3D</h3>
                        <div className="flex items-center gap-2">
                            {/* Download buttons based on model type */}
                            {selected3DModel.glbUrl && (
                                <button
                                    onClick={() => handleDownload3D('glb')}
                                    className="px-3 py-1 border border-black text-black text-xs font-mono hover:bg-gray-100 transition-colors"
                                    title="Descargar modelo GLB"
                                >
                                    GLB
                                </button>
                            )}
                            {selected3DModel.pbrUrl && (
                                <button
                                    onClick={() => handleDownload3D('pbr')}
                                    className="px-3 py-1 border border-black text-black text-xs font-mono hover:bg-gray-100 transition-colors"
                                    title="Descargar modelo PBR"
                                >
                                    PBR
                                </button>
                            )}
                            {selected3DModel.meshUrl && (
                                <button
                                    onClick={() => handleDownload3D('mesh')}
                                    className="px-3 py-1 border border-black text-black text-xs font-mono hover:bg-gray-100 transition-colors"
                                    title="Descargar mesh"
                                >
                                    MESH
                                </button>
                            )}
                            {/* Model info */}
                            {selected3DModel.modelType && (
                                <span className="px-2 py-1 bg-gray-100 text-xs font-mono text-gray-600 rounded">
                                    {MODEL_3D_OPTIONS[selected3DModel.modelType].name}
                                </span>
                            )}
                            <button 
                                onClick={() => setShow3DViewer(false)}
                                className="text-gray-500 hover:text-black transition-colors ml-2"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    
                    {/* 3D Viewer Content */}
                    <div className="flex-1 p-4 flex items-center justify-center bg-gray-50">
                        <div className="w-full h-96 bg-white border border-gray-200 rounded flex items-center justify-center">
                            {/* Model Viewer Web Component */}
                            <model-viewer
                                src={selected3DModel.meshUrl}
                                alt="3D Model"
                                auto-rotate
                                camera-controls
                                style={{width: '100%', height: '100%'}}
                                loading="eager"
                            ></model-viewer>
                        </div>
                    </div>
                    
                    {/* Instructions */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <p className="text-xs font-mono text-gray-600 text-center">
                            Usa el mouse para rotar, zoom y mover el modelo 3D. Descarga en diferentes formatos usando los botones superiores.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Video Viewer Modal */}
        {showVideoViewer && selectedVideo && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowVideoViewer(false)}>
                <div className="bg-white border border-black shadow-lg max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-black">
                        <h3 className="font-mono text-lg font-bold text-black">Visor de Video</h3>
                        <div className="flex items-center gap-2">
                            {/* Download button */}
                            <button
                                onClick={handleDownloadVideo}
                                className="px-3 py-1 border border-black text-black text-xs font-mono hover:bg-gray-100 transition-colors"
                                title="Descargar video"
                            >
                                Descargar MP4
                            </button>
                            <button 
                                onClick={() => setShowVideoViewer(false)}
                                className="text-gray-500 hover:text-black transition-colors ml-2"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                    
                    {/* Video Content */}
                    <div className="flex-1 p-4 flex items-center justify-center bg-gray-50">
                        <div className="w-full max-w-2xl bg-white border border-gray-200 rounded flex items-center justify-center">
                            <video
                                src={selectedVideo.videoUrl}
                                controls
                                autoPlay
                                loop
                                className="w-full h-auto max-h-96 rounded"
                                style={{maxHeight: '400px'}}
                            >
                                Tu navegador no soporta el elemento video.
                            </video>
                        </div>
                    </div>
                    
                    {/* Video Info */}
                    {selectedVideo.prompt && (
                        <div className="p-4 border-t border-gray-200 bg-gray-50">
                            <p className="text-xs font-mono text-gray-600">
                                <span className="font-bold">Prompt:</span> {selectedVideo.prompt}
                            </p>
                        </div>
                    )}
                    
                    {/* Instructions */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <p className="text-xs font-mono text-gray-600 text-center">
                            Video generado con IA. Usa los controles para reproducir, pausar y ajustar el volumen.
                        </p>
                    </div>
                </div>
            </div>
        )}

        <Analytics />
      </div>
    </>
  );
};

export default App;