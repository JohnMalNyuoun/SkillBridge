import { useContext } from 'react';
import { PwaInstallContext } from '../context/PwaInstallContextValue';

const usePwaInstall = () => {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error('usePwaInstall must be used within a PwaInstallProvider');
  }
  return context;
};

export default usePwaInstall;
