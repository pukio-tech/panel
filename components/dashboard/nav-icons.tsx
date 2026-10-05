import type { IconName } from "@/lib/apps";
import {
  ActivityIcon,
  BuildingIcon,
  DumbbellIcon,
  FileIcon,
  LandmarkIcon,
  LayersIcon,
  MapPinIcon,
  ReceiptIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons";

export const NAV_ICONS: Record<IconName, typeof ActivityIcon> = {
  activity: ActivityIcon,
  map: MapPinIcon,
  landmark: LandmarkIcon,
  building: BuildingIcon,
  file: FileIcon,
  dumbbell: DumbbellIcon,
  layers: LayersIcon,
  users: UsersIcon,
  user: UserIcon,
  wallet: WalletIcon,
  receipt: ReceiptIcon,
};
