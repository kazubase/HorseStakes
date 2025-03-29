import * as React from "react";
import { useState } from "react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

interface InfoTooltipProps {
  content: React.ReactNode;
  iconSize?: "sm" | "md";
}

/**
 * PCではホバー、タッチデバイスではタップでTooltipを表示するコンポーネント
 */
export function InfoTooltip({ 
  content, 
  iconSize = "sm" 
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);

  const iconSizeClass = iconSize === "sm" ? "h-3 w-3" : "h-4 w-4";

  // 文字列の場合、「。」で改行を挿入
  const formattedContent = React.useMemo(() => {
    if (typeof content === 'string') {
      return content.replace(/。/g, '。\n').split('\n').map((text, index) => (
        <React.Fragment key={index}>
          {index > 0 && <br />}
          {text}
        </React.Fragment>
      ));
    }
    return content;
  }, [content]);

  return (
    <TooltipProvider>
      <Tooltip open={open}>
        <TooltipTrigger asChild>
          <button 
            type="button"
            className="p-0 m-0 bg-transparent border-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(!open);
            }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
          >
            <InfoIcon className={`${iconSizeClass} cursor-help opacity-70`} />
          </button>
        </TooltipTrigger>
        <TooltipContent 
          className="max-w-xs text-xs"
          onPointerDownOutside={() => setOpen(false)}
        >
          {formattedContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 