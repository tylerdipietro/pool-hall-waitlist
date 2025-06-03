// frontend/components/LoginScreen.js
import React from 'react';
import { View, Button, Linking } from 'react-native';

export default function LoginScreen() {
  const handleGoogleLogin = () => {
    const authUrl = 'http://localhost:3000/api/auth/google'; // Backend auth URL
    Linking.openURL(authUrl);
  };

  return (
    <View>
      <Button title="Login with Google" onPress={handleGoogleLogin} />
    </View>
  );
}
