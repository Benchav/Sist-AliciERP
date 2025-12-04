import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { AppErrorBoundary } from './components/AppErrorBoundary';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
	<AppErrorBoundary>
		<App />
	</AppErrorBoundary>
);
