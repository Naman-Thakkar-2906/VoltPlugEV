import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  subMessage?: string;
}

const EmptyState = ({ message, subMessage }: EmptyStateProps) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '60px 20px', 
      textAlign: 'center',
      color: '#64748b'
    }}>
      <div style={{ 
        background: '#1e293b', 
        width: '64px', 
        height: '64px', 
        borderRadius: '50%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: '20px'
      }}>
        <Inbox size={32} />
      </div>
      <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>{message}</h3>
      {subMessage && <p style={{ fontSize: '14px', maxWidth: '300px' }}>{subMessage}</p>}
    </div>
  );
};

export default EmptyState;
