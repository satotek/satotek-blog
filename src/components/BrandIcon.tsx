import type { SimpleIcon } from "simple-icons";

type BrandIconProps = {
  icon: SimpleIcon;
  className?: string;
};

export function BrandIcon({ icon, className }: BrandIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" role="img" aria-hidden="true" focusable="false">
      <path d={icon.path} fill="currentColor" />
    </svg>
  );
}
