import { IconProps } from "@/types/icon";
import React from "react";

const FacebookIcon = ({ width = 21, height = 20, ...props }: IconProps) => {
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
        d="M10.5 2.5C6.375 2.5 3 5.89196 3 10.0377C3 13.7575 5.7525 16.848 9.3 17.5V12.1482H7.425V10.0377H9.3V8.3794C9.3 6.49498 10.5 5.4397 12.225 5.4397C12.75 5.4397 13.35 5.51508 13.875 5.59045V7.51256H12.9C12 7.51256 11.775 7.96482 11.775 8.56784V10.0377H13.7625L13.425 12.1482H11.775V17.4925C15.3187 16.8367 18 13.7575 18 10.0377C18 5.89196 14.625 2.5 10.5 2.5Z"
        fill="url(#paint0_linear_132_6124)"
      />
      <defs>
        <linearGradient
          id="paint0_linear_132_6124"
          x1="10.5"
          y1="17.0515"
          x2="10.5"
          y2="2.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0062E0" />
          <stop offset="1" stopColor="#19AFFF" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default FacebookIcon;
