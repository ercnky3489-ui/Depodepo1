import { useLocalSearchParams } from 'expo-router';
import { ContentScreen } from '../../src/features/content/ContentScreen';

export default function QuoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ContentScreen kind="quote" id={id} />;
}
