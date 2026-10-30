import { replacePlaceholders } from '@repo/utils';
import { findProjectRoot } from '../commands/project-root-finder';

/** Values substituted into a configured output template. */
export interface ArtifactContext {
   instance: string;
   workspace: string;
   branch: string;
   /** Normalized API group name, for templates that are per-group. */
   apiGroupNormalized?: string;
}

export interface ResolveArtifactDestinationOptions {
   /** Output template from the instance config, e.g. `output/spec/{instance}/{api_group_normalized_name}`. */
   template: string;
   context: ArtifactContext;
   /** Explicit `--output` value. Used verbatim, bypassing the template and project-root lookup. */
   override?: string;
   /** Project root for the `@` placeholder. Defaults to `findProjectRoot()`. */
   projectRoot?: string;
}

/**
 * Resolves the destination directory for generated files.
 *
 * This is the only place that knows how output templates and the `@`
 * placeholder are expanded, so every command agrees on where files land.
 */
export async function resolveArtifactDestination({
   template,
   context,
   override,
   projectRoot,
}: ResolveArtifactDestinationOptions): Promise<string> {
   if (override) {
      return override;
   }

   const root = projectRoot ?? (await findProjectRoot());

   return replacePlaceholders(template, {
      '@': root,
      instance: context.instance,
      workspace: context.workspace,
      branch: context.branch,
      api_group_normalized_name: context.apiGroupNormalized ?? '',
   }) as string;
}
