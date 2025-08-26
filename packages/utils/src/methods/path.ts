// core/utils/path.ts
export function joinPath(...segments: string[]): string {
   return segments
      .map((seg, i) => (i === 0 ? seg.replace(/\/+$/, '') : seg.replace(/^\/+|\/+$/g, '')))
      .filter(Boolean)
      .join('/');
}

export function dirname(path: string): string {
   path = path.replace(/\/+$/, '');
   const idx = path.lastIndexOf('/');
   if (idx === -1) return '.';
   if (idx === 0) return '/';
   return path.slice(0, idx);
}
