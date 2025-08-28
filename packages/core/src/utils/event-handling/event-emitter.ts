/**
 * Type-safe event emitter that provides strongly-typed event handling.
 * Used as the base class for XCC to enable event-driven architecture.
 * 
 * @template E - Object type mapping event names to their data types
 * 
 * @example
 * ```typescript
 * interface MyEvents {
 *   'user-login': { userId: string; timestamp: Date };
 *   'data-updated': { recordId: number; changes: object };
 * }
 * 
 * class MyEmitter extends TypedEmitter<MyEvents> {}
 * 
 * const emitter = new MyEmitter();
 * 
 * // Type-safe event listening
 * emitter.on('user-login', (data) => {
 *   console.log(`User ${data.userId} logged in at ${data.timestamp}`);
 * });
 * 
 * // Type-safe event emission
 * emitter.emit('user-login', {
 *   userId: '123',
 *   timestamp: new Date()
 * });
 * ```
 */
export class TypedEmitter<E extends Record<string, any>> {
   private events: { [K in keyof E]?: Array<(data: E[K]) => void> } = {};
   
   /**
    * Registers an event listener for the specified event type.
    * @param event - The event name to listen for
    * @param fn - Callback function to execute when the event is emitted
    * 
    * @example
    * ```typescript
    * emitter.on('data-updated', (data) => {
    *   console.log('Record updated:', data.recordId);
    * });
    * ```
    */
   on<K extends keyof E>(event: K, fn: (data: E[K]) => void) {
      (this.events[event] ||= []).push(fn);
   }
   
   /**
    * Emits an event with the specified data to all registered listeners.
    * @param event - The event name to emit
    * @param data - The data to pass to event listeners
    * 
    * @example
    * ```typescript
    * emitter.emit('data-updated', {
    *   recordId: 123,
    *   changes: { name: 'New Name' }
    * });
    * ```
    */
   emit<K extends keyof E>(event: K, data: E[K]) {
      for (const fn of this.events[event] || []) fn(data);
   }
}
