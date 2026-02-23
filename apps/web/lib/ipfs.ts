export function getIpfsUrl(hash: string): string {
  const gateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
  return `${gateway}${hash}`;
}

export function getIpfsGateway(): string {
  return process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
}

export async function fetchIpfsContent<T = any>(hash: string, timeout: number = 5000): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(getIpfsUrl(hash), {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[IPFS] Failed to fetch content for hash ${hash}: ${response.status}`);
      return null;
    }

    const content = await response.json();
    return content as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[IPFS] Timeout fetching content for hash ${hash}`);
    } else {
      console.error(`[IPFS] Error fetching content for hash ${hash}:`, error);
    }
    clearTimeout(timeoutId);
    return null;
  }
}

export function isValidIpfsHash(hash: string): boolean {
  const ipfsHashRegex = /^Qm[a-zA-Z0-9]{44}$|^b[a-zA-Z0-9]{58}$|^B[a-zA-Z0-9]{58}$|^z[a-zA-Z0-9]{58}$/;
  return ipfsHashRegex.test(hash);
}
