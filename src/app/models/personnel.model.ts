export interface Personnel {
  _id?: string;
  matricule: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position: string;
  department: string;
  isActive: boolean;
  hireDate?: Date;
  
  // Pointeuse fields
  rfidTag?: string;
  cardNumber?: string;
  nfcTag?: string;
  faceId?: string;
  fingerprintId?: string;
  defaultClockInMethod?: string;

  createdAt?: Date;
  updatedAt?: Date;
}
