import { useLocalSearchParams } from 'expo-router';
import { ProfileView } from '../../src/features/profile/ProfileView';
import { useUserId } from '../../src/lib/auth';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useUserId();
  return <ProfileView userId={id} own={id === me} showBack />;
}
