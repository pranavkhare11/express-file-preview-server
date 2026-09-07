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
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenExplorer,
}) => {
  const { user } = useAuth();

  return (
    <DashboardContainer>
      <WelcomeBanner>
        <BannerTextGroup>
          <BannerTitle>WELCOME, {user?.name.toUpperCase()}</BannerTitle>
          <BannerSub>NOTHING // OS CLOUD VFS SESSION ACTIVE</BannerSub>
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
            Virtual File System with recursive folder management, multi-file uploads, Drag & Drop, and byte-range media streaming.
          </CardDescription>
          <CardFooter>
            <ActionText>LAUNCH EXPLORER</ActionText>
            <span>-&gt;</span>
          </CardFooter>
        </ModuleCard>
      </ModuleGrid>
    </DashboardContainer>
  );
};
