import { ProfileView } from '../../src/features/profile/ProfileView';
import { useUserId } from '../../src/lib/auth';

export default function MyProfile() {
  const uid = useUserId();
  return uid ? <ProfileView userId={uid} own /> : null;
}
