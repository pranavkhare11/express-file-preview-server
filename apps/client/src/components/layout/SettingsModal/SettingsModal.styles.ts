import styled from 'styled-components';

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

export const ModalContainer = styled.div`
  width: 100%;
  max-width: 440px;
  background: #111113;
  border: 1px solid var(--line-2);
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--line-1);
  padding-bottom: 14px;
`;

export const ModalTitle = styled.h2`
  font-family: var(--font-dot);
  font-size: 1.1rem;
  letter-spacing: 0.12em;
  color: var(--text-main);
  text-transform: uppercase;
  margin: 0;
`;

export const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
  transition: color 0.15s ease;

  &:hover {
    color: var(--text-main);
  }
`;

export const UserDetailRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const DetailLabel = styled.span`
  font-family: var(--font-dot);
  font-size: 0.7rem;
  color: var(--text-faint);
  letter-spacing: 0.08em;
`;

export const DetailValue = styled.span`
  font-size: 0.95rem;
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--line-1);
  padding: 8px 12px;
  border-radius: 6px;
`;

export const DangerZone = styled.div`
  margin-top: 10px;
  padding-top: 16px;
  border-top: 1px solid rgba(215, 25, 33, 0.3);
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const DangerTitle = styled.div`
  font-family: var(--font-dot);
  font-size: 0.75rem;
  color: var(--red);
  letter-spacing: 0.1em;
  font-weight: 700;
`;

export const DeleteButton = styled.button`
  width: 100%;
  padding: 10px 14px;
  background: rgba(215, 25, 33, 0.15);
  border: 1px solid var(--red);
  color: var(--red);
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--red);
    color: #ffffff;
    box-shadow: 0 0 14px var(--red-glow);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
