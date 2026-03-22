export interface Device {
  _id?: string;
  name: string;
  type: 'PHYSICAL' | 'WEB_KIOSK';
  location?: string;
  isActive: boolean;
  ipAddress?: string;
  kioskToken?: string;
}

export interface CreateDeviceDto {
  name: string;
  type: 'PHYSICAL' | 'WEB_KIOSK';
  location?: string;
  isActive?: boolean;
  ipAddress?: string;
}
