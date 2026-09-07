import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { FormContainer, FormGroup, Label, Input, SubmitButton, ErrorAlert } from '../AuthPage.styles';

export const SignInForm: React.FC = () => {
  const { signin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signin(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <FormGroup>
        <Label>EMAIL ADDRESS</Label>
        <Input
          type="email"
          required
          placeholder="admin@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormGroup>

      <FormGroup>
        <Label>PASSWORD</Label>
        <Input
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormGroup>

      <SubmitButton type="submit" disabled={loading}>
        {loading ? 'AUTHENTICATING...' : 'SIGN IN ->'}
      </SubmitButton>
    </FormContainer>
  );
};
