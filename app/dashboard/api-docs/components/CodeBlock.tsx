import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  language: string;
  code: string;
  onCopy: () => void;
  copied: boolean;
}

export function CodeBlock({ language, code, onCopy, copied }: CodeBlockProps) {
  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10">
        <Button
          size="sm"
          variant="ghost"
          onClick={onCopy}
          className="bg-gray-800/50 hover:bg-gray-800/70 text-white"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code className="text-sm">{code}</code>
      </pre>
    </div>
  );
}
