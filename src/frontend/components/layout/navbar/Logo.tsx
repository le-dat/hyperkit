import { LOGO_PATH, PATH } from "@/lib/constants";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface LogoProps {
  onClick?: () => void;
}

export function Logo({ onClick }: LogoProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(PATH.dashboard);
    }
  };

  return (
    <div
      className="flex items-center gap-2 cursor-pointer group"
      onClick={handleClick}
    >
      <Image
        src={LOGO_PATH}
        alt="Hyperkit"
        width={32}
        height={32}
        className="w-8 h-8"
      />
      <span className="font-bold text-xl tracking-tight hidden md:block">
        Hyper<span className="text-hyper-accent">kit</span>
      </span>
    </div>
  );
}
