import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  NavbarContainer,
  NavbarContent,
  BrandGroup,
  BrandLens,
  LensInner,
  BrandTitleGroup,
  BrandTitle,
  BrandSubtitleSpec,
  NavbarRight,
  HardwareDecor,
  DecorLed,
  WaveformDial,
  WaveformLine,
  AvatarWrapper,
  AvatarCircle,
  DropdownMenu,
  UserMeta,
  UserName,
  UserEmail,
  MenuItem,
} from './Navbar.styles';

interface NavbarProps {
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'N';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <NavbarContainer>
      <NavbarContent>
        <BrandGroup onClick={() => (window.location.href = '/')}>
          <BrandLens>
            <LensInner />
          </BrandLens>
          <BrandTitleGroup>
            <BrandTitle>NOTHING // VFS</BrandTitle>
            <BrandSubtitleSpec>SYSTEM v2.4 // HEADLESS STORAGE</BrandSubtitleSpec>
          </BrandTitleGroup>
        </BrandGroup>

        <NavbarRight>
          <HardwareDecor>
            <WaveformDial>
              {[1, 2, 3, 4, 5].map((i) => (
                <WaveformLine key={i} $index={i} />
              ))}
            </WaveformDial>
            <DecorLed />
          </HardwareDecor>

          {user && (
            <AvatarWrapper ref={dropdownRef}>
              <AvatarCircle onClick={() => setDropdownOpen(!dropdownOpen)}>
                {getInitials(user.name)}
              </AvatarCircle>

              {dropdownOpen && (
                <DropdownMenu>
                  <UserMeta>
                    <UserName>{user.name}</UserName>
                    <UserEmail>{user.email}</UserEmail>
                  </UserMeta>

                  <MenuItem
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenSettings();
                    }}
                  >
                    ⚙️ Settings
                  </MenuItem>

                  <MenuItem
                    $danger
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                  >
                    🚪 Logout
                  </MenuItem>
                </DropdownMenu>
              )}
            </AvatarWrapper>
          )}
        </NavbarRight>
      </NavbarContent>
    </NavbarContainer>
  );
};
