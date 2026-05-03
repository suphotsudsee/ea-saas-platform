'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export function LicenseCard({ license }: any) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(license.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-slate-800 bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">{license.strategy}</CardTitle>
        <Badge variant="outline" className="border-green-500/20 text-green-400 bg-green-500/10">
          {license.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800 font-mono text-xs text-slate-400">
          <span>{license.key.substring(0, 12)}...</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCopy}
            className="h-6 px-2 hover:bg-slate-800"
          >
            {copied ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Dummy Button for the shared component to avoid import errors
function Button({ variant, size, className, ...props }: any) {
  return <button className={`px-2 py-1 rounded text-xs ${className}`} {...props} />;
}
