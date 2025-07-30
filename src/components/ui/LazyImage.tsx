import React, { useState, useRef, useEffect, useCallback } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  fallback?: string;
  threshold?: number;
  rootMargin?: string;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
  containerClassName?: string;
  blurDataURL?: string;
  aspectRatio?: number;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  fallback,
  threshold = 0.1,
  rootMargin = '50px',
  onLoad,
  onError,
  className = '',
  containerClassName = '',
  blurDataURL,
  aspectRatio,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  const getPlaceholderStyle = () => {
    if (blurDataURL) {
      return {
        backgroundImage: `url(${blurDataURL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(20px)',
        transform: 'scale(1.1)',
      };
    }
    return {};
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${containerClassName}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center"
          style={getPlaceholderStyle()}
        >
          {placeholder ? (
            <img
              src={placeholder}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-gray-400">
              <svg
                className="w-8 h-8"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {fallback ? (
            <img src={fallback} alt={alt} className={className} {...props} />
          ) : (
            <div className="text-gray-400 text-center">
              <svg
                className="w-8 h-8 mx-auto mb-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm">Failed to load image</p>
            </div>
          )}
        </div>
      )}

      {/* Actual image */}
      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
    </div>
  );
};

// Hook for lazy loading multiple images
export function useLazyImageObserver(threshold = 0.1, rootMargin = '50px') {
  const [visibleImages, setVisibleImages] = useState<Set<string>>(new Set());

  const observeImage = useCallback(
    (element: HTMLElement, id: string) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleImages(prev => new Set(prev).add(id));
            observer.disconnect();
          }
        },
        { threshold, rootMargin }
      );

      observer.observe(element);
      return () => observer.disconnect();
    },
    [threshold, rootMargin]
  );

  const isImageVisible = useCallback(
    (id: string) => visibleImages.has(id),
    [visibleImages]
  );

  return { observeImage, isImageVisible };
}

// Progressive image component with different quality levels
interface ProgressiveImageProps extends LazyImageProps {
  lowQualitySrc?: string;
  mediumQualitySrc?: string;
  highQualitySrc: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  lowQualitySrc,
  mediumQualitySrc,
  highQualitySrc,
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc || props.placeholder);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;

    let currentQuality = 0;
    const sources = [lowQualitySrc, mediumQualitySrc, highQualitySrc].filter(Boolean);

    const loadNextQuality = () => {
      if (currentQuality < sources.length) {
        const img = new Image();
        img.onload = () => {
          setCurrentSrc(sources[currentQuality]);
          currentQuality++;
          setTimeout(loadNextQuality, 100); // Small delay between quality levels
        };
        img.src = sources[currentQuality] as string;
      }
    };

    loadNextQuality();
  }, [isInView, lowQualitySrc, mediumQualitySrc, highQualitySrc]);

  return (
    <div ref={containerRef}>
      <LazyImage
        {...props}
        src={currentSrc || highQualitySrc}
        threshold={0}
        rootMargin="0px"
      />
    </div>
  );
};

// Image gallery with lazy loading
interface ImageGalleryProps {
  images: Array<{
    id: string;
    src: string;
    alt: string;
    thumbnail?: string;
  }>;
  columns?: number;
  gap?: number;
  onImageClick?: (image: any, index: number) => void;
}

export const LazyImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  columns = 3,
  gap = 16,
  onImageClick,
}) => {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {images.map((image, index) => (
        <div
          key={image.id}
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onImageClick?.(image, index)}
        >
          <LazyImage
            src={image.src}
            alt={image.alt}
            placeholder={image.thumbnail}
            className="w-full h-auto rounded-lg"
            aspectRatio={1}
          />
        </div>
      ))}
    </div>
  );
}; 