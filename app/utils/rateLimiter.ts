/**
 * Rate limiter utility
 * Prevents hitting Shopify GraphQL rate limits
 * Processes variants in batches with delays
 */

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Process items in batches to avoid rate limits
 * @param items Array of items to process
 * @param batchSize Number of items per batch (10-15 recommended)
 * @param handler Async function to handle each item
 * @param delayMs Delay between batches in milliseconds (500ms recommended)
 */
export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  handler: (item: T) => Promise<R>,
  delayMs: number = 500
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchResults = await Promise.all(batch.map(handler));
    results.push(...batchResults);

    // Delay between batches (except for last batch)
    if (i + batchSize < items.length) {
      await delay(delayMs);
    }
  }

  return results;
}

/**
 * Process items sequentially with a delay between each
 * Use this for critical operations that can't tolerate parallel processing
 */
export async function processSequentially<T, R>(
  items: T[],
  handler: (item: T) => Promise<R>,
  delayMs: number = 100
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = await handler(items[i]);
    results.push(result);

    // Delay between items (except for last item)
    if (i < items.length - 1) {
      await delay(delayMs);
    }
  }

  return results;
}
