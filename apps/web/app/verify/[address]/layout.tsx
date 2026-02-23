export const metadata = {
  title: 'Verify Skill Credential | RTFM-Sovereign',
  description: 'Cryptographically verified coding skills on blockchain. Check if a developer has proven their expertise through RTFM-Sovereign platform.',
  openGraph: {
    title: 'Verify Skill Credential',
    description: 'Cryptographically verified coding skills on blockchain',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
