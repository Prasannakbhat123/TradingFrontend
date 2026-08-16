import { Toaster } from 'sonner';
import { useTheme } from '../lib/theme';

export function AppToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'lattice-toast',
          title: 'lattice-toast-title',
          description: 'lattice-toast-desc',
        },
      }}
    />
  );
}
