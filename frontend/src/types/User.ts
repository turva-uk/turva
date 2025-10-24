export default interface User {
  id: string;
  firstName: string;
  lastName: string | null;
  emailAddress: string;
  isVerified: boolean;
  isCSO: boolean;
}
