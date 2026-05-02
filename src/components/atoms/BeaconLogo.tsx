import { cn } from "../ui/utils";

interface BeaconLogoProps {
    className?: string;
    alt?: string;
    decorative?: boolean;
}

export function BeaconLogo({
    className,
    alt = "",
    decorative = true,
}: BeaconLogoProps) {
    return (
        <img
            src="/beacon.png"
            alt={decorative ? "" : alt}
            aria-hidden={decorative ? true : undefined}
            className={cn("w-12 h-12 rounded-md object-contain", className)}
        />
    );
}