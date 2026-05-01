import { ReactNode } from 'react';

export async function generateStaticParams() {
  return [{ id: 'lic_e2e_001' }];
}

export default function LicenseDetailLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
