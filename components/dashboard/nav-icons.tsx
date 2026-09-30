import type { IconName } from "@/lib/apps";
import {
  ActivityIcon,
  BuildingIcon,
  FileIcon,
  LandmarkIcon,
  MapPinIcon,
} from "@/components/icons";

export const NAV_ICONS: Record<IconName, typeof ActivityIcon> = {
  activity: ActivityIcon,
  map: MapPinIcon,
  landmark: LandmarkIcon,
  building: BuildingIcon,
  file: FileIcon,
};
