interface LoaderProps {
  fullPage?: boolean;
  size?: number;
}

const Loader = ({ fullPage = false, size = 40 }: LoaderProps) => {
  const loader = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div 
        style={{ 
          width: `${size}px`, 
          height: `${size}px`, 
          border: '4px solid rgba(56, 189, 248, 0.1)', 
          borderTop: '4px solid #38bdf8', 
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} 
      />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );

  if (fullPage) {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        background: '#020617', 
        zIndex: 1000, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        {loader}
      </div>
    );
  }

  return loader;
};

export default Loader;
