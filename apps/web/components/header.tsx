"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-14">
      <div className="flex h-14 w-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <span className="text-lg font-bold font-mono text-green-500">RTFM</span>
            <span className="text-xs text-muted-foreground font-mono">v1.0</span>
          </Link>
        </div>

        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
            const ready = mounted && authenticationStatus !== 'loading';
            const connected = ready && account && chain;

            return (
              <div className="flex items-center gap-2">
                {(() => {
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        type="button"
                        className="h-8 rounded-sm bg-zinc-100 text-zinc-900 hover:bg-zinc-300 font-mono text-xs font-bold uppercase tracking-wider px-3 transition-colors"
                      >
                        Connect Wallet
                      </button>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <button
                        onClick={openChainModal}
                        type="button"
                        className="h-8 rounded-sm bg-red-500/10 text-red-500 border border-red-500/20 font-mono text-xs font-bold uppercase tracking-wider px-3 transition-colors"
                      >
                        Wrong network
                      </button>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={openChainModal}
                        type="button"
                        className="hidden sm:flex h-8 items-center gap-2 rounded-sm border border-zinc-800 bg-zinc-900/50 px-2 font-mono text-xs hover:bg-zinc-900 hover:text-zinc-100 transition-colors"
                      >
                        {chain.hasIcon && (
                          <div className="h-4 w-4 rounded-full bg-zinc-700" />
                        )}
                        {chain.name}
                      </button>
                      <button
                        onClick={openAccountModal}
                        type="button"
                        className="h-8 rounded-sm border border-zinc-800 bg-zinc-900/50 px-3 font-mono text-xs hover:bg-zinc-900 hover:text-zinc-100 transition-colors"
                      >
                        {account.displayName}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
}
