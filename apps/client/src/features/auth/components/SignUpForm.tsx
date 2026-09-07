import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { FormContainer, FormGroup, Label, Input, SubmitButton, ErrorAlert } from '../AuthPage.styles';

export const SignUpForm: React.FC = () => {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signup(name, email, password);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <FormGroup>
        <Label>FULL NAME</Label>
        <Input
          type="text"
          required
          placeholder="Pranav Khare"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormGroup>

      <FormGroup>
        <Label>EMAIL ADDRESS</Label>
        <Input
          type="email"
          required
          placeholder="pranav@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormGroup>

      <FormGroup>
        <Label>PASSWORD (MIN 6 CHARS)</Label>
        <Input
          type="password"
          required
          minLength={6}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormGroup>

      <SubmitButton type="submit" disabled={loading}>
        {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT ->'}
      </SubmitButton>
    </FormContainer>
  );
};
