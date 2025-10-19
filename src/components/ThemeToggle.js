import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getColors } from '../constants/colors';
import { scale, verticalScale } from '../utils/responsive';

const ThemeToggle = ({ style }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const colors = getColors(isDarkMode);

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }, style]}
      onPress={toggleTheme}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isDarkMode ? 'sunny' : 'moon'}
        size={scale(20)}
        color={colors.text.primary}
      />
      <Text style={[styles.text, { color: colors.text.primary }]}>
        {isDarkMode ? 'Açık Tema' : 'Koyu Tema'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  text: {
    marginLeft: scale(8),
    fontSize: scale(14),
    fontWeight: '500',
  },
});

export default ThemeToggle;
