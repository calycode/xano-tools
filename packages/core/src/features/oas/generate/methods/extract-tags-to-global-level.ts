function extractTagsToGlobal(paths) {
   // 1. Collect all tags used in operations
   const tagSet = new Set();
   for (const [path, methods] of Object.entries(paths || {})) {
      for (const [method, operation] of Object.entries(methods)) {
         if (operation.tags && Array.isArray(operation.tags)) {
            operation.tags.forEach((tag) => tagSet.add(tag));
         }
      }
   }

   // 2. Build the global tags array if not present
   let tags = Array.from(tagSet).map((tag) => ({
      name: tag,
      description: `Auto-generated tag for ${tag}`,
   }));

   // (Optional) If you want to preserve existing tags and only add missing ones:
   const existingTags = (tags || []).map((t) => t.name);
   const allTags = Array.from(new Set([...existingTags, ...tagSet]));
   tags = allTags.map((tag) => ({
      name: tag,
      description: `Auto-generated tag for ${tag}`,
   }));

   return tags;
}

export { extractTagsToGlobal };
