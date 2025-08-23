// core/utils/path.ts
export function joinPath(...segments: string[]): string {
   return segments
      .map((seg, i) => (i === 0 ? seg.replace(/\/+$/, '') : seg.replace(/^\/+|\/+$/g, '')))
      .filter(Boolean)
      .join('/');
}
