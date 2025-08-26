export class TypedEmitter<E extends Record<string, any>> {
   private events: { [K in keyof E]?: Array<(data: E[K]) => void> } = {};
   on<K extends keyof E>(event: K, fn: (data: E[K]) => void) {
      (this.events[event] ||= []).push(fn);
   }
   emit<K extends keyof E>(event: K, data: E[K]) {
      for (const fn of this.events[event] || []) fn(data);
   }
}
