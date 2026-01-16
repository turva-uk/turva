export default interface Group {
  id: string;
  name: string;
  description: string | null;
  isAdmin: boolean;
  isOwner: boolean;
  members: number | GroupUser[];
}

export interface GroupUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isAdmin: boolean;
  isOwner: boolean;
}
