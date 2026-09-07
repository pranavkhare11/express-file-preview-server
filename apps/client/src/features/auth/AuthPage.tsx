import React, { useState } from 'react';
import {
  AuthWrapper,
  AuthCard,
  AuthHeader,
  AuthTitle,
  AuthSub,
  TabToggleGroup,
  TabButton,
} from './AuthPage.styles';
import { SignInForm } from './components/SignInForm';
import { SignUpForm } from './components/SignUpForm';

export const AuthPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  return (
    <AuthWrapper>
      <AuthCard>
        <AuthHeader>
          <AuthTitle>AUTHENTICATION</AuthTitle>
          <AuthSub>ACCESS NOTHING // OS VFS SERVER</AuthSub>
        </AuthHeader>

        <TabToggleGroup>
          <TabButton
            $active={activeTab === 'signin'}
            onClick={() => setActiveTab('signin')}
          >
            SIGN IN
          </TabButton>
          <TabButton
            $active={activeTab === 'signup'}
            onClick={() => setActiveTab('signup')}
          >
            SIGN UP
          </TabButton>
        </TabToggleGroup>

        {activeTab === 'signin' ? <SignInForm /> : <SignUpForm />}
      </AuthCard>
    </AuthWrapper>
  );
};
