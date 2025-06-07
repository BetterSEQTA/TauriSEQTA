import DOMPurify from 'dompurify';
import type { DraftJSContent, LinkPreview, Lesson } from './types';

// HTML sanitization function using DOMPurify
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|xxx):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_ATTR: ['target', 'rel'],
    ADD_DATA_URI_TAGS: ['img']
  });
}

export function renderDraftJSText(content: DraftJSContent): string {
  return content.blocks
    .map(block => {
      let text = block.text;
      
      // Apply entity ranges (links, etc.)
      if (block.entityRanges.length > 0) {
        // Sort ranges by offset in reverse order to apply from end to start
        const sortedRanges = [...block.entityRanges].sort((a, b) => b.offset - a.offset);
        
        for (const range of sortedRanges) {
          const entity = content.entityMap[range.key];
          if (entity && entity.type === 'LINK') {
            const before = text.substring(0, range.offset);
            const linkText = text.substring(range.offset, range.offset + range.length);
            const after = text.substring(range.offset + range.length);
            text = `${before}<a href="${entity.data.href || entity.data.url}" class="text-indigo-400 hover:text-purple-300 underline transition-colors" target="_blank" rel="noopener noreferrer">${linkText}</a>${after}`;
          }
        }
      }
      
      // Apply block-level formatting
      switch (block.type) {
        case 'header-one':
          return `<h1 class="text-2xl font-bold mb-4 text-white">${text}</h1>`;
        case 'header-two':
          return `<h2 class="text-xl font-bold mb-3 text-white">${text}</h2>`;
        case 'header-three':
          return `<h3 class="text-lg font-bold mb-2 text-white">${text}</h3>`;
        default:
          return `<p class="mb-2 text-slate-300">${text}</p>`;
      }
    })
    .join('');
}

export function getFileIcon(mimetype: string): string {
  if (mimetype.includes('pdf')) return '📄';
  if (mimetype.includes('image')) return '🖼️';
  if (mimetype.includes('video')) return '🎥';
  if (mimetype.includes('audio')) return '🎵';
  if (mimetype.includes('text')) return '📝';
  if (mimetype.includes('word')) return '📝';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return '📽️';
  return '📎';
}

export function getFileColor(mimetype: string): string {
  if (mimetype.includes('pdf')) return 'border-red-500 bg-red-900/20 hover:bg-red-900/40';
  if (mimetype.includes('image')) return 'border-green-500 bg-green-900/20 hover:bg-green-900/40';
  if (mimetype.includes('video')) return 'border-purple-500 bg-purple-900/20 hover:bg-purple-900/40';
  if (mimetype.includes('audio')) return 'border-yellow-500 bg-yellow-900/20 hover:bg-yellow-900/40';
  if (mimetype.includes('word')) return 'border-blue-500 bg-blue-900/20 hover:bg-blue-900/40';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'border-emerald-500 bg-emerald-900/20 hover:bg-emerald-900/40';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'border-orange-500 bg-orange-900/20 hover:bg-orange-900/40';
  return 'border-indigo-500 bg-indigo-900/20 hover:bg-indigo-900/40';
}

export function formatFileSize(size: string): string {
  const bytes = parseInt(size);
  if (isNaN(bytes)) return size;
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let fileSize = bytes;
  
  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }
  
  return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
}

// Link preview functionality
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  try {
    const embedlyUrl = `https://api.embed.ly/1/oembed?url=${encodeURIComponent(url)}&key=fef2d3229afa11e0bcfe4040d3dc5c07&format=json&maxWidth=600&maxHeight=400&secure=true&luxe=1`;
    
    const response = await fetch(embedlyUrl);
    const data = await response.json();
    
    if (data.error_code) {
      return null;
    }
    
    return {
      title: data.title || `Preview of ${getDomainName(url)}`,
      description: data.description || '',
      image: data.thumbnail_url || '',
      url: url,
      imageWidth: data.thumbnail_width || 0,
      imageHeight: data.thumbnail_height || 0
    };
  } catch (error) {
    console.error('Failed to fetch link preview:', error);
    return null;
  }
}

export function isFaviconImage(preview: LinkPreview | null): boolean {
  if (!preview || !preview.image) return false;
  
  const width = preview.imageWidth || 0;
  const height = preview.imageHeight || 0;
  
  // Consider it a favicon if it's small (typically <= 64px) or square and small
  if (width <= 64 && height <= 64) return true;
  
  // Also check for common favicon patterns in URL
  const imageUrl = preview.image.toLowerCase();
  if (imageUrl.includes('favicon') || 
      imageUrl.includes('/icon') || 
      imageUrl.endsWith('.ico') ||
      imageUrl.includes('apple-touch-icon')) {
    return true;
  }
  
  return false;
}

function getDomainName(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'External Link';
  }
}

export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

export function formatTime(timeString: string): string {
  try {
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    return timeString;
  }
}

export function isLessonReleased(lesson: Lesson): boolean {
  try {
    // Parse the lesson date and time
    const lessonDateTime = new Date(`${lesson.d}T${lesson.s}`);
    const now = new Date();
    
    // Return true if the lesson time has passed
    return lessonDateTime <= now;
  } catch (error) {
    // If we can't parse the date, assume it's released to be safe
    return true;
  }
}

export function formatLessonDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lessonDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = lessonDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays === -1) {
      return 'Yesterday';
    } else if (diffDays > 1 && diffDays <= 7) {
      return date.toLocaleDateString('en-AU', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  } catch (error) {
    return dateString;
  }
}

export function isEmbeddableUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return true;
    
    return false;
  } catch (error) {
    return false;
  }
}

export function getEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (hostname.includes('youtube.com')) {
      const videoId = urlObj.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    } else if (hostname.includes('youtu.be')) {
      const videoId = urlObj.pathname.slice(1);
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export function getEmbedType(url: string): 'video' | 'document' | 'interactive' | 'webpage' {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      return 'video';
    }
    
    return 'webpage';
  } catch (error) {
    return 'webpage';
  }
} 