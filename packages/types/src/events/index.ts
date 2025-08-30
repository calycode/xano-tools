// core/events.ts

// 1. Base event payload
interface BaseEventPayload {
   name: string; // Name of the process or step (e.g. 'exportBackup')
   payload?: any; // Arbitrary data relevant to the event
}

// 2. Lifecycle events
export interface StartEvent extends BaseEventPayload {}
export interface ProgressEvent extends BaseEventPayload {
   message?: string;
   step?: number;
   totalSteps?: number;
   percent?: number;
}
export interface EndEvent extends BaseEventPayload {
   durationMs?: number;
}
export interface ErrorEvent {
   error: Error | any;
   message?: string;
}
export interface WarnEvent extends BaseEventPayload {
   message: string;
}
export interface InfoEvent extends BaseEventPayload {
   message: string;
}

// 3. Step events
export interface StepEvent extends BaseEventPayload {
   step: number | string;
   message?: string;
}
export interface StepSkippedEvent extends StepEvent {}

// 4. Prompt events (optional)
export interface PromptEvent extends BaseEventPayload {
   promptType: string; // 'input', 'confirm', etc.
   message: string;
   options?: any;
}

// 5. Custom event
export interface CustomEvent extends BaseEventPayload {}

// 6. Union type for all events
export type CoreEvent =
   | { type: 'start'; data: StartEvent }
   | { type: 'progress'; data: ProgressEvent }
   | { type: 'end'; data: EndEvent }
   | { type: 'error'; data: ErrorEvent }
   | { type: 'warn'; data: WarnEvent }
   | { type: 'info'; data: InfoEvent }
   | { type: 'stepStart'; data: StepEvent }
   | { type: 'stepEnd'; data: StepEvent }
   | { type: 'stepSkipped'; data: StepSkippedEvent }
   | { type: 'prompt'; data: PromptEvent }
   | { type: 'custom'; data: CustomEvent };


   // 7. Stronly typed event emitter
   export type EventMap = {
      start: StartEvent;
      progress: ProgressEvent;
      end: EndEvent;
      error: ErrorEvent;
      warn: WarnEvent;
      info: InfoEvent;
      stepStart: StepEvent;
      stepEnd: StepEvent;
      stepSkipped: StepSkippedEvent;
      prompt: PromptEvent;
      custom: CustomEvent;
   };

   export type EventName = keyof EventMap;

   // CoreEvent with some ts magic:
   export type CoreEventGenerated<EventMap> = {
      [K in keyof EventMap]: { type: K; data: EventMap[K] };
   }[keyof EventMap];