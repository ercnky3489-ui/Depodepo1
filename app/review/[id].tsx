import { useLocalSearchParams } from 'expo-router';
import { ContentScreen } from '../../src/features/content/ContentScreen';

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ContentScreen kind="review" id={id} />;
}
