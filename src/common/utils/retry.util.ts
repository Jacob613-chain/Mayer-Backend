interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoff?: number;
}

export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
  onRetry?: (error: Error, attempt: number) => void
): Promise<T> {
  let lastError: Error;
  let attempt = 1;

  while (attempt <= options.maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === options.maxAttempts) {
        break;
      }

      if (onRetry) {
        onRetry(error, attempt);
      }

      await new Promise(resolve => 
        setTimeout(resolve, options.delay * Math.pow(options.backoff || 1, attempt - 1))
      );

      attempt++;
    }
  }

  throw lastError;
} 