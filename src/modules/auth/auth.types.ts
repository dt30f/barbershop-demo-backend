import { ActorRole } from '../../common/request-context/request-context.types';

export type CustomerAuthResult = {
  accessToken: string;
  refreshToken: string;
  customer: {
    id: string;
    phoneNumber: string;
    firstName?: string | null;
    lastName?: string | null;
  };
};

export type CustomerProfileResult = {
  id: string;
  phoneNumber: string;
  firstName?: string | null;
  lastName?: string | null;
};

export type StaffAuthResult = {
  accessToken: string;
  refreshToken: string;
  staff: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    role: ActorRole;
    barberId?: string | null;
  };
};
