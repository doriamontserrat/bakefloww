import logoSrc from "@/imports/logobakeflow.jpeg";

interface Props {
  size?: number;
  className?: string;
}

export default function Logo({ size = 40, className = "" }: Props) {
  return (
    <img
      src={logoSrc}
      alt="BakeFlow logo"
      width={size}
      height={size}
      className={`object-contain rounded-xl ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
