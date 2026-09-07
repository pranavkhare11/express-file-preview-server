import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  ModalOverlay,
  ModalContainer,
  ModalHeader,
  ModalTitle,
  CloseButton,
  UserDetailRow,
  DetailLabel,
  DetailValue,
  DangerZone,
  DangerTitle,
  DeleteButton,
} from './SettingsModal.styles';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, deleteAccount } = useAuth();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !user) return null;

  const handleDelete = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    try {
      setIsDeleting(true);
      await deleteAccount();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>⚙️ USER SETTINGS</ModalTitle>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>

        <UserDetailRow>
          <DetailLabel>FULL NAME</DetailLabel>
          <DetailValue>{user.name}</DetailValue>
        </UserDetailRow>

        <UserDetailRow>
          <DetailLabel>EMAIL ADDRESS</DetailLabel>
          <DetailValue>{user.email}</DetailValue>
        </UserDetailRow>

        <DangerZone>
          <DangerTitle>⚠️ DANGER ZONE</DangerTitle>
          <DeleteButton onClick={handleDelete} disabled={isDeleting}>
            {isDeleting
              ? 'DELETING ACCOUNT...'
              : isConfirmingDelete
              ? '⚠️ CLICK AGAIN TO PERMANENTLY DELETE ACCOUNT'
              : '🗑️ DELETE ACCOUNT'}
          </DeleteButton>
        </DangerZone>
      </ModalContainer>
    </ModalOverlay>
  );
};
