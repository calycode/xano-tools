export { createOutputFileSystem } from './file-system';
export type { OutputFileSystem } from './file-system';
export { resolveOutputDestination } from './resolve-destination';
export type { OutputContext, ResolveOutputDestinationOptions } from './resolve-destination';
export { prepareOutputDirectory, writeGeneratedOutput } from './write-output';
export type {
   OutputEntry,
   OutputProgressEvent,
   OutputStage,
   OutputWriteFailure,
   OutputWriteResult,
   PrepareOutputDirectoryOptions,
   WriteGeneratedOutputOptions,
} from './write-output';
