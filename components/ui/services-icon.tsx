import { Image } from "react-native";

import ServicesIconPng from "@/assets/images/icons8-briefcase-144.png";

type ServicesIconProps = {
  size?: number;
};

/**
 * Services icon from assets/images/icons8-briefcase-144.png (Icons8 briefcase).
 */
export function ServicesIcon({ size = 24 }: ServicesIconProps) {
  return (
    <Image
      source={ServicesIconPng}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
