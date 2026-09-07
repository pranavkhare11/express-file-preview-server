import styled from 'styled-components';

export const AdminContainer = styled.div`
  width: 100%;
  max-width: var(--shell-max);
  margin: 20px auto;
  padding: 0 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const AdminHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid rgba(215, 25, 33, 0.4);
  border-radius: 14px;
  padding: 20px 24px;
  backdrop-filter: blur(12px);
`;

export const AdminTitle = styled.h2`
  font-family: var(--font-dot);
  font-size: 1.3rem;
  letter-spacing: 0.14em;
  color: var(--red);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const BackButton = styled.button`
  background: transparent;
  border: 1px solid var(--line-2);
  color: var(--text-main);
  padding: 8px 14px;
  border-radius: 6px;
  font-family: var(--font-dot);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--text-main);
    background: rgba(255, 255, 255, 0.05);
  }
`;

export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
`;

export const StatBox = styled.div`
  background: var(--bg-card);
  border: 1px solid var(--line-2);
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const StatLabel = styled.span`
  font-family: var(--font-dot);
  font-size: 0.7rem;
  color: var(--text-faint);
  letter-spacing: 0.08em;
`;

export const StatValue = styled.span`
  font-family: var(--font-dot);
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-main);
`;

export const SectionCard = styled.div`
  background: var(--bg-card);
  border: 1px solid var(--line-2);
  border-radius: 14px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const SectionTitle = styled.h3`
  font-family: var(--font-dot);
  font-size: 1rem;
  letter-spacing: 0.1em;
  color: var(--text-main);
  margin: 0;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`;

export const Th = styled.th`
  font-family: var(--font-dot);
  font-size: 0.7rem;
  color: var(--text-faint);
  letter-spacing: 0.08em;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line-2);
`;

export const Td = styled.td`
  font-size: 0.88rem;
  color: var(--text-main);
  padding: 12px 14px;
  border-bottom: 1px solid var(--line-1);
`;

export const ActionButton = styled.button<{ $danger?: boolean }>`
  padding: 6px 12px;
  background: ${(props) => (props.$danger ? 'rgba(215, 25, 33, 0.15)' : 'rgba(255, 255, 255, 0.08)')};
  border: 1px solid ${(props) => (props.$danger ? 'var(--red)' : 'var(--line-2)')};
  color: ${(props) => (props.$danger ? 'var(--red)' : 'var(--text-main)')};
  font-family: var(--font-dot);
  font-size: 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => (props.$danger ? 'var(--red)' : 'rgba(255, 255, 255, 0.18)')};
    color: #ffffff;
  }
`;
