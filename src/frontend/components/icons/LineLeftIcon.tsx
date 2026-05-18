import { IconProps } from "@/types/icon";
import React from "react";

const LineLeftIcon = ({
  width = 81,
  height = 6,
  color = "currentColor",
  ...props
}: IconProps) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 81 6"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M0.113249 3L3 5.88675L5.88675 3L3 0.113249L0.113249 3ZM81 3V2.5H3V3V3.5H81V3Z"
        fill={color}
      />
    </svg>
  );
};

export default LineLeftIcon;
