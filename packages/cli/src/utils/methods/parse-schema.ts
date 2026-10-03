import { load } from 'js-yaml';

/**
 * Parse a schema file's contents as JSON or YAML.
 * Uses the file extension when recognized, otherwise tries JSON then YAML.
 *
 * @param fileContents - Raw file contents
 * @param inputFile - The file name/path (used for extension detection)
 * @throws {Error} with a consistent message when parsing fails
 */
export function parseSchemaContents(fileContents: string, inputFile: string): any {
   try {
      if (inputFile.endsWith('.json')) {
         return JSON.parse(fileContents);
      }
      if (inputFile.endsWith('.yaml') || inputFile.endsWith('.yml')) {
         return load(fileContents);
      }
      // Fallback: try JSON, then YAML if the extension is missing or unknown
      try {
         return JSON.parse(fileContents);
      } catch {
         return load(fileContents);
      }
   } catch (err: any) {
      throw new Error(`Failed to parse schema file: ${err.message}`);
   }
}
