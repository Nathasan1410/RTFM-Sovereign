const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/'
];

export function getIpfsUrl(hash: string, gatewayIndex: number = 0): string {
  const gateway = IPFS_GATEWAYS[gatewayIndex % IPFS_GATEWAYS.length];
  return `${gateway}${hash}`;
}

export function getIpfsGateway(): string {
  return process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/';
}

const TIMEOUT_MS = parseInt(process.env.NEXT_PUBLIC_IPFS_TIMEOUT || '15000');

export async function fetchIpfsContent<T = any>(hash: string): Promise<T | null> {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  for (let attempt = 0; attempt < 3; attempt++) {
    for (let gatewayIndex = 0; gatewayIndex < IPFS_GATEWAYS.length; gatewayIndex++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(getIpfsUrl(hash, gatewayIndex), {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const content = await response.json();
          console.log(`[IPFS] Fetched from gateway ${gatewayIndex}: ${IPFS_GATEWAYS[gatewayIndex]}`);
          return content as T;
        } else {
          console.warn(`[IPFS] Gateway ${gatewayIndex} returned ${response.status} for hash ${hash}`);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn(`[IPFS] Timeout on gateway ${gatewayIndex} for hash ${hash}`);
        } else {
          console.error(`[IPFS] Error on gateway ${gatewayIndex} for hash ${hash}:`, error);
        }
        clearTimeout(timeoutId);
      }
    }

    if (attempt < 2) {
      const backoffTime = Math.pow(2, attempt) * 1000;
      console.log(`[IPFS] Retry attempt ${attempt + 1}, waiting ${backoffTime}ms`);
      await delay(backoffTime);
    }
  }

  console.error(`[IPFS] All gateways failed for hash ${hash}`);
  return null;
}

export function isValidIpfsHash(hash: string): boolean {
  const ipfsHashRegex = /^Qm[a-zA-Z0-9]{44}$|^b[a-zA-Z0-9]{58}$|^B[a-zA-Z0-9]{58}$|^z[a-zA-Z0-9]{58}$/;
  return ipfsHashRegex.test(hash);
}
