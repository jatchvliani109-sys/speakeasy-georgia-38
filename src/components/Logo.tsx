import sIcon from "@/assets/s-icon.svg";

type Props = {
  size?: number;
  className?: string;
};

export default function Logo({ size = 28, className = "" }: Props) {
  return (
    <img
      src={sIcon}
      alt="SpeakBusy"
      width={size}
      height={size}
      className={`rounded-md ${className}`}
    />
  );
}
