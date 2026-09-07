import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const AuthWrapper = styled.div`
  width: 100%;
  max-width: 420px;
  margin: 40px auto;
  padding: 0 20px;
  animation: ${fadeIn} 0.4s ease;
`;

export const AuthCard = styled.div`
  background: var(--bg-card);
  border: 1px solid var(--line-2);
  border-radius: 16px;
  padding: 28px 24px;
  backdrop-filter: blur(16px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
`;

export const AuthHeader = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const AuthTitle = styled.h2`
  font-family: var(--font-dot);
  font-size: 1.4rem;
  letter-spacing: 0.14em;
  color: var(--text-main);
  text-transform: uppercase;
  margin: 0;
`;

export const AuthSub = styled.span`
  font-family: var(--font-dot);
  font-size: 0.68rem;
  color: var(--text-faint);
  letter-spacing: 0.1em;
`;

export const TabToggleGroup = styled.div`
  display: flex;
  background: #09090b;
  border: 1px solid var(--line-1);
  border-radius: 10px;
  padding: 4px;
  gap: 4px;
`;

export const TabButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 10px 14px;
  border-radius: 7px;
  border: none;
  background: ${(props) => (props.$active ? '#1c1c1f' : 'transparent')};
  color: ${(props) => (props.$active ? 'var(--text-main)' : 'var(--text-muted)')};
  font-family: var(--font-dot);
  font-size: 0.85rem;
  font-weight: ${(props) => (props.$active ? '700' : '400')};
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: ${(props) => (props.$active ? '0 2px 8px rgba(0,0,0,0.5)' : 'none')};

  &:hover {
    color: var(--text-main);
  }
`;

export const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: ${fadeIn} 0.3s ease;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const Label = styled.label`
  font-family: var(--font-dot);
  font-size: 0.7rem;
  color: var(--text-muted);
  letter-spacing: 0.08em;
`;

export const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  background: #0d0d0e;
  border: 1px solid var(--line-1);
  border-radius: 8px;
  color: var(--text-main);
  font-family: var(--font-sans);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.08);
  }
`;

export const SubmitButton = styled.button`
  width: 100%;
  margin-top: 8px;
  padding: 12px 16px;
  background: #ffffff;
  color: #000000;
  border: none;
  border-radius: 8px;
  font-family: var(--font-dot);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #e4e4e7;
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ErrorAlert = styled.div`
  padding: 10px 14px;
  background: rgba(215, 25, 33, 0.15);
  border: 1px solid var(--red);
  border-radius: 8px;
  color: var(--red);
  font-size: 0.8rem;
  text-align: center;
`;
