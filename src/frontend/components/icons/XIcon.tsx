import { IconProps } from "@/types/icon";
import React from "react";

const XIcon = ({
  width = 21,
  height = 20,
  color = "currentColor",
  ...props
}: IconProps) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 21 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M2.41454 2.5L8.68847 10.7735L2.375 17.5H3.79602L9.32359 11.6107L13.7895 17.5H18.625L11.9979 8.76125L17.8745 2.5H16.4535L11.3631 7.92376L7.25 2.5H2.41454ZM4.50422 3.53247H6.7256L16.5351 16.4678H14.3137L4.50422 3.53247Z"
        fill={color}
      />
    </svg>
  );
};

export default XIcon;
