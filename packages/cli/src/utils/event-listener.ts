import { intro, outro, log, spinner } from '@clack/prompts';
import { printOutputDir } from './methods/print-output-dir';
import { EventName } from '@calycode/types';

type CoreEventName = 'start' | 'end' | 'progress' | 'error' | 'info';
type HandlerFn = (data: any, context?: any) => void;
type HandlerMap = Partial<Record<CoreEventName, HandlerFn>>;

const defaultHandlers: HandlerMap = {
   error: (data) => log.error(data.message),
};

const eventHandlers: Record<string, HandlerMap> = {
   'generate-oas': {
      start: () => intro('Generating OpenAPI specifications...'),
      end: () => outro('OpenAPI specs generated successfully!'),
      progress: (data) =>
         log.step(`${data.step} / ${data.totalSteps} (${data.percent}%) - ${data.message}`),
      error: (data) =>
         log.error(`Error: ${data.message} \n Payload: ${JSON.stringify(data.error, null, 2)}}`),
      info: (data, { printOutput }) => {
         if (data.name === 'output-dir') {
            printOutputDir(printOutput, data.message);
         }
      },
   },
   'generate-repo': {
      progress: (data, context) => {
         if (!context.spinnerInstance) {
            context.spinnerInstance = spinner();
            context.spinnerInstance.start('Processing workspace inforamtion...');
         }
      },
      end: (data, context) => {
         if (context.spinnerInstance) {
            context.spinnerInstance.stop('Processing done!');
         } else {
            outro('Processing done!');
         }
      },
      error: (data, context) => {
         if (context.spinnerInstance) {
            context.spinnerInstance.stop('Error!');
         }
      },
   },
   'generate-xs-repo': {
      start: () => intro('Generating XS repository...'),
      progress: (data, context) => {
         if (!context.spinnerInstance) {
            context.spinnerInstance = spinner();
            context.spinnerInstance.start('Fetching and parsing XS from Xano...');
         }
      },
      end: (data, context) => {
         if (context.spinnerInstance) {
            context.spinnerInstance.stop('XS files are ready!');
         } else {
            outro('Directory structure rebuilt successfully!');
         }
      },
      error: (data, context) => {
         if (context.spinnerInstance) {
            context.spinnerInstance.stop('Error!');
         }
      },
   },
   'export-backup': {
      start: () => intro('Exporting workspace backup...'),
      progress: (data, context) => {
         if (!context.spinnerInstance) {
            context.spinnerInstance = spinner();
            context.spinnerInstance.start('Processing workspace inforamtion...');
         }
      },
      end: (data, context) => {
         if (context.spinnerInstance) {
            context.spinnerInstance.stop('Workspace backup exported successfully!');
         } else {
            outro('Workspace backup exported successfully!');
         }
      },
      error: (data) =>
         log.error(`Error: ${data.message} \n Payload: ${JSON.stringify(data.error, null, 2)}}`),
      info: (data, { printOutput }) => {
         if (data.name === 'output-dir') {
            printOutputDir(printOutput, data.message);
         }
      },
   },
   'restore-backup': {
      start: () => log.step('Restoring workspace backup...'),
      progress: (data, context) => {
         if (!context.spinnerInstance) {
            context.spinnerInstance = spinner();
            context.spinnerInstance.start('Uploading and importing backup...');
         }
      },
      end: (data, context) => {
         if (context.spinnerInstance) {
            context.spinnerInstance.stop();
            outro('Backup restoration completed');
         } else {
            outro('Backup restoration failed!');
         }
      },
      error: (data) =>
         log.error(`Error: ${data.message} \n Payload: ${JSON.stringify(data.error, null, 2)}}`),
   },
};

function attachCliEventHandlers(
   commandKey: string,
   core: { on: (event: EventName, fn: (...args: any[]) => void) => void },
   context?: any
) {
   const handlers: HandlerMap = { ...defaultHandlers, ...eventHandlers[commandKey] };
   (Object.entries(handlers) as [CoreEventName, HandlerFn][]).forEach(([event, handler]) => {
      if (typeof handler === 'function') {
         core.on(event, (data: any) => handler(data, context));
      }
   });
}

export { attachCliEventHandlers };
