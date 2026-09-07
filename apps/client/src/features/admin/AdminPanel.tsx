import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../api/apiClient';
import {
  AdminContainer,
  AdminHeader,
  AdminTitle,
  BackButton,
  StatGrid,
  StatBox,
  StatLabel,
  StatValue,
  SectionCard,
  SectionTitle,
  Table,
  Th,
  Td,
  ActionButton,
} from './AdminPanel.styles';

interface AdminPanelProps {
  onBack: () => void;
}

interface StatsData {
  totalUsers: number;
  activeSessions: number;
  revokedTokensCount: number;
}

interface SessionData {
  jti: string;
  userId: string;
  email: string;
  name: string;
  ip: string;
  userAgent: string;
  signinAt: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const statsRes = await apiFetch<StatsData>('/admin/stats');
      const sessionsRes = await apiFetch<{ sessions: SessionData[] }>('/admin/sessions');
      setStats(statsRes);
      setSessions(sessionsRes.sessions || []);
    } catch (err: any) {
      alert(err.message || 'Failed to load admin telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRevokeSession = async (jti: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) return;
    try {
      await apiFetch('/admin/sessions/revoke', {
        method: 'POST',
        body: JSON.stringify({ targetJti: jti }),
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke session');
    }
  };

  const handlePurgeAll = async () => {
    if (!confirm('⚠️ WARNING: Revoke ALL active user sessions except your current session?')) return;
    try {
      await apiFetch('/admin/sessions/purge-system', { method: 'POST' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to purge sessions');
    }
  };

  return (
    <AdminContainer>
      <AdminHeader>
        <AdminTitle>🛡️ ADMIN CONTROL PANEL // PRIVACY-FIRST TELEMETRY</AdminTitle>
        <BackButton onClick={onBack}>&lt;- DASHBOARD</BackButton>
      </AdminHeader>

      <StatGrid>
        <StatBox>
          <StatLabel>TOTAL REGISTERED USERS</StatLabel>
          <StatValue>{loading ? '...' : stats?.totalUsers || 0}</StatValue>
        </StatBox>

        <StatBox>
          <StatLabel>ACTIVE SESSIONS</StatLabel>
          <StatValue style={{ color: 'var(--text-main)' }}>
            {loading ? '...' : stats?.activeSessions || 0}
          </StatValue>
        </StatBox>

        <StatBox>
          <StatLabel>REVOKED TOKENS (DENYLIST)</StatLabel>
          <StatValue style={{ color: 'var(--red)' }}>
            {loading ? '...' : stats?.revokedTokensCount || 0}
          </StatValue>
        </StatBox>
      </StatGrid>

      <SectionCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle>ACTIVE USER SESSIONS (SESSION MANAGER)</SectionTitle>
          <ActionButton $danger onClick={handlePurgeAll}>
            🔥 PURGE ALL OTHER SESSIONS
          </ActionButton>
        </div>

        <Table>
          <thead>
            <tr>
              <Th>USER NAME</Th>
              <Th>EMAIL</Th>
              <Th>IP ADDRESS</Th>
              <Th>SIGNIN TIME</Th>
              <Th>ACTION</Th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <Td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-faint)' }}>
                  {loading ? 'Loading sessions...' : 'No active sessions found.'}
                </Td>
              </tr>
            ) : (
              sessions.map((sess) => (
                <tr key={sess.jti}>
                  <Td>{sess.name}</Td>
                  <Td>{sess.email}</Td>
                  <Td>{sess.ip}</Td>
                  <Td>{new Date(sess.signinAt).toLocaleString()}</Td>
                  <Td>
                    <ActionButton $danger onClick={() => handleRevokeSession(sess.jti)}>
                      REVOKE
                    </ActionButton>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </SectionCard>
    </AdminContainer>
  );
};
