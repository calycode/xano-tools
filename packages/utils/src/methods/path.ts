// core/utils/path.ts
export function joinPath(...segments: string[]): string {
   return segments
      .map((seg) => seg.replace(/^\/+|\/+$/g, ''))
      .filter(Boolean)
      .join('/');
}

export function dirname(path: string): string {
   path = path.replace(/\/+$/, '');
   if (!path || /^\/+$/.test(path)) return '.';
   const idx = path.lastIndexOf('/');
   if (idx === -1) return '.';
   if (idx === 0) return '/';
   return path.slice(0, idx);
}
