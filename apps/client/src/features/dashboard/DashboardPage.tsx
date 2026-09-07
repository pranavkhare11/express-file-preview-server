import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  DashboardContainer,
  WelcomeBanner,
  BannerTextGroup,
  BannerTitle,
  BannerSub,
  ModuleGrid,
  ModuleCard,
  CardHeader,
  CardIcon,
  CardTitleGroup,
  CardTitle,
  CardSub,
  CardDescription,
  CardFooter,
  ActionText,
} from './DashboardPage.styles';

interface DashboardPageProps {
  onOpenExplorer: () => void;
  onOpenAdmin: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenExplorer,
  onOpenAdmin,
}) => {
  const { user } = useAuth();

  return (
    <DashboardContainer>
      <WelcomeBanner>
        <BannerTextGroup>
          <BannerTitle>WELCOME, {user?.name.toUpperCase()}</BannerTitle>
          <BannerSub>SYSTEM SESSION ACTIVE // ACTIVE ROLE: {user?.role.toUpperCase()}</BannerSub>
        </BannerTextGroup>
      </WelcomeBanner>

      <ModuleGrid>
        {/* Cloud Storage Card */}
        <ModuleCard onClick={onOpenExplorer}>
          <CardHeader>
            <CardIcon>☁️</CardIcon>
            <CardTitleGroup>
              <CardTitle>CLOUD STORAGE</CardTitle>
              <CardSub>VFS FILE EXPLORER</CardSub>
            </CardTitleGroup>
          </CardHeader>
          <CardDescription>
            Virtual File System with recursive folder management, multi-file uploads, Drag & Drop, and byte-range video streaming.
          </CardDescription>
          <CardFooter>
            <ActionText>LAUNCH EXPLORER</ActionText>
            <span>-&gt;</span>
          </CardFooter>
        </ModuleCard>

        {/* Conditional Admin Control Panel Card */}
        {user?.role === 'admin' && (
          <ModuleCard $admin onClick={onOpenAdmin}>
            <CardHeader>
              <CardIcon $admin>🛡️</CardIcon>
              <CardTitleGroup>
                <CardTitle style={{ color: 'var(--red)' }}>ADMIN CONTROL</CardTitle>
                <CardSub>PRIVACY-FIRST TELEMETRY</CardSub>
              </CardTitleGroup>
            </CardHeader>
            <CardDescription>
              Monitor overall server storage consumption, manage user quotas, view mime-type metrics, and trigger automated stale upload sweeps.
            </CardDescription>
            <CardFooter>
              <ActionText $admin>OPEN ADMIN PANEL</ActionText>
              <span style={{ color: 'var(--red)' }}>-&gt;</span>
            </CardFooter>
          </ModuleCard>
        )}
      </ModuleGrid>
    </DashboardContainer>
  );
};
