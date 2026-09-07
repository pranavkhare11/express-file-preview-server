import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const DashboardContainer = styled.div`
  width: 100%;
  max-width: var(--shell-max);
  margin: 20px auto;
  padding: 0 20px 40px;
  animation: ${fadeIn} 0.4s ease;
`;

export const WelcomeBanner = styled.div`
  background: var(--bg-card);
  border: 1px solid var(--line-2);
  border-radius: 14px;
  padding: 24px 28px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(12px);
`;

export const BannerTextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const BannerTitle = styled.h1`
  font-family: var(--font-dot);
  font-size: 1.5rem;
  letter-spacing: 0.12em;
  color: var(--text-main);
  margin: 0;
`;

export const BannerSub = styled.span`
  font-size: 0.85rem;
  color: var(--text-muted);
`;

export const ModuleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
`;

export const ModuleCard = styled.div`
  background: var(--bg-card);
  border: 1px solid var(--line-2);
  border-radius: 14px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  transition: all 0.25s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 255, 255, 0.4);
    box-shadow: 0 12px 35px rgba(255, 255, 255, 0.08);
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

export const CardIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--line-2);
  color: var(--text-main);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
`;

export const CardTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export const CardTitle = styled.h3`
  font-family: var(--font-dot);
  font-size: 1.1rem;
  letter-spacing: 0.1em;
  color: var(--text-main);
  margin: 0;
`;

export const CardSub = styled.span`
  font-size: 0.75rem;
  color: var(--text-muted);
`;

export const CardDescription = styled.p`
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.5;
`;

export const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--line-1);
  padding-top: 14px;
`;

export const ActionText = styled.span`
  font-family: var(--font-dot);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-main);
`;
