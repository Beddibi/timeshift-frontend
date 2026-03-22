import { Personnel } from './personnel.model';

export interface Attendance {
  _id?: string;
  employeeId: Personnel | string;
  deviceId?: string;
  punchTime: Date | string;
  type: 'IN' | 'OUT';
  method: 'RFID' | 'BIOMETRIC' | 'MANUAL' | 'APP' | 'NFC' | 'FACE_ID' | 'CARD' | 'PIN';
}

export interface ClockInDto {
  identifier: string;
  method: string;
  deviceId?: string;
}
