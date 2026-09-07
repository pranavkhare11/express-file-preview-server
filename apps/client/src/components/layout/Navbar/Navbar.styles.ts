import styled, { keyframes } from 'styled-components';

const pulseWave = keyframes`
  0% { transform: scaleY(0.3); opacity: 0.6; }
  100% { transform: scaleY(1.1); opacity: 1; }
`;

const blinkLed = keyframes`
  0%, 100% { opacity: 0.4; box-shadow: 0 0 2px var(--red); }
  50% { opacity: 1; box-shadow: 0 0 6px var(--red); }
`;

export const NavbarContainer = styled.nav`
  width: 100%;
  max-width: var(--shell-max);
  margin: 0 auto;
  padding: 16px 20px;
  position: relative;
  z-index: 100;
`;

export const NavbarContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 16px;
  background: var(--bg-card);
  border: 1px solid var(--line-2);
  border-radius: 12px;
  padding: 12px 20px;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
`;

export const BrandGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
`;

export const BrandLens = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #555555, #111111 80%);
  border: 2px solid var(--line-2);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
`;

export const LensInner = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #3a3a3a, #0c0c0c 90%);
  position: relative;

  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.8);
  }
`;

export const BrandTitleGroup = styled.div`
  display: flex;
  flex-direction: column;
  line-height: 1.1;
`;

export const BrandTitle = styled.h1`
  margin: 0;
  font-family: var(--font-dot);
  font-size: 1.25rem;
  letter-spacing: 0.16em;
  color: var(--text-main);
  text-transform: uppercase;
`;

export const BrandSubtitleSpec = styled.span`
  font-family: var(--font-dot);
  font-size: 0.62rem;
  color: var(--text-faint);
  letter-spacing: 0.12em;
  margin-top: 2px;
`;

export const NavbarRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

export const HardwareDecor = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 640px) {
    display: none;
  }
`;

export const DecorLed = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--red);
  box-shadow: 0 0 6px var(--red);
  animation: ${blinkLed} 2s infinite ease-in-out;
`;

export const WaveformDial = styled.div`
  width: 32px;
  height: 28px;
  border-radius: 6px;
  background: #09090b;
  border: 1px solid var(--line-1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 4px;
`;

export const WaveformLine = styled.div<{ $index: number }>`
  width: 2px;
  background: #ffffff;
  border-radius: 1px;
  height: ${(props) => [8, 14, 20, 12, 6][props.$index - 1] || 10}px;
  animation: ${pulseWave} ${(props) => [1.2, 0.8, 1, 0.9, 1.1][props.$index - 1] || 1}s ease-in-out infinite alternate;
`;

export const AvatarWrapper = styled.div`
  position: relative;
`;

export const AvatarCircle = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #18181b;
  border: 1px solid var(--line-2);
  color: var(--text-main);
  font-family: var(--font-dot);
  font-weight: 700;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--text-main);
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
  }
`;

export const DropdownMenu = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 220px;
  background: #121212;
  border: 1px solid var(--line-2);
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  gap: 8px;
  backdrop-filter: blur(16px);
  z-index: 200;
`;

export const UserMeta = styled.div`
  padding-bottom: 8px;
  border-bottom: 1px solid var(--line-1);
`;

export const UserName = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-main);
`;

export const UserEmail = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const MenuItem = styled.button<{ $danger?: boolean }>`
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: ${(props) => (props.$danger ? 'var(--red)' : 'var(--text-main)')};
  font-family: var(--font-sans);
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.15s ease;

  &:hover {
    background: ${(props) => (props.$danger ? 'rgba(215, 25, 33, 0.15)' : 'rgba(255, 255, 255, 0.08)')};
  }
`;
