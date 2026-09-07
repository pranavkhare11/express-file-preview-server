import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const ExplorerContainer = styled.div`
  width: 100%;
  max-width: var(--shell-max);
  margin: 10px auto;
  padding: 0 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: ${fadeIn} 0.3s ease;
`;

export const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: var(--bg-card);
  border: 1px solid var(--line-2);
  border-radius: 12px;
  padding: 12px 18px;
  backdrop-filter: blur(12px);

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const BreadcrumbBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-dot);
  font-size: 0.9rem;
  color: var(--text-main);
  overflow-x: auto;
  white-space: nowrap;
`;

export const CrumbItem = styled.span<{ $active?: boolean }>`
  color: ${(props) => (props.$active ? 'var(--text-main)' : 'var(--text-muted)')};
  font-weight: ${(props) => (props.$active ? '700' : '400')};
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover {
    color: var(--text-main);
  }
`;

export const CrumbSeparator = styled.span`
  color: var(--text-faint);
`;

export const ActionToolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const Button = styled.button<{ $primary?: boolean }>`
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid ${(props) => (props.$primary ? '#ffffff' : 'var(--line-2)')};
  background: ${(props) => (props.$primary ? '#ffffff' : 'rgba(255, 255, 255, 0.05)')};
  color: ${(props) => (props.$primary ? '#000000' : 'var(--text-main)')};
  font-family: var(--font-dot);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => (props.$primary ? '#e4e4e7' : 'rgba(255, 255, 255, 0.12)')};
    box-shadow: ${(props) => (props.$primary ? '0 0 12px rgba(255, 255, 255, 0.3)' : 'none')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const MainArea = styled.div<{ $isDraggingOver?: boolean }>`
  min-height: 500px;
  background: var(--bg-card);
  border: 1px solid ${(props) => (props.$isDraggingOver ? 'var(--text-main)' : 'var(--line-2)')};
  border-radius: 14px;
  padding: 20px;
  backdrop-filter: blur(12px);
  position: relative;
  transition: border-color 0.2s ease;
`;

export const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 16px;
`;

export const ItemCard = styled.div<{ $selected?: boolean; $isFolder?: boolean }>`
  background: ${(props) => (props.$selected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)')};
  border: 1px solid ${(props) => (props.$selected ? 'var(--text-main)' : 'var(--line-1)')};
  border-radius: 10px;
  padding: 14px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: var(--line-2);
    transform: translateY(-2px);
  }
`;

export const ItemIcon = styled.div`
  font-size: 2.2rem;
`;

export const ItemName = styled.span`
  font-size: 0.82rem;
  color: var(--text-main);
  word-break: break-word;
  line-clamp: 2;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const ItemMeta = styled.span`
  font-size: 0.7rem;
  color: var(--text-faint);
  font-family: var(--font-dot);
`;

export const ContextMenuOverlay = styled.div<{ $x: number; $y: number }>`
  position: fixed;
  top: ${(props) => props.$y}px;
  left: ${(props) => props.$x}px;
  width: 180px;
  background: #121214;
  border: 1px solid var(--line-2);
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 5000;
`;

export const ContextMenuItem = styled.button<{ $danger?: boolean }>`
  width: 100%;
  padding: 8px 10px;
  border-radius: 4px;
  background: transparent;
  border: none;
  color: ${(props) => (props.$danger ? 'var(--red)' : 'var(--text-main)')};
  font-family: var(--font-sans);
  font-size: 0.82rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${(props) => (props.$danger ? 'rgba(215, 25, 33, 0.15)' : 'rgba(255, 255, 255, 0.08)')};
  }
`;
