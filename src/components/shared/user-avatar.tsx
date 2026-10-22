import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  className,
  size = "default",
}: {
  name: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  return (
    <Avatar size={size} className={cn(className)}>
      <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">
        {initials(name) || "?"}
      </AvatarFallback>
    </Avatar>
  );
}
