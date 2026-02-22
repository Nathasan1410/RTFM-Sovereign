import { http, createConfig } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

export const config = getDefaultConfig({
  appName: 'RTFM Sovereign',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '3254921f65d601700685652514338541',
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC),
  },
  ssr: true,
})
