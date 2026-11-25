import { Image } from 'expo-image';
import { ImageStyle, StyleProp, StyleSheet } from 'react-native';

type BrandLogoProps = {
  compact?: boolean;
  style?: StyleProp<ImageStyle>;
};

const logoSource = require('../../assets/brand/estero10-logo.png');

export function BrandLogo({ compact = false, style }: BrandLogoProps) {
  return (
    <Image
      accessibilityLabel="Estero 10, Del mar lo mejor"
      contentFit="contain"
      source={logoSource}
      style={[compact ? styles.compact : styles.default, style]}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    width: 184,
    height: 112,
  },
  compact: {
    width: 112,
    height: 68,
  },
});
