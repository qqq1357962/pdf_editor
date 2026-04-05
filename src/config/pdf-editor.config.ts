export const config = {
  crop: {
    autoCropMargin: 0.03,
    whitePixelThreshold: 250,
    minCropSize: 0.05,
  },
  history: {
    maxCacheSizeMB: 30,
  },
  thumbnail: {
    width: 120,
    quality: 0.8,
  },
  export: {
    defaultImageFormat: 'png' as const,
    imageResolutions: [1, 2, 3],
  },
  shortcuts: {
    copy: 'c',
    paste: 'v',
    undo: 'z',
    redo: 'y',
    delete: 'Delete',
  },
} as const;