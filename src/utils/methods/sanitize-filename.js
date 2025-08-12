function sanitizeFileName(fileName) {
   return fileName
      .replace(/[:\s[\]()]+/g, '_') // Replace invalid characters with underscores
      .replace(/_+/g, '_') // Replace multiple underscores with a single underscore
      .replace(/^_+|_+$/g, '') // Remove leading and trailing underscores
      .replace(/[?,]+/g, '_'); // Replace ? and , with underscores
}

export { sanitizeFileName };
